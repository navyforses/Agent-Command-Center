"""Database seed script for Trial Navigator.

Run this script to populate the database with initial test data.
Usage: python scripts/seed_database.py
"""

import asyncio
import sys
import os
from datetime import datetime, date, timedelta
from typing import Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db


async def seed_test_user() -> Optional[str]:
    """Create a test user."""
    async with db.acquire() as conn:
        result = await conn.fetchrow("""
            INSERT INTO users (
                email, primary_language, secondary_language,
                diagnosis_interests, location_preferences, age_category,
                subscription_tier, email_frequency, email_verified
            ) VALUES (
                'test@example.com', 'ka', 'en',
                ARRAY['cerebral palsy', 'HIE', 'epilepsy'],
                ARRAY['Georgia', 'Germany', 'USA'],
                'pediatric',
                'free', 'weekly', true
            )
            ON CONFLICT (email) DO UPDATE SET
                primary_language = EXCLUDED.primary_language
            RETURNING id
        """)
        return str(result['id']) if result else None


async def seed_patient_profile(user_id: str) -> Optional[int]:
    """Create a test patient profile."""
    async with db.acquire() as conn:
        result = await conn.fetchrow("""
            INSERT INTO patient_profiles (
                user_id, patient_name, date_of_birth, gender,
                country, city, willing_to_travel, travel_distance_km,
                primary_diagnosis, diagnosis_date, secondary_diagnoses,
                medical_history, current_treatments, past_treatments, allergies,
                ai_summary, extracted_conditions, extracted_keywords,
                age_category, preferred_language, notification_frequency, content_types
            ) VALUES (
                $1, 'ნიკა', '2020-05-15', 'male',
                'Georgia', 'Tbilisi', true, 5000,
                'Hypoxic-ischemic encephalopathy (HIE)', '2020-05-16',
                ARRAY['Cerebral palsy', 'Epilepsy'],
                'Born at 38 weeks via emergency C-section due to cord prolapse. Therapeutic hypothermia applied for 72 hours. Diagnosed with moderate HIE on day 3.',
                ARRAY['Physical therapy', 'Occupational therapy', 'Keppra for seizures'],
                ARRAY['NICU cooling therapy'],
                ARRAY[]::TEXT[],
                'A 5-year-old boy with moderate HIE from birth asphyxia, resulting in spastic diplegic cerebral palsy and controlled epilepsy. Currently receiving PT/OT and anticonvulsant therapy.',
                ARRAY['hypoxic-ischemic encephalopathy', 'HIE', 'cerebral palsy', 'epilepsy', 'birth asphyxia'],
                ARRAY['stem cell', 'neuroregeneration', 'cord blood', 'pediatric neurology', 'seizure', 'spasticity'],
                'pediatric', 'ka', 'weekly',
                ARRAY['clinical_trial', 'research_result', 'discovery']
            )
            ON CONFLICT DO NOTHING
            RETURNING id
        """, user_id)
        return result['id'] if result else None


async def seed_notification_settings(profile_id: int):
    """Create notification settings for profile."""
    async with db.acquire() as conn:
        await conn.execute("""
            INSERT INTO notification_settings (
                profile_id, email_enabled, push_enabled, sms_enabled,
                frequency, notify_trials, notify_results, notify_discoveries, notify_news,
                urgent_threshold, email_digest_day, email_digest_hour
            ) VALUES (
                $1, true, true, false,
                'weekly', true, true, true, false,
                85.0, 'sunday', 10
            )
            ON CONFLICT (profile_id) DO NOTHING
        """, profile_id)


