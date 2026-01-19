"""Send email digests task."""

import asyncio
from datetime import datetime, timedelta
from typing import List

from services.email_service import EmailService, get_subject
from database import Database


async def send_weekly_digests(db: Database = None):
    """Send weekly email digests to subscribed users.

    Runs every Sunday at 9 AM.
    """
    print(f"[{datetime.now()}] Starting weekly digest send...")

    if not db:
        print("  No database connection, skipping.")
        return

    email_service = EmailService()

    # Get users who want weekly digests
    users = await db.get_users_for_digest('weekly')
    print(f"  Found {len(users)} users for weekly digest")

    sent = 0
    errors = 0

    for user in users:
        user_id = user.get("id")
        email = user.get("email")
        language = user.get("primary_language", "en")

        try:
            # Get relevant trials for this user
            trials = await get_trials_for_user(
                db,
                diagnoses=user.get("diagnosis_interests", []),
                language=language,
                limit=10
            )

            if not trials:
                print(f"    {email}: No relevant trials, skipping")
                continue

            # Generate email content
            html = email_service.render_digest_template(
                trials=trials,
                language=language,
                user_name=user.get("name", "")
            )

            # Send email
            subject = get_subject(language)
            result = await email_service.send(
                to=email,
                subject=subject,
                html=html
            )

            if result.get("success"):
                sent += 1
                print(f"    {email}: Sent ({len(trials)} trials)")

                # Log the email (would use db.log_email in production)
            else:
                errors += 1
                print(f"    {email}: Failed - {result.get('error')}")

        except Exception as e:
            errors += 1
            print(f"    {email}: Error - {e}")

        # Rate limit
        await asyncio.sleep(0.5)

    print(f"[{datetime.now()}] Weekly digest complete.")
    print(f"  - Sent: {sent}")
    print(f"  - Errors: {errors}")

    return {
        "total_users": len(users),
        "sent": sent,
        "errors": errors
    }


async def send_daily_alerts(db: Database = None):
    """Send daily alerts to premium users.

    Runs every day at 8 AM.
    """
    print(f"[{datetime.now()}] Starting daily alerts...")

    if not db:
        print("  No database connection, skipping.")
        return

    email_service = EmailService()

    # Get premium users who want daily alerts
    users = await db.get_users_for_digest('daily')
    print(f"  Found {len(users)} users for daily alerts")

    # Get trials updated in last 24 hours
    yesterday = datetime.now() - timedelta(days=1)

    sent = 0

    for user in users:
        email = user.get("email")
        language = user.get("primary_language", "en")
        diagnoses = user.get("diagnosis_interests", [])

        # Get new trials matching user's interests
        new_trials = await get_new_trials_for_user(
            db,
            diagnoses=diagnoses,
            since=yesterday,
            language=language,
            limit=5
        )

        if not new_trials:
            continue

        # Generate and send email
        html = render_daily_alert(new_trials, language)
        subject = get_daily_subject(language, len(new_trials))

        result = await email_service.send(
            to=email,
            subject=subject,
            html=html
        )

        if result.get("success"):
            sent += 1

        await asyncio.sleep(0.5)

    print(f"[{datetime.now()}] Daily alerts complete. Sent: {sent}")
    return {"sent": sent}


async def get_trials_for_user(
    db: Database,
    diagnoses: List[str],
    language: str,
    limit: int = 10
) -> List[dict]:
    """Get relevant trials for a user.

    Args:
        db: Database instance
        diagnoses: User's conditions of interest
        language: User's preferred language
        limit: Maximum trials to return

    Returns:
        List of trials with translations
    """
    all_trials = []

    # Search for each diagnosis
    for diagnosis in diagnoses:
        trials = await db.search_trials(
            query=diagnosis,
            filters={"status": ["RECRUITING", "NOT_YET_RECRUITING"]},
            limit=limit
        )
        all_trials.extend(trials)

    # If no specific diagnoses, get recent recruiting trials
    if not all_trials:
        all_trials = await db.search_trials(
            query="",
            filters={"status": ["RECRUITING"]},
            limit=limit
        )

    # Deduplicate by nct_id
    seen_ids = set()
    unique_trials = []
    for trial in all_trials:
        nct_id = trial.get("nct_id")
        if nct_id and nct_id not in seen_ids:
            seen_ids.add(nct_id)
            unique_trials.append(trial)

    # Get translations if available
    for trial in unique_trials[:limit]:
        if trial.get("id") and language != "en":
            translation = await db.get_translation(trial["id"], language)
            if translation:
                trial.update(translation)

    return unique_trials[:limit]


async def get_new_trials_for_user(
    db: Database,
    diagnoses: List[str],
    since: datetime,
    language: str,
    limit: int = 5
) -> List[dict]:
    """Get trials added since a specific date.

    For daily alerts - only new trials.
    """
    # This would query trials with created_at > since
    # For now, return empty (implement with actual DB query)
    return []


def render_daily_alert(trials: List[dict], language: str) -> str:
    """Render daily alert email."""
    # Similar to weekly digest but shorter
    strings = {
        "en": "New clinical trials matching your interests",
        "ka": "ახალი კლინიკური კვლევები თქვენი ინტერესების მიხედვით",
    }

    header = strings.get(language, strings["en"])

    # Build simple email
    trial_html = ""
    for trial in trials:
        title = trial.get("title_translated") or trial.get("title_original", "")
        trial_html += f"<li>{title}</li>"

    return f"""
    <html>
    <body>
        <h2>{header}</h2>
        <ul>{trial_html}</ul>
    </body>
    </html>
    """


def get_daily_subject(language: str, count: int) -> str:
    """Get daily alert subject."""
    subjects = {
        "en": f"🔔 {count} new clinical trials - Trial Navigator",
        "ka": f"🔔 {count} ახალი კვლევა - Trial Navigator",
    }
    return subjects.get(language, subjects["en"])


if __name__ == "__main__":
    # Run directly for testing
    asyncio.run(send_weekly_digests())
