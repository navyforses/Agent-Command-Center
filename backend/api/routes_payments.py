"""Payment API routes for Trial Navigator.

Handles Stripe checkout, webhooks, and subscription management.
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any
import stripe

from database import db, get_db
from services.stripe_service import payment_service, PRICING_DATA


router = APIRouter(prefix="/api/payments")


# Request/Response Models
class CreateCheckoutRequest(BaseModel):
    tier: str  # premium, premium_plus
    billing_period: str = "monthly"  # monthly, yearly


class CreateDeepSearchCheckoutRequest(BaseModel):
    search_type: str  # basic, comprehensive, premium
    search_request_id: int


class CheckoutResponse(BaseModel):
    session_id: str
    url: str


class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    current_period_end: Optional[str]
    cancel_at_period_end: bool


class PortalResponse(BaseModel):
    url: str


# Routes
@router.get("/pricing")
async def get_pricing():
    """Get pricing data for display."""
    return PRICING_DATA


@router.post("/checkout/subscription", response_model=CheckoutResponse)
async def create_subscription_checkout(
    request: CreateCheckoutRequest,
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Create a Stripe Checkout session for subscription."""
    # Get user
    async with database.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, stripe_customer_id FROM users WHERE id::text = $1",
            user_id
        )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get or create Stripe customer
    customer_id = await payment_service.get_or_create_customer(
        user_id=user_id,
        email=user['email'],
        existing_customer_id=user.get('stripe_customer_id')
    )

    # Update user with customer_id if new
    if not user.get('stripe_customer_id'):
        async with database.acquire() as conn:
            await conn.execute(
                "UPDATE users SET stripe_customer_id = $1 WHERE id::text = $2",
                customer_id, user_id
            )

    # Create checkout session
    try:
        result = await payment_service.create_subscription_checkout(
            customer_id=customer_id,
            tier=request.tier,
            billing_period=request.billing_period
        )
        return CheckoutResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")