async def seed_sample_trials():
    """Create sample clinical trials for testing."""
    trials = [
        {
            'nct_id': 'NCT05555555',
            'title_original': 'Umbilical Cord Blood Infusion for Children with Cerebral Palsy',
            'summary_original': 'A randomized, double-blind study to evaluate the safety and efficacy of autologous umbilical cord blood stem cell infusion in children with cerebral palsy. The study aims to assess improvements in motor function and cognitive development.',
            'eligibility_original': 'Ages 2-12 years, diagnosis of cerebral palsy, stored cord blood available, GMFCS level I-IV',
            'condition': ['cerebral palsy', 'HIE', 'motor dysfunction'],
            'intervention_type': 'Biological',
            'intervention_name': 'Autologous umbilical cord blood stem cells',
            'phase': 'Phase 2',
            'status': 'RECRUITING',
            'enrollment_target': 80,
            'start_date': date(2024, 6, 1),
            'completion_date': date(2026, 12, 31),
            'sponsor': 'Duke University Medical Center',
            'lead_sponsor_type': 'Academic',
            'location_countries': ['USA', 'Germany'],
            'location_cities': ['Durham', 'Munich'],
            'contact_email': 'cordblood@duke.edu',
            'age_min': '2 Years',
            'age_max': '12 Years',
            'gender': 'All',
            'source_registry': 'clinicaltrials.gov',
            'source_url': 'https://clinicaltrials.gov/study/NCT05555555',
            'relevance_score': 95.0
        },
        {
            'nct_id': 'NCT05666666',
            'title_original': 'Mesenchymal Stem Cell Therapy for Pediatric Hypoxic-Ischemic Encephalopathy',
            'summary_original': 'Phase I/II trial evaluating the safety and preliminary efficacy of intravenous mesenchymal stem cells (MSCs) in children with HIE-related brain injury.',
            'eligibility_original': 'Ages 1-10 years, documented HIE diagnosis, stable medical condition',
            'condition': ['hypoxic-ischemic encephalopathy', 'HIE', 'perinatal brain injury'],
            'intervention_type': 'Biological',
            'intervention_name': 'Allogeneic mesenchymal stem cells',
            'phase': 'Phase 1/Phase 2',
            'status': 'RECRUITING',
            'enrollment_target': 30,
            'start_date': date(2024, 3, 1),
            'completion_date': date(2026, 6, 30),
            'sponsor': 'Children\'s Hospital of Georgia',
            'lead_sponsor_type': 'Academic',
            'location_countries': ['USA', 'Georgia'],
            'location_cities': ['Augusta', 'Tbilisi'],
            'contact_email': 'stemcells@chog.org',
            'age_min': '1 Year',
            'age_max': '10 Years',
            'gender': 'All',
            'source_registry': 'clinicaltrials.gov',
            'source_url': 'https://clinicaltrials.gov/study/NCT05666666',
            'relevance_score': 98.0
        },
        {
            'nct_id': 'NCT05777777',
            'title_original': 'Novel Anti-Epileptic Drug for Refractory Pediatric Epilepsy',
            'summary_original': 'A multicenter study evaluating a new generation anti-epileptic medication in children with drug-resistant epilepsy.',
            'eligibility_original': 'Ages 4-17 years, diagnosis of epilepsy, failed at least 2 anti-epileptic drugs',
            'condition': ['epilepsy', 'refractory epilepsy', 'seizure disorder'],
            'intervention_type': 'Drug',
            'intervention_name': 'XYZ-123 (investigational anti-epileptic)',
            'phase': 'Phase 3',
            'status': 'RECRUITING',
            'enrollment_target': 200,
            'start_date': date(2024, 1, 15),
            'completion_date': date(2026, 3, 31),
            'sponsor': 'NeuroPharma Inc.',
            'lead_sponsor_type': 'Industry',
            'location_countries': ['USA', 'UK', 'Germany', 'Poland'],
            'location_cities': ['Boston', 'London', 'Berlin', 'Warsaw'],
            'contact_email': 'epilepsy.trial@neuropharma.com',
            'age_min': '4 Years',
            'age_max': '17 Years',
            'gender': 'All',
            'source_registry': 'clinicaltrials.gov',
            'source_url': 'https://clinicaltrials.gov/study/NCT05777777',
            'relevance_score': 75.0
        }
    ]

    for trial in trials:
        await db.upsert_trial(trial)

    print(f"Seeded {len(trials)} sample trials")


