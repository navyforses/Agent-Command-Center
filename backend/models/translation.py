"""Translation Pydantic models."""

from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel


class TranslationRequest(BaseModel):
    """Request for trial translation."""

    trial_id: int
    language_code: str
    force_refresh: bool = False


class TranslationResult(BaseModel):
    """Result of trial translation."""

    title_translated: Optional[str] = None
    summary_translated: Optional[str] = None
    eligibility_translated: Optional[str] = None
    simplified_summary: Optional[str] = None

    language_code: str
    translation_model: str = "gpt-4o"
    translation_quality: Optional[float] = None
    translated_at: Optional[datetime] = None


class TextTranslationRequest(BaseModel):
    """Request for text translation."""

    text: str
    target_language: str
    source_language: str = "en"
    context: str = "medical"


class TextTranslationResult(BaseModel):
    """Result of text translation."""

    original_text: str
    translated_text: str
    source_language: str
    target_language: str


class QueryExpansionResult(BaseModel):
    """Result of query expansion."""

    original_query: str
    source_language: str
    expanded_terms: List[str]
    english_translation: Optional[str] = None


class GlossaryTerm(BaseModel):
    """Medical glossary term."""

    id: Optional[int] = None
    term_english: str
    language_code: str
    term_translated: str
    definition_translated: Optional[str] = None
    category: Optional[str] = None
    verified: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GlossaryBatch(BaseModel):
    """Batch of glossary terms."""

    language_code: str
    terms: List[GlossaryTerm]


class LanguageInfo(BaseModel):
    """Language information."""

    code: str
    name_native: str
    name_english: str
    direction: str = "ltr"
    tier: int = 2
    is_active: bool = True
    speakers_millions: Optional[float] = None
    diaspora_millions: Optional[float] = None


class TranslationStats(BaseModel):
    """Translation statistics for a language."""

    language_code: str
    total_trials_translated: int
    glossary_terms: int
    verified_terms: int
    translation_coverage: float  # percentage
    last_translation_at: Optional[datetime] = None
