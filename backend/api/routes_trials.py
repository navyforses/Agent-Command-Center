"""Trial API routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import get_db, Database
from services.search import SearchService
from services.translator import TranslationService
from services.aggregator import TrialAggregator

router = APIRouter()


# Response models
class TrialResponse(BaseModel):
    id: Optional[int] = None
    nct_id: Optional[str] = None
    eudract_id: Optional[str] = None
    who_id: Optional[str] = None
    isrctn_id: Optional[str] = None

    title_original: Optional[str] = None
    title_translated: Optional[str] = None
    summary_original: Optional[str] = None
    summary_translated: Optional[str] = None
    eligibility_original: Optional[str] = None
    eligibility_translated: Optional[str] = None
    simplified_summary: Optional[str] = None

    condition: Optional[List[str]] = None
    intervention_type: Optional[str] = None
    intervention_name: Optional[str] = None

    phase: Optional[str] = None
    status: Optional[str] = None
    enrollment_target: Optional[int] = None

    start_date: Optional[str] = None
    completion_date: Optional[str] = None

    sponsor: Optional[str] = None
    lead_sponsor_type: Optional[str] = None

    location_countries: Optional[List[str]] = None
    location_cities: Optional[List[str]] = None
    location_facilities: Optional[List[str]] = None

    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    age_min: Optional[str] = None
    age_max: Optional[str] = None
    gender: Optional[str] = None

    source_registry: Optional[str] = None
    source_url: Optional[str] = None
    relevance_score: Optional[float] = None

    class Config:
        from_attributes = True


class TrialListResponse(BaseModel):
    total: int
    page: int
    per_page: int
    results: List[TrialResponse]


class TranslationRequest(BaseModel):
    language: str
    force_refresh: bool = False


class TranslationResponse(BaseModel):
    title_translated: Optional[str] = None
    summary_translated: Optional[str] = None
    eligibility_translated: Optional[str] = None
    simplified_summary: Optional[str] = None
    language: str


class SourceStatusResponse(BaseModel):
    name: str
    type: str
    rate_limit: float
    available: bool
    last_sync: Optional[str] = None
    records_count: Optional[int] = None


@router.get("", response_model=TrialListResponse)
async def list_trials(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[List[str]] = Query(None),
    phase: Optional[List[str]] = Query(None),
    country: Optional[List[str]] = Query(None),
    language: str = Query("en"),
    db: Database = Depends(get_db)
):
    """List clinical trials with pagination and filters."""
    search_service = SearchService(db)

    filters = {}
    if status:
        filters["status"] = status
    if phase:
        filters["phase"] = phase
    if country:
        filters["countries"] = country

    results = await search_service.search(
        query="",
        language=language,
        filters=filters if filters else None,
        page=page,
        per_page=per_page,
        search_external=False
    )

    return TrialListResponse(
        total=results["total"],
        page=results["page"],
        per_page=results["per_page"],
        results=[TrialResponse(**t) for t in results["results"]]
    )


@router.get("/{trial_id}", response_model=TrialResponse)
async def get_trial(
    trial_id: int,
    language: str = Query("en"),
    db: Database = Depends(get_db)
):
    """Get a single trial by ID."""
    search_service = SearchService(db)

    trial = await search_service.get_trial(trial_id=trial_id, language=language)

    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")

    return TrialResponse(**trial)


@router.get("/nct/{nct_number}", response_model=TrialResponse)
async def get_trial_by_nct(
    nct_number: str,
    language: str = Query("en"),
    db: Database = Depends(get_db)
):
    """Get a trial by NCT number."""
    search_service = SearchService(db)

    trial = await search_service.get_trial(nct_id=nct_number, language=language)

    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")

    return TrialResponse(**trial)


@router.post("/{trial_id}/translate", response_model=TranslationResponse)
async def translate_trial(
    trial_id: int,
    request: TranslationRequest,
    db: Database = Depends(get_db)
):
    """Translate a trial to a specific language."""
    # Get the trial
    search_service = SearchService(db)
    trial = await search_service.get_trial(trial_id=trial_id)

    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")

    # Check cache if not forcing refresh
    if not request.force_refresh and db:
        cached = await db.get_translation(trial_id, request.language)
        if cached:
            return TranslationResponse(
                title_translated=cached.get("title_translated"),
                summary_translated=cached.get("summary_translated"),
                eligibility_translated=cached.get("eligibility_translated"),
                simplified_summary=cached.get("simplified_summary"),
                language=request.language
            )

    # Translate
    translator = TranslationService()
    glossary = await db.get_glossary(request.language) if db else None

    translation = await translator.translate_trial(
        trial, request.language, glossary
    )

    # Cache the translation
    if db:
        await db.save_translation(trial_id, request.language, translation)

    return TranslationResponse(
        title_translated=translation.get("title_translated"),
        summary_translated=translation.get("summary_translated"),
        eligibility_translated=translation.get("eligibility_translated"),
        simplified_summary=translation.get("simplified_summary"),
        language=request.language
    )


@router.get("/{trial_id}/translations")
async def get_trial_translations(
    trial_id: int,
    db: Database = Depends(get_db)
):
    """Get all available translations for a trial."""
    if not db:
        return {"translations": []}

    # This would query the database for all translations
    # For now, return empty
    return {"translations": [], "trial_id": trial_id}


@router.get("/sources/status", response_model=List[SourceStatusResponse])
async def get_sources_status():
    """Get status of all data sources."""
    aggregator = TrialAggregator()
    status = aggregator.get_source_status()

    return [
        SourceStatusResponse(
            name=name,
            type=info["type"],
            rate_limit=info["rate_limit"],
            available=info["available"]
        )
        for name, info in status.items()
    ]


@router.post("/sync")
async def sync_trials(
    conditions: List[str] = Query(None),
    db: Database = Depends(get_db)
):
    """Trigger background sync of trials from external sources."""
    if not conditions:
        conditions = [
            "hypoxic-ischemic encephalopathy",
            "HIE neonatal",
            "birth asphyxia",
            "cerebral palsy",
            "stem cell therapy"
        ]

    aggregator = TrialAggregator()
    search_service = SearchService(db)

    # Run sync in background (in production, use Celery or similar)
    total_synced = 0

    for condition in conditions:
        try:
            results = await search_service.search(
                query=condition,
                language="en",
                filters={"status": ["RECRUITING", "NOT_YET_RECRUITING"]},
                page=1,
                per_page=100,
                search_external=True
            )
            total_synced += results["total"]
        except Exception as e:
            print(f"Sync error for {condition}: {e}")

    return {
        "status": "completed",
        "conditions_synced": conditions,
        "total_trials": total_synced
    }