@router.post("/checkout/deep-search", response_model=CheckoutResponse)
async def create_deep_search_checkout(
    request: CreateDeepSearchCheckoutRequest,
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Create a Stripe Checkout session for Deep Search."""
    # Get user and their subscription tier
    async with database.acquire() as conn:
        user = await conn.fetchrow("""
            SELECT id, email, stripe_customer_id, subscription_tier
            FROM users WHERE id::text = $1
        """, user_id)

        # Verify search request belongs to user
        search = await conn.fetchrow("""
            SELECT id FROM deep_search_requests
            WHERE id = $1 AND user_id::text = $2
        """, request.search_request_id, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not search:
        raise HTTPException(status_code=404, detail="Search request not found")

    # Get or create Stripe customer
    customer_id = await payment_service.get_or_create_customer(
        user_id=user_id,
        email=user['email'],
        existing_customer_id=user.get('stripe_customer_id')
    )

    # Calculate discount based on subscription
    tier = user.get('subscription_tier', 'free')
    discount = 0
    if tier == 'premium':
        discount = 0.2
    elif tier == 'premium_plus':
        discount = 0.5

    # Create checkout session
    try:
        result = await payment_service.create_deep_search_checkout(
            customer_id=customer_id,
            search_type=request.search_type,
            search_request_id=request.search_request_id,
            discount_percent=discount
        )
        return CheckoutResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription_status(
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Get current subscription status."""
    async with database.acquire() as conn:
        user = await conn.fetchrow("""
            SELECT subscription_tier, subscription_expires_at, stripe_customer_id
            FROM users WHERE id::text = $1
        """, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tier = user.get('subscription_tier', 'free')
    expires_at = user.get('subscription_expires_at')

    return SubscriptionResponse(
        tier=tier,
        status="active" if tier != "free" else "free",
        current_period_end=expires_at.isoformat() if expires_at else None,
        cancel_at_period_end=False  # Would need to check Stripe for actual value
    )


@router.post("/subscription/cancel")
async def cancel_subscription(
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Cancel subscription at period end."""
    async with database.acquire() as conn:
        user = await conn.fetchrow("""
            SELECT stripe_customer_id FROM users WHERE id::text = $1
        """, user_id)

    if not user or not user.get('stripe_customer_id'):
        raise HTTPException(status_code=404, detail="No active subscription")

    # Get active subscription from Stripe
    try:
        subscriptions = stripe.Subscription.list(
            customer=user['stripe_customer_id'],
            status='active',
            limit=1
        )

        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No active subscription")

        success = await payment_service.cancel_subscription(
            subscriptions.data[0].id,
            at_period_end=True
        )

        if success:
            return {"message": "Subscription will be cancelled at period end"}
        else:
            raise HTTPException(status_code=500, detail="Failed to cancel subscription")

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/subscription/resume")
async def resume_subscription(
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Resume a cancelled subscription."""
    async with database.acquire() as conn:
        user = await conn.fetchrow("""
            SELECT stripe_customer_id FROM users WHERE id::text = $1
        """, user_id)

    if not user or not user.get('stripe_customer_id'):
        raise HTTPException(status_code=404, detail="No subscription found")

    try:
        subscriptions = stripe.Subscription.list(
            customer=user['stripe_customer_id'],
            limit=1
        )

        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No subscription found")

        success = await payment_service.resume_subscription(
            subscriptions.data[0].id
        )

        if success:
            return {"message": "Subscription resumed"}
        else:
            raise HTTPException(status_code=500, detail="Failed to resume subscription")

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/portal", response_model=PortalResponse)
async def create_billing_portal(
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Create Stripe Billing Portal session."""
    async with database.acquire() as conn:
        user = await conn.fetchrow("""
            SELECT stripe_customer_id FROM users WHERE id::text = $1
        """, user_id)

    if not user or not user.get('stripe_customer_id'):
        raise HTTPException(status_code=404, detail="No billing account found")

    try:
        url = await payment_service.create_billing_portal_session(
            user['stripe_customer_id']
        )
        return PortalResponse(url=url)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/webhook")
async def handle_webhook(
    request: Request,
    stripe_signature: str = Header(..., alias="Stripe-Signature"),
    database = Depends(get_db)
):
    """Handle Stripe webhook events."""
    payload = await request.body()

    try:
        event = payment_service.construct_webhook_event(
            payload,
            stripe_signature
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    # Process event
    result = await payment_service.handle_webhook_event(event, database)

    return {"received": True, "result": result}


# Deep Search routes
@router.post("/deep-search/create")
async def create_deep_search_request(
    diagnosis: str,
    patient_age: Optional[str] = None,
    patient_location: Optional[str] = None,
    additional_info: Optional[str] = None,
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Create a new Deep Search request."""
    async with database.acquire() as conn:
        result = await conn.fetchrow("""
            INSERT INTO deep_search_requests (
                user_id, diagnosis, patient_age, patient_location,
                additional_info, status, created_at
            ) VALUES ($1::uuid, $2, $3, $4, $5, 'draft', NOW())
            RETURNING id
        """,
            user_id, diagnosis, patient_age, patient_location, additional_info
        )

    return {"id": result['id'], "status": "draft"}


@router.get("/deep-search/{request_id}")
async def get_deep_search_request(
    request_id: int,
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """Get Deep Search request details."""
    async with database.acquire() as conn:
        request = await conn.fetchrow("""
            SELECT * FROM deep_search_requests
            WHERE id = $1 AND user_id::text = $2
        """, request_id, user_id)

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    return dict(request)


@router.get("/deep-search")
async def list_deep_search_requests(
    user_id: str = Header(..., alias="X-User-ID"),
    database = Depends(get_db)
):
    """List user's Deep Search requests."""
    async with database.acquire() as conn:
        rows = await conn.fetch("""
            SELECT * FROM deep_search_requests
            WHERE user_id::text = $1
            ORDER BY created_at DESC
        """, user_id)

    return [dict(row) for row in rows]
