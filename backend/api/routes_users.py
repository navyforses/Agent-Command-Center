"""User API routes."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr

from database import get_db, Database

router = APIRouter()


class UserCreate(BaseModel):
    """User registration request."""
    email: EmailStr
    primary_language: str = "en"
    secondary_language: Optional[str] = None
    diagnosis_interests: Optional[List[str]] = None
    location_preferences: Optional[List[str]] = None


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    primary_language: str
    secondary_language: Optional[str] = None
    diagnosis_interests: Optional[List[str]] = None
    location_preferences: Optional[List[str]] = None
    subscription_tier: str = "free"
    email_frequency: str = "weekly"
    created_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    """User update request."""
    primary_language: Optional[str] = None
    secondary_language: Optional[str] = None
    diagnosis_interests: Optional[List[str]] = None
    location_preferences: Optional[List[str]] = None
    email_frequency: Optional[str] = None


class SavedTrialResponse(BaseModel):
    """Saved trial response."""
    trial_id: int
    nct_id: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    status: str = "saved"
    saved_at: Optional[datetime] = None


class SaveTrialRequest(BaseModel):
    """Save trial request."""
    notes: Optional[str] = None
    notification_enabled: bool = True


class SubscribeRequest(BaseModel):
    """Subscription request."""
    tier: str  # "free", "premium"
    payment_method_id: Optional[str] = None


class DeepSearchRequest(BaseModel):
    """Deep search request."""
    diagnosis: str
    patient_age: Optional[str] = None
    patient_location: Optional[str] = None
    additional_info: Optional[str] = None


class DeepSearchResponse(BaseModel):
    """Deep search response."""
    id: int
    status: str
    diagnosis: str
    created_at: datetime


@router.post("/register", response_model=UserResponse)
async def register_user(
    user: UserCreate,
    db: Database = Depends(get_db)
):
    """Register a new user."""
    # In production, this would create a user in the database
    # and send a verification email

    return UserResponse(
        id="new-user-id",
        email=user.email,
        primary_language=user.primary_language,
        secondary_language=user.secondary_language,
        diagnosis_interests=user.diagnosis_interests,
        location_preferences=user.location_preferences,
        subscription_tier="free",
        email_frequency="weekly"
    )


@router.post("/login")
async def login_user(
    email: EmailStr,
    db: Database = Depends(get_db)
):
    """Login user (passwordless - sends magic link)."""
    # In production, this would:
    # 1. Check if user exists
    # 2. Generate magic link token
    # 3. Send email with login link

    return {
        "message": "Login link sent to your email",
        "email": email
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    # In production, this would use proper authentication
    db: Database = Depends(get_db)
):
    """Get current user profile."""
    # This is a placeholder - would use actual authentication
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update: UserUpdate,
    db: Database = Depends(get_db)
):
    """Update current user profile."""
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.get("/saved-trials", response_model=List[SavedTrialResponse])
async def get_saved_trials(
    db: Database = Depends(get_db)
):
    """Get user's saved trials."""
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/save-trial/{trial_id}")
async def save_trial(
    trial_id: int,
    request: SaveTrialRequest,
    db: Database = Depends(get_db)
):
    """Save a trial to user's list."""
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.delete("/save-trial/{trial_id}")
async def unsave_trial(
    trial_id: int,
    db: Database = Depends(get_db)
):
    """Remove a trial from saved list."""
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/subscribe")
async def subscribe(
    request: SubscribeRequest,
    db: Database = Depends(get_db)
):
    """Subscribe to premium tier.

    Tiers:
    - free: Weekly email digest
    - premium ($3-7/month): Daily alerts + AI chat
    """
    # In production, this would:
    # 1. Create Stripe checkout session
    # 2. Return checkout URL

    return {
        "checkout_url": f"https://checkout.stripe.com/session/xyz",
        "tier": request.tier
    }


@router.post("/deep-search", response_model=DeepSearchResponse)
async def request_deep_search(
    request: DeepSearchRequest,
    db: Database = Depends(get_db)
):
    """Request a deep search ($50-150).

    Deep search includes:
    - Personalized research by our team
    - Direct contact with trial coordinators
    - Eligibility assessment
    - Travel/accommodation guidance
    """
    # In production, this would:
    # 1. Create payment session
    # 2. Create deep search request in database
    # 3. Notify team

    return DeepSearchResponse(
        id=1,
        status="pending_payment",
        diagnosis=request.diagnosis,
        created_at=datetime.utcnow()
    )


@router.get("/deep-search/{request_id}")
async def get_deep_search_status(
    request_id: int,
    db: Database = Depends(get_db)
):
    """Get deep search request status."""
    raise HTTPException(status_code=404, detail="Request not found")


@router.get("/search-history")
async def get_search_history(
    limit: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db)
):
    """Get user's search history."""
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.delete("/search-history")
async def clear_search_history(
    db: Database = Depends(get_db)
):
    """Clear user's search history."""
    raise HTTPException(status_code=401, detail="Not authenticated")
