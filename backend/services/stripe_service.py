"""Stripe payment service for Trial Navigator.

Handles:
- Premium subscription management
- Deep Search one-time payments
- Webhook processing
"""

import stripe
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum

from config import settings


class SubscriptionTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    PREMIUM_PLUS = "premium_plus"


class PaymentService:
    """Stripe payment service."""

    # Price IDs - Set these in Stripe Dashboard
    PRICES = {
        # Monthly subscriptions
        "premium_monthly": "price_premium_monthly",      # $5/month
        "premium_plus_monthly": "price_premium_plus_monthly",  # $10/month
        # Yearly subscriptions (20% discount)
        "premium_yearly": "price_premium_yearly",        # $48/year
        "premium_plus_yearly": "price_premium_plus_yearly",    # $96/year
        # One-time Deep Search
        "deep_search_basic": "price_deep_search_basic",      # $50
        "deep_search_comprehensive": "price_deep_search_comprehensive",  # $100
        "deep_search_premium": "price_deep_search_premium",    # $150
    }

    # Feature mapping
    TIER_FEATURES = {
        SubscriptionTier.FREE: {
            "daily_searches": 5,
            "translation_languages": 3,
            "email_digest": "weekly",
            "saved_trials": 10,
            "deep_search": False,
            "priority_support": False,
            "api_access": False,
        },
        SubscriptionTier.PREMIUM: {
            "daily_searches": 50,
            "translation_languages": 20,
            "email_digest": "daily",
            "saved_trials": 100,
            "deep_search": True,
            "deep_search_discount": 0.2,  # 20% discount
            "priority_support": False,
            "api_access": False,
        },
        SubscriptionTier.PREMIUM_PLUS: {
            "daily_searches": -1,  # unlimited
            "translation_languages": -1,  # all languages
            "email_digest": "realtime",
            "saved_trials": -1,  # unlimited
            "deep_search": True,
            "deep_search_discount": 0.5,  # 50% discount
            "priority_support": True,
            "api_access": True,
        },
    }

    def __init__(self):
        if settings.stripe_secret_key:
            stripe.api_key = settings.stripe_secret_key

    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> str:
        """Create a Stripe customer."""
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata=metadata or {}
        )
        return customer.id

    async def get_or_create_customer(
        self,
        user_id: str,
        email: str,
        existing_customer_id: Optional[str] = None
    ) -> str:
        """Get existing or create new Stripe customer."""
        if existing_customer_id:
            try:
                customer = stripe.Customer.retrieve(existing_customer_id)
                if not customer.deleted:
                    return customer.id
            except stripe.error.InvalidRequestError:
                pass

        # Create new customer
        return await self.create_customer(
            email=email,
            metadata={"user_id": user_id}
        )

    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        mode: str = "subscription",  # or "payment" for one-time
        metadata: Optional[Dict] = None
    ) -> Dict[str, str]:
        """Create a Stripe Checkout session."""
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode=mode,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
            allow_promotion_codes=True,
        )
        return {
            "session_id": session.id,
            "url": session.url
        }

    async def create_subscription_checkout(
        self,
        customer_id: str,
        tier: str,
        billing_period: str = "monthly",
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, str]:
        """Create checkout session for subscription."""
        price_key = f"{tier}_{billing_period}"
        price_id = self.PRICES.get(price_key)

        if not price_id:
            raise ValueError(f"Invalid subscription: {tier} {billing_period}")

        return await self.create_checkout_session(
            customer_id=customer_id,
            price_id=price_id,
            success_url=success_url or f"{settings.app_url}/subscription/success",
            cancel_url=cancel_url or f"{settings.app_url}/pricing",
            mode="subscription",
            metadata={"tier": tier, "billing_period": billing_period}
        )

    async def create_deep_search_checkout(
        self,
        customer_id: str,
        search_type: str,  # basic, comprehensive, premium
        search_request_id: int,
        discount_percent: float = 0,
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, str]:
        """Create checkout session for Deep Search."""
        price_key = f"deep_search_{search_type}"
        price_id = self.PRICES.get(price_key)

        if not price_id:
            raise ValueError(f"Invalid Deep Search type: {search_type}")

        # Apply discount for premium subscribers
        session_params = {
            "customer_id": customer_id,
            "price_id": price_id,
            "success_url": success_url or f"{settings.app_url}/deep-search/{search_request_id}/success",
            "cancel_url": cancel_url or f"{settings.app_url}/deep-search/{search_request_id}",
            "mode": "payment",
            "metadata": {
                "search_type": search_type,
                "search_request_id": str(search_request_id)
            }
        }

        # Add coupon if discount applies
        if discount_percent > 0:
            # Would need to create coupons in Stripe Dashboard
            pass

        return await self.create_checkout_session(**session_params)

    async def get_subscription(self, subscription_id: str) -> Optional[Dict]:
        """Get subscription details."""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "tier": subscription.metadata.get("tier", "premium"),
            }
        except stripe.error.InvalidRequestError:
            return None

    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> bool:
        """Cancel a subscription."""
        try:
            if at_period_end:
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                stripe.Subscription.delete(subscription_id)
            return True
        except stripe.error.InvalidRequestError:
            return False

    async def resume_subscription(self, subscription_id: str) -> bool:
        """Resume a cancelled subscription."""
        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            return True
        except stripe.error.InvalidRequestError:
            return False

    async def create_billing_portal_session(
        self,
        customer_id: str,
        return_url: str = None
    ) -> str:
        """Create Stripe Billing Portal session for customer."""
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url or f"{settings.app_url}/settings"
        )
        return session.url

    def construct_webhook_event(
        self,
        payload: bytes,
        signature: str
    ) -> stripe.Event:
        """Construct and verify webhook event."""
        return stripe.Webhook.construct_event(
            payload,
            signature,
            settings.stripe_webhook_secret
        )

    async def handle_webhook_event(
        self,
        event: stripe.Event,
        db
    ) -> Dict[str, Any]:
        """Process Stripe webhook event."""
        event_type = event.type
        data = event.data.object

        handlers = {
            "checkout.session.completed": self._handle_checkout_completed,
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "invoice.paid": self._handle_invoice_paid,
            "invoice.payment_failed": self._handle_payment_failed,
        }

        handler = handlers.get(event_type)
        if handler:
            return await handler(data, db)

        return {"status": "ignored", "event_type": event_type}

    async def _handle_checkout_completed(self, session, db) -> Dict:
        """Handle successful checkout."""
        customer_id = session.customer
        metadata = session.metadata

        # Find user by customer_id
        async with db.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT id FROM users WHERE stripe_customer_id = $1",
                customer_id
            )

            if not user:
                return {"status": "error", "message": "User not found"}

            # Handle subscription
            if session.mode == "subscription":
                tier = metadata.get("tier", "premium")
                await conn.execute("""
                    UPDATE users SET
                        subscription_tier = $1,
                        subscription_expires_at = NULL
                    WHERE id = $2
                """, tier, user['id'])

                return {"status": "success", "type": "subscription", "tier": tier}

            # Handle Deep Search payment
            elif session.mode == "payment":
                search_request_id = metadata.get("search_request_id")
                if search_request_id:
                    await conn.execute("""
                        UPDATE deep_search_requests SET
                            payment_status = 'paid',
                            stripe_payment_id = $1,
                            status = 'pending_assignment'
                        WHERE id = $2
                    """, session.payment_intent, int(search_request_id))

                    return {"status": "success", "type": "deep_search", "id": search_request_id}

        return {"status": "success", "type": "unknown"}

    async def _handle_subscription_created(self, subscription, db) -> Dict:
        """Handle new subscription."""
        customer_id = subscription.customer
        tier = subscription.metadata.get("tier", "premium")

        async with db.acquire() as conn:
            await conn.execute("""
                UPDATE users SET
                    subscription_tier = $1,
                    subscription_expires_at = to_timestamp($2)
                WHERE stripe_customer_id = $3
            """, tier, subscription.current_period_end, customer_id)

        return {"status": "success", "action": "subscription_created"}

    async def _handle_subscription_updated(self, subscription, db) -> Dict:
        """Handle subscription update."""
        customer_id = subscription.customer
        tier = subscription.metadata.get("tier", "premium")
        status = subscription.status

        # Map Stripe status to our tier
        if status in ["canceled", "unpaid", "incomplete_expired"]:
            tier = "free"

        async with db.acquire() as conn:
            await conn.execute("""
                UPDATE users SET
                    subscription_tier = $1,
                    subscription_expires_at = to_timestamp($2)
                WHERE stripe_customer_id = $3
            """, tier, subscription.current_period_end, customer_id)

        return {"status": "success", "action": "subscription_updated", "tier": tier}

    async def _handle_subscription_deleted(self, subscription, db) -> Dict:
        """Handle subscription cancellation."""
        customer_id = subscription.customer

        async with db.acquire() as conn:
            await conn.execute("""
                UPDATE users SET
                    subscription_tier = 'free',
                    subscription_expires_at = NULL
                WHERE stripe_customer_id = $1
            """, customer_id)

        return {"status": "success", "action": "subscription_deleted"}

    async def _handle_invoice_paid(self, invoice, db) -> Dict:
        """Handle successful invoice payment."""
        customer_id = invoice.customer

        async with db.acquire() as conn:
            # Log payment
            await conn.execute("""
                INSERT INTO payment_history (
                    stripe_customer_id, stripe_invoice_id, amount_paid,
                    currency, status, paid_at
                ) VALUES ($1, $2, $3, $4, 'paid', NOW())
                ON CONFLICT (stripe_invoice_id) DO NOTHING
            """,
                customer_id,
                invoice.id,
                invoice.amount_paid / 100,  # Convert from cents
                invoice.currency
            )

        return {"status": "success", "action": "invoice_paid"}

    async def _handle_payment_failed(self, invoice, db) -> Dict:
        """Handle failed payment."""
        customer_id = invoice.customer

        async with db.acquire() as conn:
            # Get user email for notification
            user = await conn.fetchrow(
                "SELECT email FROM users WHERE stripe_customer_id = $1",
                customer_id
            )

            # TODO: Send payment failed email notification

        return {"status": "success", "action": "payment_failed_notification"}


