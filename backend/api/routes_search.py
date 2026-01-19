"""Search API routes."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from database import get_db, Database
from services.search import SearchService
from services.translator import TranslationService

router = APIRouter()


class SearchFilters(BaseModel):
    """Search filters model."""
    status: Optional[List[str]] = None
    phase: Optional[List[str]] = None
    countries: Optional[List[str]] = None
    age_group: Optional[str] = None  # "pediatric", "adult", "all"


class SearchRequest(BaseModel):
    """Search request model."""
    query: str
    language: str = "en"
    filters: Optional[SearchFilters] = None
    page: int = 1
    per_page: int = 20


class TrialResult(BaseModel):
    """Single trial result."""
    id: Optional[int] = None
    nct_id: Optional[str] = None
    eudract_id: Optional[str] = None
    who_id: Optional[str] = None

    title_original: Optional[str] = None
    title_translated: Optional[str] = None
    summary_original: Optional[str] = None
    summary_translated: Optional[str] = None
    simplified_summary: Optional[str] = None

    condition: Optional[List[str]] = None
    phase: Optional[str] = None
    status: Optional[str] = None

    location_countries: Optional[List[str]] = None
    sponsor: Optional[str] = None

    relevance_score: Optional[float] = None
    sources: Optional[List[str]] = None

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Search response model."""
    total: int
    page: int
    per_page: int
    results: List[TrialResult]
    expanded_terms: Optional[List[str]] = None


class TranslateTextRequest(BaseModel):
    """Text translation request."""
    text: str
    target_language: str
    context: str = "medical"


class TranslateTextResponse(BaseModel):
    """Text translation response."""
    original: str
    translated: str
    target_language: str


class QueryExpansionRequest(BaseModel):
    """Query expansion request."""
    query: str
    source_language: str = "en"


class QueryExpansionResponse(BaseModel):
    """Query expansion response."""
    original_query: str
    expanded_terms: List[str]


@router.post("", response_model=SearchResponse)
async def search_trials(
    request: SearchRequest,
    db: Database = Depends(get_db)
):
    """Search for clinical trials across all sources.

    This endpoint:
    1. Expands the query with medical synonyms and translations
    2. Searches local database and external sources
    3. Deduplicates results
    4. Scores relevance
    5. Translates results to requested language
    """
    search_service = SearchService(db)

    # Convert filters to dict
    filters = None
    if request.filters:
        filters = {
            k: v for k, v in request.filters.model_dump().items()
            if v is not None
        }

    # Perform search
    results = await search_service.search(
        query=request.query,
        language=request.language,
        filters=filters,
        page=request.page,
        per_page=request.per_page,
        search_external=True
    )

    # Format results
    trial_results = []
    for trial in results["results"]:
        trial_results.append(TrialResult(
            id=trial.get("id"),
            nct_id=trial.get("nct_id"),
            eudract_id=trial.get("eudract_id"),
            who_id=trial.get("who_id"),
            title_original=trial.get("title_original"),
            title_translated=trial.get("title_translated"),
            summary_original=trial.get("summary_original"),
            summary_translated=trial.get("summary_translated"),
            simplified_summary=trial.get("simplified_summary"),
            condition=trial.get("condition"),
            phase=trial.get("phase"),
            status=trial.get("status"),
            location_countries=trial.get("location_countries"),
            sponsor=trial.get("sponsor"),
            relevance_score=trial.get("relevance_score"),
            sources=trial.get("_sources")
        ))

    return SearchResponse(
        total=results["total"],
        page=results["page"],
        per_page=results["per_page"],
        results=trial_results,
        expanded_terms=results.get("expanded_terms")
    )


@router.get("")
async def search_trials_get(
    query: str = Query(..., min_length=1),
    language: str = Query("en"),
    status: Optional[List[str]] = Query(None),
    phase: Optional[List[str]] = Query(None),
    countries: Optional[List[str]] = Query(None),
    age_group: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db)
):
    """Search trials via GET request.

    Alternative to POST for simpler integrations.
    """
    filters = SearchFilters(
        status=status,
        phase=phase,
        countries=countries,
        age_group=age_group
    )

    request = SearchRequest(
        query=query,
        language=language,
        filters=filters,
        page=page,
        per_page=per_page
    )

    return await search_trials(request, db)


