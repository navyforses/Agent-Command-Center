"""Patient profile models for personalized content delivery."""

from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field


class ContentType(str, Enum):
    """Types of content in the feed."""
    CLINICAL_TRIAL = "clinical_trial"
    NEWS = "news"
    RESEARCH_RESULT = "research_result"
    SCIENTIFIC_DISCOVERY = "discovery"
    DRUG_APPROVAL = "drug_approval"
    COMMUNITY = "community"


class Priority(str, Enum):
    """Content priority levels."""
    URGENT = "urgent"          # Red - deadline soon, high match
    IMPORTANT = "important"    # Orange - significant discovery
    RELEVANT = "relevant"      # Yellow - good match
    GENERAL = "general"        # Green - informational


class NotificationFrequency(str, Enum):
    """How often to notify user."""
    REALTIME = "realtime"      # Immediate for urgent
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    URGENT_ONLY = "urgent_only"  # Only >90% match


class PatientProfileCreate(BaseModel):
    """Data for creating a patient profile."""

    # Basic info
    patient_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: Optional[str] = None

    # Location
    country: str
    city: Optional[str] = None
    willing_to_travel: bool = True
    travel_distance_km: Optional[int] = None

    # Medical info (from Form 100 or manual entry)
    primary_diagnosis: str
    diagnosis_date: Optional[date] = None
    secondary_diagnoses: List[str] = []

    # Medical history
    medical_history: Optional[str] = None
    current_treatments: List[str] = []
    past_treatments: List[str] = []
    allergies: List[str] = []
    contraindications: List[str] = []

    # Documents
    form_100_text: Optional[str] = None  # Extracted text from Form 100
    additional_documents: List[str] = []  # Document IDs

    # Preferences
    preferred_language: str = "ka"
    notification_frequency: NotificationFrequency = NotificationFrequency.WEEKLY
    notification_channels: List[str] = ["email"]  # email, push, sms
    content_types: List[ContentType] = [
        ContentType.CLINICAL_TRIAL,
        ContentType.RESEARCH_RESULT,
        ContentType.SCIENTIFIC_DISCOVERY
    ]


class PatientProfile(PatientProfileCreate):
    """Full patient profile with computed fields."""

    id: int
    user_id: str

    # AI-generated fields
    ai_summary: Optional[str] = None
    extracted_conditions: List[str] = []
    extracted_keywords: List[str] = []
    age_category: Optional[str] = None  # infant, child, adolescent, adult, elderly

    # Stats
    total_matches: int = 0
    high_relevance_matches: int = 0
    last_content_fetch: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientProfileAIAnalysis(BaseModel):
    """AI analysis result for a patient profile."""

    # Extracted from documents
    primary_condition: str
    secondary_conditions: List[str] = []
    condition_keywords: List[str] = []  # For search

    # Computed
    age_years: float
    age_category: str

    # Recommendations
    recommended_trial_types: List[str] = []
    contraindicated_treatments: List[str] = []

    # Summary
    profile_summary: str  # 2-3 sentences in user's language
    search_strategy: str  # How we'll search for this patient


class FeedItem(BaseModel):
    """Single item in patient's feed."""

    id: str
    content_type: ContentType
    priority: Priority
    relevance_score: float = Field(..., ge=0, le=100)

    # Content
    title: str
    title_original: Optional[str] = None
    summary: str
    summary_original: Optional[str] = None

    # "What it means for you" section
    personal_relevance: str  # AI-generated explanation
    why_relevant: List[str] = []  # Bullet points

    # Metadata
    source: str
    source_url: Optional[str] = None
    published_at: Optional[datetime] = None
    fetched_at: datetime

    # For trials
    trial_id: Optional[int] = None
    nct_id: Optional[str] = None
    deadline_days: Optional[int] = None  # Days until recruitment closes
    location: Optional[str] = None
    phase: Optional[str] = None
    is_free: Optional[bool] = None

    # For news/discoveries
    journal: Optional[str] = None
    authors: Optional[List[str]] = None

    # Actions
    is_saved: bool = False
    is_read: bool = False

    class Config:
        from_attributes = True


class FeedResponse(BaseModel):
    """Response for feed endpoint."""

    patient_name: str
    patient_condition: str
    language: str

    total_items: int
    unread_count: int
    urgent_count: int

    items: List[FeedItem]

    # Stats
    stats: Dict[str, int] = {}  # By content type
    last_updated: datetime


class FeedFilters(BaseModel):
    """Filters for feed."""

    content_types: Optional[List[ContentType]] = None
    priorities: Optional[List[Priority]] = None
    min_relevance: Optional[float] = None
    is_unread: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

    page: int = 1
    per_page: int = 20


class NotificationSettings(BaseModel):
    """User notification preferences."""

    # Channels
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False

    # Frequency
    frequency: NotificationFrequency = NotificationFrequency.WEEKLY

    # Content types to notify about
    notify_trials: bool = True
    notify_results: bool = True
    notify_discoveries: bool = True
    notify_news: bool = False
    notify_community: bool = False

    # Thresholds
    urgent_threshold: float = 90.0  # Notify immediately if relevance > this

    # Quiet hours
    quiet_hours_start: Optional[int] = None  # Hour (0-23)
    quiet_hours_end: Optional[int] = None

    # Email preferences
    email_digest_day: str = "sunday"  # For weekly
    email_digest_hour: int = 9  # Local time


class WeeklyDigestData(BaseModel):
    """Data for weekly email digest."""

    patient_name: str
    patient_condition: str
    language: str

    # Summary stats
    new_trials: int
    new_results: int
    new_discoveries: int
    urgent_items: int

    # Top item (most relevant/urgent)
    top_item: Optional[FeedItem] = None

    # Key number of the week
    key_stat: Optional[Dict[str, Any]] = None  # e.g., {"value": "67%", "label": "improvement rate"}

    # Other highlights
    highlights: List[FeedItem] = []

    # Period
    period_start: date
    period_end: date
