"""Email API routes for Trial Navigator."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

from database import db
from services.resend_service import email_service, EmailResult


router = APIRouter(prefix="/api/email")


class SendDigestRequest(BaseModel):
    """Request to send digest to a specific profile."""
    profile_id: int


class SendTestEmailRequest(BaseModel):
    """Request to send a test email."""
    to: EmailStr
    language: str = "en"


class EmailPreviewResponse(BaseModel):
    """Preview of email content."""
    subject: str
    html: str
    text: Optional[str] = None


# ================================
# Email Endpoints
# ================================

@router.post("/digest/send/{profile_id}")
async def send_digest_to_profile(
    profile_id: int,
    background_tasks: BackgroundTasks
):
    """Send weekly digest to a specific profile."""
    async with db.acquire() as conn:
        # Get profile with user email
        profile = await conn.fetchrow("""
            SELECT
                pp.*,
                u.email
            FROM patient_profiles pp
            JOIN users u ON u.id = pp.user_id
            WHERE pp.id = $1
        """, profile_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        # Get feed data for the profile
        feed_data = await get_feed_summary(conn, profile_id)

        # Send email in background
        background_tasks.add_task(
            send_digest_email,
            to=profile['email'],
            patient_name=profile['patient_name'] or "Patient",
            patient_condition=profile['primary_diagnosis'] or "Your condition",
            language=profile['preferred_language'] or "en",
            feed_data=feed_data
        )

    return {"status": "queued", "profile_id": profile_id}


@router.post("/digest/send-all")
async def send_digest_to_all(background_tasks: BackgroundTasks):
    """Send weekly digest to all eligible profiles."""
    async with db.acquire() as conn:
        # Get all profiles with weekly digest enabled
        profiles = await conn.fetch("""
            SELECT
                pp.id as profile_id,
                pp.patient_name,
                pp.primary_diagnosis,
                pp.preferred_language,
                u.email,
                ns.email_enabled
            FROM patient_profiles pp
            JOIN users u ON u.id = pp.user_id
            LEFT JOIN notification_settings ns ON ns.profile_id = pp.id
            WHERE u.email_verified = true
              AND (ns.email_enabled IS NULL OR ns.email_enabled = true)
              AND (ns.frequency IS NULL OR ns.frequency IN ('weekly', 'daily'))
        """)

        queued = 0
        for profile in profiles:
            feed_data = await get_feed_summary(conn, profile['profile_id'])

            # Skip if no new content
            total = (
                feed_data.get('new_trials', 0) +
                feed_data.get('new_results', 0) +
                feed_data.get('new_discoveries', 0)
            )
            if total == 0:
                continue

            background_tasks.add_task(
                send_digest_email,
                to=profile['email'],
                patient_name=profile['patient_name'] or "Patient",
                patient_condition=profile['primary_diagnosis'] or "Your condition",
                language=profile['preferred_language'] or "en",
                feed_data=feed_data
            )
            queued += 1

    return {"status": "queued", "count": queued}


@router.post("/urgent/send/{profile_id}")
async def send_urgent_alert(
    profile_id: int,
    item: Dict[str, Any],
    background_tasks: BackgroundTasks
):
    """Send urgent alert for a high-priority item."""
    async with db.acquire() as conn:
        profile = await conn.fetchrow("""
            SELECT
                pp.patient_name,
                pp.preferred_language,
                u.email
            FROM patient_profiles pp
            JOIN users u ON u.id = pp.user_id
            WHERE pp.id = $1
        """, profile_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        background_tasks.add_task(
            email_service.send_urgent_alert,
            to=profile['email'],
            patient_name=profile['patient_name'] or "Patient",
            language=profile['preferred_language'] or "en",
            item=item
        )

    return {"status": "queued", "profile_id": profile_id}


@router.post("/welcome/{profile_id}")
async def send_welcome(profile_id: int, background_tasks: BackgroundTasks):
    """Send welcome email after profile creation."""
    async with db.acquire() as conn:
        profile = await conn.fetchrow("""
            SELECT
                pp.patient_name,
                pp.preferred_language,
                u.email
            FROM patient_profiles pp
            JOIN users u ON u.id = pp.user_id
            WHERE pp.id = $1
        """, profile_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        background_tasks.add_task(
            email_service.send_welcome_email,
            to=profile['email'],
            patient_name=profile['patient_name'] or "Patient",
            language=profile['preferred_language'] or "en"
        )

    return {"status": "queued", "profile_id": profile_id}


@router.post("/test")
async def send_test_email(request: SendTestEmailRequest):
    """Send a test email to verify configuration."""
    # Create sample feed data
    sample_feed_data = {
        "new_trials": 3,
        "new_results": 2,
        "new_discoveries": 1,
        "urgent_items": 1,
        "top_item": {
            "title": "Phase 3 Trial: Stem Cell Therapy for Cerebral Palsy",
            "priority": "urgent",
            "relevance_score": 95.5,
            "personal_relevance": "This trial matches your child's diagnosis and age group. Enrollment is open in Europe.",
            "source_url": "https://clinicaltrials.gov/study/NCT12345678"
        },
        "key_stat": {
            "value": "3x",
            "label": "more trials this month vs last"
        },
        "highlights": [
            {
                "title": "New research shows promising results for HIE treatment",
                "content_type": "research_result",
                "source": "Nature Medicine",
                "source_url": "#"
            },
            {
                "title": "FDA approves new neurological assessment tool",
                "content_type": "drug_approval",
                "source": "FDA News",
                "source_url": "#"
            }
        ]
    }

    result = await email_service.send_weekly_digest(
        to=request.to,
        patient_name="Test User",
        patient_condition="Test Condition",
        language=request.language,
        feed_data=sample_feed_data
    )

    if result.success:
        return {"status": "sent", "email_id": result.email_id}
    else:
        raise HTTPException(status_code=500, detail=result.error)


@router.get("/preview/digest/{profile_id}")
async def preview_digest(profile_id: int) -> EmailPreviewResponse:
    """Preview weekly digest email without sending."""
    from services.email_templates import render_weekly_digest
    from datetime import date, timedelta

    async with db.acquire() as conn:
        profile = await conn.fetchrow("""
            SELECT * FROM patient_profiles WHERE id = $1
        """, profile_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        feed_data = await get_feed_summary(conn, profile_id)

        today = date.today()
        html = render_weekly_digest(
            patient_name=profile['patient_name'] or "Patient",
            patient_condition=profile['primary_diagnosis'] or "Your condition",
            language=profile['preferred_language'] or "en",
            new_trials=feed_data.get("new_trials", 0),
            new_results=feed_data.get("new_results", 0),
            new_discoveries=feed_data.get("new_discoveries", 0),
            urgent_items=feed_data.get("urgent_items", 0),
            top_item=feed_data.get("top_item"),
            key_stat=feed_data.get("key_stat"),
            highlights=feed_data.get("highlights", []),
            period_start=today - timedelta(days=7),
            period_end=today
        )

        return EmailPreviewResponse(
            subject=f"Weekly Report - {feed_data.get('new_trials', 0)} New Trials",
            html=html
        )


@router.get("/logs/{profile_id}")
async def get_email_logs(profile_id: int, limit: int = 20):
    """Get email logs for a profile."""
    async with db.acquire() as conn:
        # Get user_id from profile
        profile = await conn.fetchrow(
            "SELECT user_id FROM patient_profiles WHERE id = $1",
            profile_id
        )

        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        logs = await conn.fetch("""
            SELECT * FROM email_logs
            WHERE user_id = $1
            ORDER BY sent_at DESC
            LIMIT $2
        """, profile['user_id'], limit)

        return {"logs": [dict(log) for log in logs]}


# ================================
# Helper Functions
# ================================

async def get_feed_summary(conn, profile_id: int) -> Dict[str, Any]:
    """Get feed summary data for email digest."""
    from datetime import datetime, timedelta

    week_ago = datetime.now() - timedelta(days=7)

    # Get profile conditions for matching
    profile = await conn.fetchrow(
        "SELECT extracted_conditions, extracted_keywords FROM patient_profiles WHERE id = $1",
        profile_id
    )

    conditions = profile['extracted_conditions'] or []
    keywords = profile['extracted_keywords'] or []

    # Count new trials (simplified - would need proper matching in production)
    trials_count = await conn.fetchval("""
        SELECT COUNT(*) FROM trials
        WHERE created_at > $1
    """, week_ago)

    # Count news by type
    news_counts = await conn.fetchrow("""
        SELECT
            COUNT(*) FILTER (WHERE content_type = 'research_result') as results,
            COUNT(*) FILTER (WHERE content_type = 'discovery') as discoveries,
            COUNT(*) FILTER (WHERE content_type = 'news') as news
        FROM medical_news
        WHERE fetched_at > $1
    """, week_ago)

    # Get top item (highest relevance)
    top_trial = await conn.fetchrow("""
        SELECT
            t.nct_id as id,
            t.title_original as title,
            t.summary_original as summary,
            t.source_url,
            t.relevance_score
        FROM trials t
        WHERE t.created_at > $1
        ORDER BY t.relevance_score DESC
        LIMIT 1
    """, week_ago)

    top_item = None
    if top_trial and top_trial['relevance_score']:
        top_item = {
            "title": top_trial['title'],
            "summary": top_trial['summary'],
            "source_url": top_trial['source_url'] or f"https://clinicaltrials.gov/study/{top_trial['id']}",
            "relevance_score": float(top_trial['relevance_score']),
            "priority": "urgent" if top_trial['relevance_score'] >= 90 else "important",
            "personal_relevance": "This trial matches your profile criteria."
        }

    # Get highlights (recent news)
    highlights_rows = await conn.fetch("""
        SELECT
            title,
            summary,
            source,
            source_url,
            content_type
        FROM medical_news
        WHERE fetched_at > $1
        ORDER BY published_at DESC
        LIMIT 3
    """, week_ago)

    highlights = [
        {
            "title": h['title'],
            "summary": h['summary'],
            "source": h['source'],
            "source_url": h['source_url'],
            "content_type": h['content_type']
        }
        for h in highlights_rows
    ]

    # Calculate urgent items
    urgent_count = 0
    if top_item and top_item.get('relevance_score', 0) >= 90:
        urgent_count = 1

    return {
        "new_trials": trials_count or 0,
        "new_results": news_counts['results'] if news_counts else 0,
        "new_discoveries": news_counts['discoveries'] if news_counts else 0,
        "urgent_items": urgent_count,
        "top_item": top_item,
        "key_stat": {
            "value": str(trials_count or 0),
            "label": "new trials this week"
        } if trials_count else None,
        "highlights": highlights
    }


async def send_digest_email(
    to: str,
    patient_name: str,
    patient_condition: str,
    language: str,
    feed_data: Dict[str, Any]
):
    """Background task to send digest email."""
    result = await email_service.send_weekly_digest(
        to=to,
        patient_name=patient_name,
        patient_condition=patient_condition,
        language=language,
        feed_data=feed_data
    )

    # Log the email
    if result.success:
        async with db.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1",
                to
            )
            if user:
                await conn.execute("""
                    INSERT INTO email_logs (user_id, email_type, sent_at)
                    VALUES ($1, 'weekly_digest', NOW())
                """, user['id'])

    return result
