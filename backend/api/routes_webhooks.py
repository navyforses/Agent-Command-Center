"""Webhook routes for external services."""

from fastapi import APIRouter, Request, HTTPException, Header
import stripe

from config import settings

router = APIRouter()

# Configure Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    """Handle Stripe webhook events.

    Events handled:
    - checkout.session.completed: User completed subscription checkout
    - customer.subscription.updated: Subscription changed
    - customer.subscription.deleted: Subscription cancelled
    - invoice.paid: Payment successful
    - invoice.payment_failed: Payment failed
    """
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Stripe webhook not configured")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle events
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        # User completed checkout
        session = data
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        # Update user's subscription in database
        print(f"Checkout completed: customer={customer_id}, subscription={subscription_id}")

        # In production:
        # 1. Find user by customer_id
        # 2. Update subscription_tier
        # 3. Send welcome email

    elif event_type == "customer.subscription.updated":
        # Subscription changed
        subscription = data
        status = subscription.get("status")
        customer_id = subscription.get("customer")

        print(f"Subscription updated: customer={customer_id}, status={status}")

    elif event_type == "customer.subscription.deleted":
        # Subscription cancelled
        subscription = data
        customer_id = subscription.get("customer")

        print(f"Subscription cancelled: customer={customer_id}")

        # In production:
        # 1. Find user
        # 2. Downgrade to free tier
        # 3. Send cancellation confirmation

    elif event_type == "invoice.paid":
        # Payment successful
        invoice = data
        customer_id = invoice.get("customer")
        amount = invoice.get("amount_paid")

        print(f"Payment received: customer={customer_id}, amount={amount}")

    elif event_type == "invoice.payment_failed":
        # Payment failed
        invoice = data
        customer_id = invoice.get("customer")

        print(f"Payment failed: customer={customer_id}")

        # In production:
        # 1. Send payment failed email
        # 2. Maybe retry or downgrade

    return {"status": "success", "event_type": event_type}


@router.post("/resend")
async def resend_webhook(request: Request):
    """Handle Resend email webhook events.

    Events:
    - email.sent
    - email.delivered
    - email.delivery_delayed
    - email.complained
    - email.bounced
    - email.opened
    - email.clicked
    """
    payload = await request.json()

    event_type = payload.get("type")
    data = payload.get("data", {})

    if event_type == "email.opened":
        # Track email open
        email_id = data.get("email_id")
        print(f"Email opened: {email_id}")

        # Update email_logs table with opened_at

    elif event_type == "email.clicked":
        # Track link click
        email_id = data.get("email_id")
        link = data.get("link", {}).get("url")
        print(f"Email clicked: {email_id}, link={link}")

        # Update email_logs table with clicked_at

    elif event_type == "email.bounced":
        # Handle bounce
        email = data.get("to", [{}])[0].get("email")
        print(f"Email bounced: {email}")

        # Mark user's email as invalid

    elif event_type == "email.complained":
        # Handle spam complaint
        email = data.get("to", [{}])[0].get("email")
        print(f"Spam complaint: {email}")

        # Unsubscribe user

    return {"status": "success", "event_type": event_type}


@router.get("/health")
async def webhook_health():
    """Health check for webhook endpoints."""
    return {
        "stripe_configured": bool(settings.stripe_secret_key),
        "resend_configured": bool(settings.resend_api_key),
        "webhooks_active": True
    }
