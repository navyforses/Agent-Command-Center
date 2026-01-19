"""Translate new trials task."""

import asyncio
from datetime import datetime
from typing import List

from services.translator import TranslationService
from services.glossary import GlossaryService
from database import Database


# Tier 1 languages to pre-translate
TIER1_LANGUAGES = ['ka', 'hy', 'az', 'kk', 'uz', 'mn']


async def translate_new_trials(
    languages: List[str] = None,
    limit: int = 100,
    db: Database = None
):
    """Translate untranslated trials to priority languages.

    Args:
        languages: Languages to translate to (default: Tier 1)
        limit: Maximum trials to translate per run
        db: Database instance
    """
    print(f"[{datetime.now()}] Starting translation task...")

    if languages is None:
        languages = TIER1_LANGUAGES

    if not db:
        print("  No database connection, skipping.")
        return

    translator = TranslationService()
    glossary_service = GlossaryService(db)

    # Get untranslated trials
    untranslated = await db.get_untranslated_trials(limit=limit)
    print(f"  Found {len(untranslated)} untranslated trials")

    translations_done = 0
    errors = 0

    for trial in untranslated:
        trial_id = trial.get("nct_id") or trial.get("id")
        print(f"  Translating: {trial_id}")

        for lang_code in languages:
            try:
                # Get glossary for this language
                glossary = await glossary_service.get_glossary(lang_code)

                # Translate
                translation = await translator.translate_trial(
                    trial,
                    lang_code,
                    glossary
                )

                # Save to database
                if trial.get("id"):
                    await db.save_translation(
                        trial["id"],
                        lang_code,
                        translation
                    )

                translations_done += 1
                print(f"    - {lang_code}: OK")

            except Exception as e:
                errors += 1
                print(f"    - {lang_code}: ERROR - {e}")

            # Rate limit
            await asyncio.sleep(1)

        # Delay between trials
        await asyncio.sleep(2)

    print(f"[{datetime.now()}] Translation complete.")
    print(f"  - Translations: {translations_done}")
    print(f"  - Errors: {errors}")

    return {
        "trials_processed": len(untranslated),
        "translations_done": translations_done,
        "errors": errors
    }


async def translate_single_trial(
    trial_id: int,
    languages: List[str] = None,
    db: Database = None
):
    """Translate a single trial to specified languages.

    Args:
        trial_id: Database trial ID
        languages: Target languages
        db: Database instance
    """
    if languages is None:
        languages = TIER1_LANGUAGES

    if not db:
        raise ValueError("Database required")

    # Get trial
    trial = await db.get_trial_by_id(trial_id)
    if not trial:
        raise ValueError(f"Trial {trial_id} not found")

    translator = TranslationService()
    glossary_service = GlossaryService(db)

    results = {}

    for lang_code in languages:
        try:
            glossary = await glossary_service.get_glossary(lang_code)

            translation = await translator.translate_trial(
                trial,
                lang_code,
                glossary
            )

            await db.save_translation(trial_id, lang_code, translation)
            results[lang_code] = "success"

        except Exception as e:
            results[lang_code] = f"error: {e}"

        await asyncio.sleep(1)

    return results


async def batch_translate(
    trial_ids: List[int],
    language: str,
    db: Database = None
):
    """Batch translate multiple trials to a single language.

    Args:
        trial_ids: List of trial IDs
        language: Target language
        db: Database instance
    """
    if not db:
        raise ValueError("Database required")

    translator = TranslationService()
    glossary_service = GlossaryService(db)
    glossary = await glossary_service.get_glossary(language)

    results = {"success": 0, "errors": 0}

    for trial_id in trial_ids:
        try:
            trial = await db.get_trial_by_id(trial_id)
            if not trial:
                continue

            translation = await translator.translate_trial(
                trial,
                language,
                glossary
            )

            await db.save_translation(trial_id, language, translation)
            results["success"] += 1

        except Exception as e:
            print(f"Error translating {trial_id}: {e}")
            results["errors"] += 1

        await asyncio.sleep(1)

    return results


if __name__ == "__main__":
    # Run directly for testing
    asyncio.run(translate_new_trials(limit=10))