@router.post("/translate", response_model=TranslateTextResponse)
async def translate_text(request: TranslateTextRequest):
    """Translate arbitrary text to target language.

    Useful for translating medical terminology or custom text.
    """
    translator = TranslationService()

    translated = await translator.translate_text(
        request.text,
        request.target_language,
        request.context
    )

    return TranslateTextResponse(
        original=request.text,
        translated=translated,
        target_language=request.target_language
    )


@router.post("/expand-query", response_model=QueryExpansionResponse)
async def expand_query(request: QueryExpansionRequest):
    """Expand a search query with synonyms and related terms.

    Returns the original query plus medical synonyms,
    abbreviations, and related conditions.
    """
    translator = TranslationService()

    terms = await translator.expand_query(
        request.query,
        request.source_language
    )

    return QueryExpansionResponse(
        original_query=request.query,
        expanded_terms=terms
    )


@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=2),
    language: str = Query("en"),
    limit: int = Query(10, ge=1, le=50),
    db: Database = Depends(get_db)
):
    """Get search suggestions based on partial query.

    Returns common conditions, interventions, and previous searches.
    """
    suggestions = []

    # Common medical conditions (could be expanded from database)
    common_conditions = [
        "hypoxic-ischemic encephalopathy",
        "HIE",
        "cerebral palsy",
        "epilepsy",
        "autism spectrum disorder",
        "stem cell therapy",
        "gene therapy",
        "immunotherapy",
        "cancer",
        "diabetes",
        "Alzheimer's disease",
        "Parkinson's disease",
        "multiple sclerosis",
        "ALS",
        "stroke",
    ]

    query_lower = query.lower()

    for condition in common_conditions:
        if query_lower in condition.lower():
            suggestions.append({
                "text": condition,
                "type": "condition"
            })

    return {
        "query": query,
        "suggestions": suggestions[:limit]
    }


@router.get("/filters")
async def get_filter_options(db: Database = Depends(get_db)):
    """Get available filter options.

    Returns valid values for status, phase, and countries.
    """
    return {
        "status": [
            {"value": "RECRUITING", "label": "Recruiting", "description": "Currently enrolling participants"},
            {"value": "NOT_YET_RECRUITING", "label": "Not Yet Recruiting", "description": "Will start recruiting soon"},
            {"value": "ACTIVE_NOT_RECRUITING", "label": "Active, Not Recruiting", "description": "Ongoing but not enrolling"},
            {"value": "COMPLETED", "label": "Completed", "description": "Study has ended"},
            {"value": "TERMINATED", "label": "Terminated", "description": "Stopped early"},
            {"value": "SUSPENDED", "label": "Suspended", "description": "Temporarily halted"},
            {"value": "WITHDRAWN", "label": "Withdrawn", "description": "Withdrawn before enrollment"}
        ],
        "phase": [
            {"value": "EARLY_PHASE1", "label": "Early Phase 1"},
            {"value": "PHASE1", "label": "Phase 1"},
            {"value": "PHASE1_PHASE2", "label": "Phase 1/2"},
            {"value": "PHASE2", "label": "Phase 2"},
            {"value": "PHASE2_PHASE3", "label": "Phase 2/3"},
            {"value": "PHASE3", "label": "Phase 3"},
            {"value": "PHASE4", "label": "Phase 4"},
            {"value": "NA", "label": "Not Applicable"}
        ],
        "age_groups": [
            {"value": "pediatric", "label": "Pediatric (0-18 years)"},
            {"value": "adult", "label": "Adult (18+ years)"},
            {"value": "all", "label": "All Ages"}
        ],
        "common_countries": [
            {"code": "US", "name": "United States"},
            {"code": "DE", "name": "Germany"},
            {"code": "FR", "name": "France"},
            {"code": "GB", "name": "United Kingdom"},
            {"code": "IT", "name": "Italy"},
            {"code": "ES", "name": "Spain"},
            {"code": "CN", "name": "China"},
            {"code": "JP", "name": "Japan"},
            {"code": "AU", "name": "Australia"},
            {"code": "CA", "name": "Canada"}
        ]
    }