async def seed_sample_news():
    """Create sample medical news items."""
    async with db.acquire() as conn:
        news_items = [
            {
                'external_id': 'pubmed_12345678',
                'title': 'Breakthrough in Stem Cell Therapy Shows Promise for Cerebral Palsy',
                'summary': 'New research from Duke University demonstrates significant improvements in motor function following cord blood stem cell infusions in children with cerebral palsy.',
                'source': 'pubmed',
                'source_url': 'https://pubmed.ncbi.nlm.nih.gov/12345678',
                'content_type': 'research_result',
                'conditions': ['cerebral palsy', 'CP'],
                'keywords': ['stem cells', 'cord blood', 'motor function', 'pediatric'],
                'published_at': datetime.now() - timedelta(days=3),
                'relevance_score': 92.0
            },
            {
                'external_id': 'biorxiv_98765432',
                'title': 'Novel Neural Regeneration Pathway Discovered in HIE Models',
                'summary': 'Scientists identify a new molecular pathway that could lead to therapies for hypoxic-ischemic brain injury, showing restoration of neural connections in animal models.',
                'source': 'biorxiv',
                'source_url': 'https://www.biorxiv.org/content/10.1101/2024.98765432',
                'content_type': 'discovery',
                'conditions': ['hypoxic-ischemic encephalopathy', 'HIE', 'brain injury'],
                'keywords': ['neural regeneration', 'molecular pathway', 'neuroprotection'],
                'published_at': datetime.now() - timedelta(days=7),
                'relevance_score': 88.0
            },
            {
                'external_id': 'fda_news_001',
                'title': 'FDA Grants Breakthrough Therapy Designation for Pediatric Epilepsy Drug',
                'summary': 'The FDA has granted breakthrough therapy designation to a new anti-seizure medication showing exceptional results in children with refractory epilepsy.',
                'source': 'fda',
                'source_url': 'https://www.fda.gov/news-events/press-announcements/2024-breakthrough',
                'content_type': 'drug_approval',
                'conditions': ['epilepsy', 'seizure disorder'],
                'keywords': ['FDA', 'breakthrough therapy', 'anti-seizure', 'pediatric'],
                'published_at': datetime.now() - timedelta(days=14),
                'relevance_score': 78.0
            }
        ]

        for item in news_items:
            await conn.execute("""
                INSERT INTO medical_news (
                    external_id, title, summary, source, source_url,
                    content_type, conditions, keywords, published_at, relevance_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (external_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    summary = EXCLUDED.summary
            """,
                item['external_id'],
                item['title'],
                item['summary'],
                item['source'],
                item['source_url'],
                item['content_type'],
                item['conditions'],
                item['keywords'],
                item['published_at'],
                item['relevance_score']
            )

        print(f"Seeded {len(news_items)} sample news items")


