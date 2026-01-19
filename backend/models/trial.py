"""Trial Pydantic models."""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field


class TrialBase(BaseModel):
    """Base trial model with common fields."""

    nct_id: Optional[str] = None
    eudract_id: Optional[str] = None
    who_id: Optional[str] = None
    isrctn_id: Optional[str] = None

    title_original: Optional[str] = None
    summary_original: Optional[str] = None
    eligibility_original: Optional[str] = None

    condition: Optional[List[str]] = Field(default_factory=list)
    intervention_type: Optional[str] = None
    intervention_name: Optional[str] = None

    phase: Optional[str] = None
    status: Optional[str] = None
    enrollment_target: Optional[int] = None

    start_date: Optional[str] = None
    completion_date: Optional[str] = None

    sponsor: Optional[str] = None
    lead_sponsor_type: Optional[str] = None

    location_countries: Optional[List[str]] = Field(default_factory=list)
    location_cities: Optional[List[str]] = Field(default_factory=list)
    location_facilities: Optional[List[str]] = Field(default_factory=list)

    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    age_min: Optional[str] = None
    age_max: Optional[str] = None
    gender: Optional[str] = None

    source_registry: Optional[str] = None
    source_url: Optional[str] = None
    source_ids: Optional[Dict[str, Any]] = None


class Trial(TrialBase):
    """Full trial model with database fields."""

    id: Optional[int] = None
    relevance_score: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_fetched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrialCreate(TrialBase):
    """Model for creating a new trial."""
    pass


class TrialUpdate(BaseModel):
    """Model for updating a trial."""

    title_original: Optional[str] = None
    summary_original: Optional[str] = None
    eligibility_original: Optional[str] = None
    status: Optional[str] = None
    enrollment_target: Optional[int] = None
    completion_date: Optional[str] = None


class TrialTranslation(BaseModel):
    """Trial translation model."""

    id: Optional[int] = None
    trial_id: int
    language_code: str

    title_translated: Optional[str] = None
    summary_translated: Optional[str] = None
    eligibility_translated: Optional[str] = None
    simplified_summary: Optional[str] = None

    translated_at: Optional[datetime] = None
    translation_model: str = "gpt-4o"
    translation_quality: Optional[float] = None
    human_reviewed: bool = False

    class Config:
        from_attributes = True


class TrialWithTranslation(Trial):
    """Trial with optional translation fields."""

    title_translated: Optional[str] = None
    summary_translated: Optional[str] = None
    eligibility_translated: Optional[str] = None
    simplified_summary: Optional[str] = None


class TrialSearchResult(BaseModel):
    """Search result with relevance information."""

    trial: Trial
    relevance_score: float
    sources: List[str] = Field(default_factory=list)
    highlights: Optional[Dict[str, List[str]]] = None


class TrialListResponse(BaseModel):
    """Paginated list of trials."""

    total: int
    page: int
    per_page: int
    results: List[Trial]


class TrialStats(BaseModel):
    """Trial statistics."""

    total_trials: int
    recruiting: int
    completed: int
    by_phase: Dict[str, int]
    by_country: Dict[str, int]
    by_source: Dict[str, int]
