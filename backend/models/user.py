"""User Pydantic models."""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


class SubscriptionTier(str, Enum):
    """Subscription tier levels."""
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class EmailFrequency(str, Enum):
    """Email digest frequency."""
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class UserPreferences(BaseModel):
    """User preferences model."""

    primary_language: str = "en"
    secondary_language: Optional[str] = None

    diagnosis_interests: List[str] = Field(default_factory=list)
    location_preferences: List[str] = Field(default_factory=list)
    age_category: Optional[str] = None

    email_frequency: EmailFrequency = EmailFrequency.WEEKLY
    notification_enabled: bool = True


class UserBase(BaseModel):
    """Base user model."""

    email: EmailStr
    preferences: Optional[UserPreferences] = None


class User(UserBase):
    """Full user model."""

    id: str
    email_verified: bool = False

    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    subscription_expires_at: Optional[datetime] = None

    stripe_customer_id: Optional[str] = None

    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreate(UserBase):
    """Model for creating a new user."""
    pass


class UserUpdate(BaseModel):
    """Model for updating user."""

    preferences: Optional[UserPreferences] = None
    email_frequency: Optional[EmailFrequency] = None


class UserSubscription(BaseModel):
    """User subscription details."""

    tier: SubscriptionTier
    status: str  # active, canceled, past_due
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False


class SavedTrial(BaseModel):
    """User's saved trial."""

    id: int
    user_id: str
    trial_id: int
    notes: Optional[str] = None
    status: str = "saved"  # saved, contacted, enrolled, rejected
    notification_enabled: bool = True
    saved_at: datetime

    class Config:
        from_attributes = True


class SearchHistoryEntry(BaseModel):
    """User's search history entry."""

    id: int
    user_id: str
    query_text: str
    query_language: str
    filters_applied: Optional[dict] = None
    results_count: int
    searched_at: datetime

    class Config:
        from_attributes = True


class DeepSearchRequest(BaseModel):
    """Deep search request model."""

    id: Optional[int] = None
    user_id: str

    diagnosis: str
    patient_age: Optional[str] = None
    patient_location: Optional[str] = None
    additional_info: Optional[str] = None

    status: str = "pending"  # pending, in_progress, completed, cancelled
    assigned_to: Optional[str] = None

    results_summary: Optional[str] = None
    trials_found: Optional[int] = None
    coordinators_contacted: Optional[int] = None

    payment_amount: Optional[float] = None
    payment_status: Optional[str] = None
    stripe_payment_id: Optional[str] = None

    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