async def seed_georgian_translations():
    """Add Georgian translations for sample trials."""
    async with db.acquire() as conn:
        # Get trial IDs
        rows = await conn.fetch("SELECT id, nct_id FROM trials")

        translations = {
            'NCT05555555': {
                'title': 'ჭიპლის სისხლის ინფუზია ცერებრული დამბლით დაავადებული ბავშვებისთვის',
                'summary': 'რანდომიზებული, ორმაგად ბრმა კვლევა აუტოლოგიური ჭიპლის სისხლის ღეროვანი უჯრედების ინფუზიის უსაფრთხოებისა და ეფექტურობის შესაფასებლად ცერებრული დამბლით დაავადებულ ბავშვებში.',
                'eligibility': 'ასაკი 2-12 წელი, ცერებრული დამბლის დიაგნოზი, შენახული ჭიპლის სისხლი, GMFCS დონე I-IV'
            },
            'NCT05666666': {
                'title': 'მეზენქიმური ღეროვანი უჯრედების თერაპია პედიატრიული ჰიპოქსიურ-იშემიური ენცეფალოპათიისთვის',
                'summary': 'ფაზა I/II კვლევა ინტრავენური მეზენქიმური ღეროვანი უჯრედების უსაფრთხოებისა და წინასწარი ეფექტურობის შესაფასებლად HIE-თან დაკავშირებული თავის ტვინის დაზიანების მქონე ბავშვებში.',
                'eligibility': 'ასაკი 1-10 წელი, დოკუმენტირებული HIE დიაგნოზი, სტაბილური სამედიცინო მდგომარეობა'
            },
            'NCT05777777': {
                'title': 'ახალი ანტიეპილეფსიური პრეპარატი რეფრაქტერული პედიატრიული ეპილეფსიისთვის',
                'summary': 'მრავალცენტრიანი კვლევა ახალი თაობის ანტიეპილეფსიური მედიკამენტის შესაფასებლად მედიკამენტებისადმი რეზისტენტული ეპილეფსიის მქონე ბავშვებში.',
                'eligibility': 'ასაკი 4-17 წელი, ეპილეფსიის დიაგნოზი, მინიმუმ 2 ანტიეპილეფსიური პრეპარატის უეფექტობა'
            }
        }

        for row in rows:
            if row['nct_id'] in translations:
                trans = translations[row['nct_id']]
                await conn.execute("""
                    INSERT INTO trial_translations (
                        trial_id, language_code,
                        title_translated, summary_translated, eligibility_translated
                    ) VALUES ($1, 'ka', $2, $3, $4)
                    ON CONFLICT (trial_id, language_code) DO UPDATE SET
                        title_translated = EXCLUDED.title_translated,
                        summary_translated = EXCLUDED.summary_translated,
                        eligibility_translated = EXCLUDED.eligibility_translated
                """,
                    row['id'],
                    trans['title'],
                    trans['summary'],
                    trans['eligibility']
                )

        print(f"Seeded Georgian translations for {len(translations)} trials")


async def main():
    """Run all seed functions."""
    print("=" * 50)
    print("Trial Navigator Database Seeder")
    print("=" * 50)

    try:
        # Connect to database
        print("\n1. Connecting to database...")
        await db.connect()
        print("   Connected!")

        # Seed test user
        print("\n2. Creating test user...")
        user_id = await seed_test_user()
        if user_id:
            print(f"   Created user: {user_id}")

        # Seed patient profile
        print("\n3. Creating patient profile...")
        if user_id:
            profile_id = await seed_patient_profile(user_id)
            if profile_id:
                print(f"   Created profile: {profile_id}")

                # Seed notification settings
                print("\n4. Creating notification settings...")
                await seed_notification_settings(profile_id)
                print("   Done!")

        # Seed sample trials
        print("\n5. Seeding sample trials...")
        await seed_sample_trials()

        # Seed Georgian translations
        print("\n6. Seeding Georgian translations...")
        await seed_georgian_translations()

        # Seed sample news
        print("\n7. Seeding sample news...")
        await seed_sample_news()

        print("\n" + "=" * 50)
        print("Database seeding completed successfully!")
        print("=" * 50)

        # Print summary
        async with db.acquire() as conn:
            users = await conn.fetchval("SELECT COUNT(*) FROM users")
            profiles = await conn.fetchval("SELECT COUNT(*) FROM patient_profiles")
            trials = await conn.fetchval("SELECT COUNT(*) FROM trials")
            translations = await conn.fetchval("SELECT COUNT(*) FROM trial_translations")
            news = await conn.fetchval("SELECT COUNT(*) FROM medical_news")

            print(f"\nDatabase Summary:")
            print(f"  - Users: {users}")
            print(f"  - Patient Profiles: {profiles}")
            print(f"  - Clinical Trials: {trials}")
            print(f"  - Translations: {translations}")
            print(f"  - Medical News: {news}")

    except Exception as e:
        print(f"\nError: {e}")
        raise
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
