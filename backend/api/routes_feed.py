"""Feed and patient profile API routes."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime
import json

from models.patient_profile import (
    PatientProfileCreate,
    PatientProfile,
    FeedItem,
    FeedResponse,
    FeedFilters,
    ContentType,
    Priority,
    NotificationSettings,
    WeeklyDigestData
)
from services.patient_profile_service import PatientProfileService
from services.aggregator import TrialAggregator
from services.translator import TranslationService

router = APIRouter(prefix="/api", tags=["feed"])


# ============== Patient Profile ==============

@router.post("/profile", response_model=PatientProfile)
async def create_patient_profile(
    profile: PatientProfileCreate
):
    """Create a new patient profile.

    The AI will analyze the provided medical information and create
    a personalized profile for content matching.
    """
    service = PatientProfileService()

    # Analyze patient data
    analysis = await service.analyze_patient_data(
        form_100_text=profile.form_100_text,
        diagnosis=profile.primary_diagnosis,
        medical_history=profile.medical_history,
        date_of_birth=profile.date_of_birth,
        language=profile.preferred_language
    )

    # Create profile (would save to DB in production)
    patient_profile = PatientProfile(
        id=1,  # Would be auto-generated
        user_id="user_123",
        **profile.dict(),
        ai_summary=analysis.profile_summary,
        extracted_conditions=[analysis.primary_condition] + analysis.secondary_conditions,
        extracted_keywords=analysis.condition_keywords,
        age_category=analysis.age_category,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    return patient_profile


@router.post("/profile/upload-document")
async def upload_medical_document(
    file: UploadFile = File(...),
    document_type: str = Form("form_100")
):
    """Upload and extract text from medical document.

    Supports Form 100 and other medical documents.
    Returns extracted text for profile creation.
    """
    # Read file content
    content = await file.read()

    # In production, use OCR or PDF extraction
    # For now, assume text file
    try:
        text = content.decode('utf-8')
    except:
        text = "Document uploaded - text extraction would happen here"

    return {
        "filename": file.filename,
        "document_type": document_type,
        "extracted_text": text[:5000],  # Limit length
        "extraction_status": "success"
    }


@router.get("/profile/{profile_id}", response_model=PatientProfile)
async def get_patient_profile(profile_id: int):
    """Get patient profile by ID."""
    # Would fetch from DB
    raise HTTPException(status_code=404, detail="Profile not found")


@router.put("/profile/{profile_id}", response_model=PatientProfile)
async def update_patient_profile(
    profile_id: int,
    updates: dict
):
    """Update patient profile."""
    # Would update in DB
    raise HTTPException(status_code=404, detail="Profile not found")


# ============== Feed ==============

@router.get("/feed/{profile_id}", response_model=FeedResponse)
async def get_patient_feed(
    profile_id: int,
    content_types: Optional[str] = None,  # Comma-separated
    priority: Optional[str] = None,
    min_relevance: Optional[float] = None,
    unread_only: bool = False,
    page: int = 1,
    per_page: int = 20
):
    """Get personalized feed for a patient.

    Returns clinical trials, news, research results, and discoveries
    relevant to the patient's condition.
    """
    # Parse filters
    type_filter = None
    if content_types:
        type_filter = [ContentType(t) for t in content_types.split(",")]

    # Would fetch profile and generate feed from DB
    # For demo, return sample data

    sample_items = [
        FeedItem(
            id="trial_1",
            content_type=ContentType.CLINICAL_TRIAL,
            priority=Priority.URGENT,
            relevance_score=94.0,
            title="ღეროვანი უჯრედების თერაპია HIE-სთვის",
            title_original="Umbilical Cord Blood Therapy for HIE",
            summary="კვლევა ამოწმებს შეუძლია თუ არა ჭიპლის სისხლის უჯრედებს დაეხმაროს ბავშვებს ტვინის დაზიანების აღდგენაში.",
            summary_original="Study investigating umbilical cord blood cells for brain injury recovery in infants.",
            personal_relevance="ეს კვლევა ზუსტად ნიკას მდგომარეობას ეხება. ასაკი და დიაგნოზი შეესაბამება კრიტერიუმებს.",
            why_relevant=[
                "✓ ასაკი (2 წელი) შეესაბამება",
                "✓ დიაგნოზი (HIE) ზუსტად ემთხვევა",
                "✓ მონაწილეობა უფასოა",
                "⚠️ რეკრუტირება იხურება 14 დღეში"
            ],
            source="ClinicalTrials.gov",
            source_url="https://clinicaltrials.gov/study/NCT05123456",
            fetched_at=datetime.now(),
            trial_id=1,
            nct_id="NCT05123456",
            deadline_days=14,
            location="Duke University, აშშ",
            phase="Phase 2",
            is_free=True
        ),
        FeedItem(
            id="news_1",
            content_type=ContentType.NEWS,
            priority=Priority.IMPORTANT,
            relevance_score=87.0,
            title="მეცნიერებმა აღმოაჩინეს რატომ ეხმარება გაგრილება ბავშვებს HIE-ს დროს",
            title_original="Scientists Discover Why Cooling Helps Infants with HIE",
            summary="ახალმა კვლევამ გამოავლინა მოლეკულური მექანიზმი, რომელიც ხსნის თერაპიული ჰიპოთერმიის ეფექტურობას.",
            personal_relevance="ეს აღმოჩენა დაეხმარება უკეთესი მკურნალობის შექმნას HIE-სთვის მომავალში.",
            why_relevant=[
                "✓ პირდაპირ ეხება HIE-ს",
                "✓ ახსნის არსებული მკურნალობის მოქმედებას",
                "📚 სამეცნიერო სტატია Nature Medicine-ში"
            ],
            source="Nature Medicine",
            source_url="https://nature.com/articles/example",
            published_at=datetime.now(),
            fetched_at=datetime.now(),
            journal="Nature Medicine"
        ),
        FeedItem(
            id="result_1",
            content_type=ContentType.RESEARCH_RESULT,
            priority=Priority.IMPORTANT,
            relevance_score=82.0,
            title="EPO თერაპიის Phase 3 შედეგები: 67% გაუმჯობესება",
            title_original="Phase 3 Results: Erythropoietin Shows 67% Improvement",
            summary="340 ბავშვის კვლევამ აჩვენა რომ EPO უსაფრთხო და ეფექტურია HIE-ს მკურნალობაში.",
            personal_relevance="ეს წამალი შესაძლოა მალე დამტკიცდეს. შეგიძლიათ ექიმს ჰკითხოთ ამის შესახებ.",
            why_relevant=[
                "✓ HIE-ს ეხება",
                "✓ Phase 3 = ბოლო ეტაპი დამტკიცებამდე",
                "📊 67% პაციენტს გაუმჯობესდა მოტორული ფუნქცია"
            ],
            source="JAMA Pediatrics",
            source_url="https://jamanetwork.com/example",
            published_at=datetime.now(),
            fetched_at=datetime.now(),
            journal="JAMA Pediatrics"
        ),
        FeedItem(
            id="discovery_1",
            content_type=ContentType.SCIENTIFIC_DISCOVERY,
            priority=Priority.RELEVANT,
            relevance_score=71.0,
            title="Stanford-ის მეცნიერებმა ახალი გენური თერაპია შექმნეს",
            title_original="Stanford Scientists Develop Novel Gene Therapy",
            summary="ახალი მიდგომა შესაძლოა 5-10 წელში გახდეს ახალი მკურნალობა ტვინის დაზიანებისთვის.",
            personal_relevance="ეს ჯერ ადრეულ ეტაპზეა (ცხოველებზე ტესტირება), მაგრამ პერსპექტიული მიმართულებაა.",
            why_relevant=[
                "✓ ტვინის დაზიანებას ეხება",
                "⏳ ჯერ ადრეული ეტაპია (5-10 წელი)",
                "🔬 Preprint - ჯერ არ არის peer-reviewed"
            ],
            source="bioRxiv",
            source_url="https://biorxiv.org/example",
            fetched_at=datetime.now(),
            journal="bioRxiv (preprint)"
        )
    ]

    # Filter items
    filtered_items = sample_items
    if type_filter:
        filtered_items = [i for i in filtered_items if i.content_type in type_filter]
    if min_relevance:
        filtered_items = [i for i in filtered_items if i.relevance_score >= min_relevance]

    # Calculate stats
    stats = {}
    for item in sample_items:
        ct = item.content_type.value
        stats[ct] = stats.get(ct, 0) + 1

    return FeedResponse(
        patient_name="ნიკა",
        patient_condition="HIE (ჰიპოქსიურ-იშემიური ენცეფალოპათია)",
        language="ka",
        total_items=len(sample_items),
        unread_count=len([i for i in sample_items if not i.is_read]),
        urgent_count=len([i for i in sample_items if i.priority == Priority.URGENT]),
        items=filtered_items,
        stats=stats,
        last_updated=datetime.now()
    )


@router.post("/feed/{profile_id}/mark-read")
async def mark_feed_items_read(
    profile_id: int,
    item_ids: List[str]
):
    """Mark feed items as read."""
    return {"marked_read": len(item_ids)}


@router.post("/feed/{profile_id}/save/{item_id}")
async def save_feed_item(
    profile_id: int,
    item_id: str,
    notes: Optional[str] = None
):
    """Save a feed item for later."""
    return {"saved": True, "item_id": item_id}


# ============== Notifications ==============

@router.get("/notifications/settings/{profile_id}", response_model=NotificationSettings)
async def get_notification_settings(profile_id: int):
    """Get notification settings for a patient profile."""
    return NotificationSettings()


@router.put("/notifications/settings/{profile_id}", response_model=NotificationSettings)
async def update_notification_settings(
    profile_id: int,
    settings: NotificationSettings
):
    """Update notification settings."""
    return settings


# ============== Weekly Digest ==============

@router.get("/digest/preview/{profile_id}", response_model=WeeklyDigestData)
async def preview_weekly_digest(profile_id: int):
    """Preview the weekly digest for a patient."""
    from datetime import date, timedelta

    today = date.today()
    week_ago = today - timedelta(days=7)

    return WeeklyDigestData(
        patient_name="ნიკა",
        patient_condition="HIE",
        language="ka",
        new_trials=3,
        new_results=2,
        new_discoveries=1,
        urgent_items=1,
        top_item=FeedItem(
            id="trial_1",
            content_type=ContentType.CLINICAL_TRIAL,
            priority=Priority.URGENT,
            relevance_score=94.0,
            title="Duke University-ს კვლევა იხურება 14 დღეში!",
            summary="ღეროვანი უჯრედების თერაპია HIE-სთვის",
            personal_relevance="შესაბამისობა 94% - არ გამოტოვოთ!",
            why_relevant=["✓ ასაკი შეესაბამება", "✓ დიაგნოზი ემთხვევა"],
            source="ClinicalTrials.gov",
            fetched_at=datetime.now()
        ),
        key_stat={
            "value": "67%",
            "label": "ბავშვებს გაუმჯობესდა მოტორული ფუნქცია EPO-თი"
        },
        highlights=[],
        period_start=week_ago,
        period_end=today
    )


@router.post("/digest/send/{profile_id}")
async def send_weekly_digest(profile_id: int):
    """Manually trigger sending weekly digest."""
    return {"sent": True, "profile_id": profile_id}