# Pricing data for frontend
PRICING_DATA = {
    "tiers": [
        {
            "id": "free",
            "name": {
                "en": "Free",
                "ka": "უფასო",
                "ru": "Бесплатный"
            },
            "description": {
                "en": "Get started with basic features",
                "ka": "დაიწყეთ ძირითადი ფუნქციებით",
                "ru": "Начните с базовых функций"
            },
            "price_monthly": 0,
            "price_yearly": 0,
            "features": [
                {"key": "searches", "value": "5/day"},
                {"key": "languages", "value": "3"},
                {"key": "digest", "value": "weekly"},
                {"key": "saved", "value": "10"},
            ],
            "cta": "current" if True else "get_started"
        },
        {
            "id": "premium",
            "name": {
                "en": "Premium",
                "ka": "პრემიუმი",
                "ru": "Премиум"
            },
            "description": {
                "en": "For patients actively searching for trials",
                "ka": "პაციენტებისთვის, რომლებიც აქტიურად ეძებენ კვლევებს",
                "ru": "Для пациентов, активно ищущих исследования"
            },
            "price_monthly": 5,
            "price_yearly": 48,
            "features": [
                {"key": "searches", "value": "50/day"},
                {"key": "languages", "value": "20"},
                {"key": "digest", "value": "daily"},
                {"key": "saved", "value": "100"},
                {"key": "deep_search", "value": "20% off"},
            ],
            "popular": True,
            "cta": "subscribe"
        },
        {
            "id": "premium_plus",
            "name": {
                "en": "Premium+",
                "ka": "პრემიუმი+",
                "ru": "Премиум+"
            },
            "description": {
                "en": "Maximum features for serious research",
                "ka": "მაქსიმალური ფუნქციები სერიოზული კვლევისთვის",
                "ru": "Максимум возможностей для серьёзных исследований"
            },
            "price_monthly": 10,
            "price_yearly": 96,
            "features": [
                {"key": "searches", "value": "unlimited"},
                {"key": "languages", "value": "40+"},
                {"key": "digest", "value": "realtime"},
                {"key": "saved", "value": "unlimited"},
                {"key": "deep_search", "value": "50% off"},
                {"key": "priority_support", "value": True},
                {"key": "api_access", "value": True},
            ],
            "cta": "subscribe"
        }
    ],
    "deep_search": [
        {
            "id": "basic",
            "name": {
                "en": "Basic Search",
                "ka": "ძირითადი ძიება",
                "ru": "Базовый поиск"
            },
            "price": 50,
            "includes": [
                "5 matching trials",
                "Basic eligibility check",
                "Contact information"
            ]
        },
        {
            "id": "comprehensive",
            "name": {
                "en": "Comprehensive Search",
                "ka": "სრული ძიება",
                "ru": "Комплексный поиск"
            },
            "price": 100,
            "includes": [
                "15 matching trials",
                "Detailed eligibility analysis",
                "Trial coordinator contacts",
                "Enrollment assistance"
            ],
            "popular": True
        },
        {
            "id": "premium",
            "name": {
                "en": "Premium Search",
                "ka": "პრემიუმ ძიება",
                "ru": "Премиум поиск"
            },
            "price": 150,
            "includes": [
                "Unlimited matching trials",
                "Full eligibility analysis",
                "Direct coordinator contact",
                "Application assistance",
                "Follow-up support"
            ]
        }
    ]
}


# Global instance
payment_service = PaymentService()
