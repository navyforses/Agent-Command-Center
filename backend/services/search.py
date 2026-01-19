"""Search service for clinical trials."""

from typing import List, Dict, Any, Optional

from .aggregator import TrialAggregator
from .translator import TranslationService
from .scoring import RelevanceScorer
from database import Database


class SearchService:
    """Unified search service for clinical trials."""

    def __init__(self, db: Database = None):
        self.db = db
        self.aggregator = TrialAggregator()
        self.translator = TranslationService()
        self.scorer = RelevanceScorer()

    async def search(
        self,
        query: str,
        language: str = "en",
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        per_page: int = 20,
        search_external: bool = True
    ) -> Dict[str, Any]:
        """Search for clinical trials.

        Args:
            query: Search query
            language: Language code for results
            filters: Optional filters (status, phase, countries, etc.)
            page: Page number
            per_page: Results per page
            search_external: Whether to search external sources

        Returns:
            Search results with total count and paginated trials
        """
        # 1. Expand query with synonyms and translations
        expanded_terms = await self.translator.expand_query(query, language)

        # 2. Search local database first
        local_results = []
        if self.db:
            local_results = await self.db.search_trials(
                query=query,
                filters=filters,
                limit=per_page * 3,  # Get extra for dedup
                offset=0
            )

        # 3. Search external sources if needed
        external_results = []
        if search_external and (not local_results or len(local_results) < per_page):
            external_results = await self.aggregator.search_all_sources(
                expanded_terms,
                filters=filters
            )

            # Store new external results in database
            if self.db and external_results:
                for trial in external_results:
                    await self.db.upsert_trial(trial)

        # 4. Combine and deduplicate
        all_trials = local_results + external_results

        # 5. Score relevance
        scored_trials = self.scorer.score_all(all_trials, query)

        # 6. Sort by relevance
        sorted_trials = sorted(
            scored_trials,
            key=lambda x: x.get("relevance_score", 0),
            reverse=True
        )

        # 7. Apply filters
        filtered_trials = self._apply_filters(sorted_trials, filters)

        # 8. Paginate
        total = len(filtered_trials)
        start = (page - 1) * per_page
        end = start + per_page
        page_results = filtered_trials[start:end]

        # 9. Translate if not English
        if language != "en":
            page_results = await self._translate_results(
                page_results, language
            )

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "results": page_results,
            "expanded_terms": expanded_terms
        }

    async def get_trial(
        self,
        trial_id: int = None,
        nct_id: str = None,
        language: str = "en"
    ) -> Optional[Dict[str, Any]]:
        """Get a single trial by ID.

        Args:
            trial_id: Database ID
            nct_id: NCT identifier
            language: Language for translation

        Returns:
            Trial data with optional translation
        """
        trial = None

        if self.db:
            if trial_id:
                trial = await self.db.get_trial_by_id(trial_id)
            elif nct_id:
                trial = await self.db.get_trial_by_nct(nct_id)

        # If not in database and we have NCT ID, fetch from external
        if not trial and nct_id:
            from scrapers import ClinicalTrialsGovScraper
            scraper = ClinicalTrialsGovScraper()
            raw = await scraper.get_by_nct_id(nct_id)
            if raw:
                trial = scraper.normalize(raw)
                # Store in database
                if self.db:
                    await self.db.upsert_trial(trial)

        if trial and language != "en":
            # Get or create translation
            trial = await self._translate_trial(trial, language)

        return trial

    def _apply_filters(
        self,
        trials: List[Dict[str, Any]],
        filters: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Apply filters to trial list.

        Args:
            trials: List of trials
            filters: Filters to apply

        Returns:
            Filtered list
        """
        if not filters:
            return trials

        filtered = trials

        # Status filter
        if filters.get("status"):
            status_set = set(filters["status"])
            filtered = [
                t for t in filtered
                if t.get("status") in status_set
            ]

        # Phase filter
        if filters.get("phase"):
            phase_set = set(filters["phase"])
            filtered = [
                t for t in filtered
                if any(p in (t.get("phase") or "") for p in phase_set)
            ]

        # Country filter
        if filters.get("countries"):
            country_set = set(filters["countries"])
            filtered = [
                t for t in filtered
                if set(t.get("location_countries", [])) & country_set
            ]

        # Age group filter
        if filters.get("age_group"):
            age_group = filters["age_group"]
            if age_group == "pediatric":
                filtered = [
                    t for t in filtered
                    if self._is_pediatric(t)
                ]
            elif age_group == "adult":
                filtered = [
                    t for t in filtered
                    if not self._is_pediatric(t)
                ]

        return filtered

    def _is_pediatric(self, trial: Dict[str, Any]) -> bool:
        """Check if trial is for pediatric population."""
        age_min = trial.get("age_min", "")
        age_max = trial.get("age_max", "")

        # Check if max age suggests pediatric
        if age_max:
            max_str = age_max.lower()
            if "year" in max_str:
                try:
                    max_years = int("".join(filter(str.isdigit, max_str)))
                    return max_years <= 18
                except ValueError:
                    pass

        # Check eligibility text for pediatric keywords
        eligibility = trial.get("eligibility_original", "").lower()
        pediatric_keywords = ["pediatric", "child", "infant", "neonatal", "neonate", "newborn"]

        return any(kw in eligibility for kw in pediatric_keywords)

    async def _translate_results(
        self,
        trials: List[Dict[str, Any]],
        language: str
    ) -> List[Dict[str, Any]]:
        """Translate trial results.

        Args:
            trials: List of trials
            language: Target language

        Returns:
            Trials with translations
        """
        glossary = None
        if self.db:
            glossary = await self.db.get_glossary(language)

        translated = []
        for trial in trials:
            # Check cache first
            cached = None
            if self.db and trial.get("id"):
                cached = await self.db.get_translation(trial["id"], language)

            if cached:
                trial.update(cached)
            else:
                # Translate on-demand
                translation = await self.translator.translate_trial(
                    trial, language, glossary
                )
                trial.update(translation)

                # Cache for future
                if self.db and trial.get("id"):
                    await self.db.save_translation(
                        trial["id"], language, translation
                    )

            translated.append(trial)

        return translated

    async def _translate_trial(
        self,
        trial: Dict[str, Any],
        language: str
    ) -> Dict[str, Any]:
        """Translate a single trial."""
        result = await self._translate_results([trial], language)
        return result[0] if result else trial

    async def close(self):
        """Clean up resources."""
        await self.aggregator.close()
