"""Database connection and utilities for Trial Navigator."""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncpg
from contextlib import asynccontextmanager

from config import settings


class Database:
    """Database connection manager."""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Create database connection pool."""
        if settings.database_url:
            self.pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=5,
                max_size=20
            )

    async def disconnect(self):
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()

    @asynccontextmanager
    async def acquire(self):
        """Acquire a connection from the pool."""
        async with self.pool.acquire() as conn:
            yield conn

    # Trial operations
    async def upsert_trial(self, trial: Dict[str, Any]) -> int:
        """Insert or update a trial record."""
        async with self.acquire() as conn:
            result = await conn.fetchrow("""
                INSERT INTO trials (
                    nct_id, eudract_id, who_id, isrctn_id,
                    title_original, summary_original, eligibility_original,
                    condition, intervention_type, intervention_name,
                    phase, status, enrollment_target,
                    start_date, completion_date,
                    sponsor, lead_sponsor_type,
                    location_countries, location_cities, location_facilities,
                    contact_name, contact_email, contact_phone,
                    age_min, age_max, gender,
                    source_registry, source_url, source_ids,
                    relevance_score, updated_at, last_fetched_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                    NOW(), NOW()
                )
                ON CONFLICT (nct_id) DO UPDATE SET
                    title_original = EXCLUDED.title_original,
                    summary_original = EXCLUDED.summary_original,
                    status = EXCLUDED.status,
                    updated_at = NOW(),
                    last_fetched_at = NOW()
                RETURNING id
            """,
                trial.get('nct_id'),
                trial.get('eudract_id'),
                trial.get('who_id'),
                trial.get('isrctn_id'),
                trial.get('title_original'),
                trial.get('summary_original'),
                trial.get('eligibility_original'),
                trial.get('condition', []),
                trial.get('intervention_type'),
                trial.get('intervention_name'),
                trial.get('phase'),
                trial.get('status'),
                trial.get('enrollment_target'),
                trial.get('start_date'),
                trial.get('completion_date'),
                trial.get('sponsor'),
                trial.get('lead_sponsor_type'),
                trial.get('location_countries', []),
                trial.get('location_cities', []),
                trial.get('location_facilities', []),
                trial.get('contact_name'),
                trial.get('contact_email'),
                trial.get('contact_phone'),
                trial.get('age_min'),
                trial.get('age_max'),
                trial.get('gender'),
                trial.get('source_registry'),
                trial.get('source_url'),
                trial.get('source_ids'),
                trial.get('relevance_score', 0.0)
            )
            return result['id'] if result else None

    async def get_trial_by_nct(self, nct_id: str) -> Optional[Dict]:
        """Get a trial by NCT ID."""
        async with self.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM trials WHERE nct_id = $1",
                nct_id
            )
            return dict(row) if row else None

    async def search_trials(
        self,
        query: str,
        filters: Optional[Dict] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict]:
        """Search trials with filters."""
        async with self.acquire() as conn:
            # Build query
            where_clauses = []
            params = []
            param_idx = 1

            if query:
                where_clauses.append(f"""
                    (title_original ILIKE ${param_idx}
                     OR summary_original ILIKE ${param_idx}
                     OR ${param_idx+1} = ANY(condition))
                """)
                params.extend([f"%{query}%", query])
                param_idx += 2

            if filters:
                if filters.get('status'):
                    where_clauses.append(f"status = ANY(${param_idx})")
                    params.append(filters['status'])
                    param_idx += 1

                if filters.get('phase'):
                    where_clauses.append(f"phase = ANY(${param_idx})")
                    params.append(filters['phase'])
                    param_idx += 1

                if filters.get('countries'):
                    where_clauses.append(f"location_countries && ${param_idx}")
                    params.append(filters['countries'])
                    param_idx += 1

            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

            rows = await conn.fetch(f"""
                SELECT * FROM trials
                WHERE {where_sql}
                ORDER BY relevance_score DESC, updated_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """, *params, limit, offset)

            return [dict(row) for row in rows]

    async def count_trials(self, query: str = None, filters: Dict = None) -> int:
        """Count trials matching criteria."""
        async with self.acquire() as conn:
            where_clauses = []
            params = []
            param_idx = 1

            if query:
                where_clauses.append(f"title_original ILIKE ${param_idx}")
                params.append(f"%{query}%")
                param_idx += 1

            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

            result = await conn.fetchval(
                f"SELECT COUNT(*) FROM trials WHERE {where_sql}",
                *params
            )
            return result or 0

    # Translation operations
    async def get_translation(
        self,
        trial_id: int,
        language_code: str
    ) -> Optional[Dict]:
        """Get cached translation for a trial."""
        async with self.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM trial_translations
                WHERE trial_id = $1 AND language_code = $2
            """, trial_id, language_code)
            return dict(row) if row else None

    async def save_translation(
        self,
        trial_id: int,
        language_code: str,
        translation: Dict
    ):
        """Save translation to cache."""
        async with self.acquire() as conn:
            await conn.execute("""
                INSERT INTO trial_translations (
                    trial_id, language_code,
                    title_translated, summary_translated, eligibility_translated,
                    translated_at, translation_model
                ) VALUES ($1, $2, $3, $4, $5, NOW(), 'gpt-4o')
                ON CONFLICT (trial_id, language_code) DO UPDATE SET
                    title_translated = EXCLUDED.title_translated,
                    summary_translated = EXCLUDED.summary_translated,
                    eligibility_translated = EXCLUDED.eligibility_translated,
                    translated_at = NOW()
            """,
                trial_id,
                language_code,
                translation.get('title_translated'),
                translation.get('summary_translated'),
                translation.get('eligibility_translated')
            )

    # Glossary operations
    async def get_glossary(self, language_code: str) -> Dict[str, str]:
        """Get medical glossary for a language."""
        async with self.acquire() as conn:
            rows = await conn.fetch("""
                SELECT term_english, term_translated
                FROM medical_glossary
                WHERE language_code = $1
            """, language_code)
            return {row['term_english']: row['term_translated'] for row in rows}

    # User operations
    async def get_users_for_digest(self, frequency: str) -> List[Dict]:
        """Get users who want email digests."""
        async with self.acquire() as conn:
            rows = await conn.fetch("""
                SELECT * FROM users
                WHERE email_frequency = $1
                  AND email_verified = true
            """, frequency)
            return [dict(row) for row in rows]

    async def get_untranslated_trials(self, limit: int = 100) -> List[Dict]:
        """Get trials that need translation."""
        async with self.acquire() as conn:
            rows = await conn.fetch("""
                SELECT t.* FROM trials t
                LEFT JOIN trial_translations tt ON t.id = tt.trial_id
                WHERE tt.id IS NULL
                ORDER BY t.created_at DESC
                LIMIT $1
            """, limit)
            return [dict(row) for row in rows]


# Global database instance
db = Database()


async def get_db() -> Database:
    """Dependency for database access."""
    return db
