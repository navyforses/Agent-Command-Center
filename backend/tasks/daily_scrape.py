"""Daily data refresh task."""

import asyncio
from datetime import datetime
from typing import List

from scrapers import ClinicalTrialsGovScraper, ISRCTNScraper
from services.deduplicator import Deduplicator
from database import Database


async def daily_data_refresh(
    conditions: List[str] = None,
    db: Database = None
):
    """Run daily at 3 AM - fetch new/updated trials from all sources.

    Args:
        conditions: List of conditions to sync (default: common HIE-related terms)
        db: Database instance
    """
    print(f"[{datetime.now()}] Starting daily data refresh...")

    if conditions is None:
        conditions = [
            "hypoxic-ischemic encephalopathy",
            "HIE neonatal",
            "birth asphyxia",
            "cerebral palsy",
            "stem cell therapy brain",
            "therapeutic hypothermia neonatal",
            "cord blood therapy",
            "neonatal seizures",
        ]

    deduplicator = Deduplicator()
    all_trials = []

    # 1. Fetch from ClinicalTrials.gov
    print("  Fetching from ClinicalTrials.gov...")
    ctg = ClinicalTrialsGovScraper()
    try:
        ctg_updates = await ctg.get_recent_updates(days=1)
        ctg_normalized = [ctg.normalize(t) for t in ctg_updates]
        all_trials.extend(ctg_normalized)
        print(f"  - ClinicalTrials.gov: {len(ctg_normalized)} trials")
    except Exception as e:
        print(f"  - ClinicalTrials.gov error: {e}")
    finally:
        await ctg.close()

    # 2. Search for specific conditions
    print("  Searching for specific conditions...")
    ctg = ClinicalTrialsGovScraper()
    for condition in conditions:
        try:
            results = await ctg.search(
                condition=condition,
                status=["RECRUITING", "NOT_YET_RECRUITING"]
            )
            normalized = [ctg.normalize(t) for t in results]
            all_trials.extend(normalized)
            print(f"  - '{condition}': {len(normalized)} trials")
        except Exception as e:
            print(f"  - Error searching '{condition}': {e}")

        # Small delay between searches
        await asyncio.sleep(0.5)

    await ctg.close()

    # 3. Fetch from ISRCTN
    print("  Fetching from ISRCTN...")
    isrctn = ISRCTNScraper()
    for condition in conditions[:3]:  # Limit for ISRCTN
        try:
            results = await isrctn.search(condition=condition)
            normalized = [isrctn.normalize(t) for t in results]
            all_trials.extend(normalized)
            print(f"  - ISRCTN '{condition}': {len(normalized)} trials")
        except Exception as e:
            print(f"  - ISRCTN error: {e}")

        await asyncio.sleep(1)  # Slower rate limit

    await isrctn.close()

    # 4. Deduplicate
    print("  Deduplicating results...")
    unique_trials = deduplicator.deduplicate(all_trials)
    print(f"  - {len(all_trials)} total -> {len(unique_trials)} unique")

    # 5. Upsert to database
    if db:
        print("  Saving to database...")
        saved = 0
        for trial in unique_trials:
            try:
                await db.upsert_trial(trial)
                saved += 1
            except Exception as e:
                print(f"  - Error saving trial: {e}")

        print(f"  - Saved {saved} trials")

    print(f"[{datetime.now()}] Daily refresh complete. {len(unique_trials)} unique trials processed.")

    return {
        "total_fetched": len(all_trials),
        "unique_trials": len(unique_trials),
        "conditions": conditions
    }


async def sync_specific_condition(
    condition: str,
    db: Database = None
):
    """Sync trials for a specific condition.

    Args:
        condition: Medical condition to search
        db: Database instance
    """
    print(f"[{datetime.now()}] Syncing: {condition}")

    deduplicator = Deduplicator()
    all_trials = []

    # ClinicalTrials.gov
    ctg = ClinicalTrialsGovScraper()
    try:
        results = await ctg.search_all(
            condition=condition,
            status=["RECRUITING", "NOT_YET_RECRUITING", "ACTIVE_NOT_RECRUITING"],
            max_results=500
        )
        normalized = [ctg.normalize(t) for t in results]
        all_trials.extend(normalized)
    finally:
        await ctg.close()

    # Deduplicate
    unique_trials = deduplicator.deduplicate(all_trials)

    # Save to database
    if db:
        for trial in unique_trials:
            await db.upsert_trial(trial)

    print(f"[{datetime.now()}] Synced {len(unique_trials)} trials for '{condition}'")

    return len(unique_trials)


if __name__ == "__main__":
    # Run directly for testing
    asyncio.run(daily_data_refresh())
