"""Language API routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import get_db, Database
from services.translator import SUPPORTED_LANGUAGES
from services.glossary import GlossaryService, GEORGIAN_GLOSSARY

router = APIRouter()


class LanguageResponse(BaseModel):
    """Language information response."""
    code: str
    name_native: str
    name_english: str
    tier: int
    speakers_millions: Optional[float] = None
    is_active: bool = True


class GlossaryTermResponse(BaseModel):
    """Glossary term response."""
    term_english: str
    term_translated: str
    definition_translated: Optional[str] = None
    language_code: str
    category: Optional[str] = None
    verified: bool = False


class GlossaryListResponse(BaseModel):
    """Glossary list response."""
    language_code: str
    total: int
    terms: List[GlossaryTermResponse]


@router.get("", response_model=List[LanguageResponse])
async def list_languages(
    tier: Optional[int] = Query(None, ge=0, le=3),
    active_only: bool = Query(True)
):
    """List all supported languages.

    Languages are organized by tier:
    - Tier 0: Major world languages (English)
    - Tier 1: Priority languages (Georgian, Armenian, Azerbaijani, etc.)
    - Tier 2: European minority languages (Basque, Welsh, etc.)
    - Tier 3: Asian and African languages
    """
    languages = SUPPORTED_LANGUAGES

    if tier is not None:
        languages = [l for l in languages if l["tier"] == tier]

    return [
        LanguageResponse(
            code=lang["code"],
            name_native=lang["name_native"],
            name_english=lang["name_english"],
            tier=lang["tier"],
            speakers_millions=lang.get("speakers_millions"),
            is_active=True
        )
        for lang in languages
    ]


@router.get("/tiers")
async def get_language_tiers():
    """Get language tier information."""
    return {
        "tiers": [
            {
                "tier": 0,
                "name": "Major Languages",
                "description": "Major world languages with extensive resources",
                "examples": ["English"]
            },
            {
                "tier": 1,
                "name": "Priority Languages",
                "description": "Caucasus and Central Asian languages - primary focus",
                "examples": ["Georgian", "Armenian", "Azerbaijani", "Kazakh", "Uzbek", "Mongolian"]
            },
            {
                "tier": 2,
                "name": "European Minority",
                "description": "European minority and regional languages",
                "examples": ["Basque", "Welsh", "Irish", "Maltese", "Estonian", "Latvian", "Lithuanian"]
            },
            {
                "tier": 3,
                "name": "Asian & African",
                "description": "Underserved Asian and African languages",
                "examples": ["Khmer", "Burmese", "Nepali", "Bengali", "Amharic", "Somali", "Swahili"]
            }
        ]
    }


@router.get("/{code}", response_model=LanguageResponse)
async def get_language(code: str):
    """Get details for a specific language."""
    for lang in SUPPORTED_LANGUAGES:
        if lang["code"] == code:
            return LanguageResponse(
                code=lang["code"],
                name_native=lang["name_native"],
                name_english=lang["name_english"],
                tier=lang["tier"],
                speakers_millions=lang.get("speakers_millions"),
                is_active=True
            )

    raise HTTPException(status_code=404, detail="Language not found")


@router.get("/{code}/glossary", response_model=GlossaryListResponse)
async def get_language_glossary(
    code: str,
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_db)
):
    """Get medical glossary for a language.

    Categories: conditions, treatments, trial_terms, procedures, anatomy
    """
    glossary_service = GlossaryService(db)

    # Get glossary
    glossary = await glossary_service.get_glossary(code)

    # For Georgian, supplement with pre-defined terms
    if code == "ka":
        glossary = {**GEORGIAN_GLOSSARY, **glossary}

    # Filter by search
    if search:
        search_lower = search.lower()
        glossary = {
            k: v for k, v in glossary.items()
            if search_lower in k.lower() or search_lower in v.lower()
        }

    # Convert to response format
    terms = [
        GlossaryTermResponse(
            term_english=eng,
            term_translated=trans,
            language_code=code,
            verified=eng in GEORGIAN_GLOSSARY if code == "ka" else False
        )
        for eng, trans in list(glossary.items())[:limit]
    ]

    return GlossaryListResponse(
        language_code=code,
        total=len(terms),
        terms=terms
    )


@router.get("/glossary/{term}")
async def get_glossary_term(
    term: str,
    language: str = Query("ka"),
    db: Database = Depends(get_db)
):
    """Get translation for a specific medical term."""
    glossary_service = GlossaryService(db)

    result = await glossary_service.get_term(term, language)

    if not result:
        raise HTTPException(status_code=404, detail="Term not found")

    return GlossaryTermResponse(
        term_english=result["term_english"],
        term_translated=result["term_translated"],
        definition_translated=result.get("definition_translated"),
        language_code=language
    )


@router.post("/{code}/glossary/seed")
async def seed_language_glossary(
    code: str,
    category: Optional[str] = Query(None),
    db: Database = Depends(get_db)
):
    """Seed glossary for a language with common medical terms.

    This will generate translations for standard medical terminology.
    Use category to seed only specific categories.
    """
    glossary_service = GlossaryService(db)

    # Get terms to seed
    if category:
        terms = glossary_service.get_category_terms(category)
    else:
        terms = None  # Use default terms

    # Seed the glossary
    added = await glossary_service.seed_language(code, terms)

    return {
        "language_code": code,
        "terms_added": added,
        "category": category
    }


@router.get("/{code}/stats")
async def get_language_stats(
    code: str,
    db: Database = Depends(get_db)
):
    """Get statistics for a language.

    Returns counts of translated trials, glossary terms, etc.
    """
    glossary_service = GlossaryService(db)
    glossary = await glossary_service.get_glossary(code)

    # Supplement with pre-defined for Georgian
    if code == "ka":
        total_glossary = len({**GEORGIAN_GLOSSARY, **glossary})
    else:
        total_glossary = len(glossary)

    return {
        "language_code": code,
        "glossary_terms": total_glossary,
        "verified_terms": len(GEORGIAN_GLOSSARY) if code == "ka" else 0,
        # These would come from database in production
        "translated_trials": 0,
        "translation_coverage": 0.0
    }
