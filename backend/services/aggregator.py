"""Trial aggregator service - combines results from all sources."""

import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

from scrapers import (
    ClinicalTrialsGovScraper,
    WHOICTRPScraper,
    EUCTRScraper,
    ISRCTNScraper,
    ANZCTRScraper,
    PubMedScraper,
    OrphanetScraper,
    OpenFDAScraper,
)
from .deduplicator import Deduplicator


class TrialAggregator:
    """Aggregates clinical trial data from multiple sources."""

    def __init__(self):
        self.scrapers = {
            "clinicaltrials.gov": ClinicalTrialsGovScraper(),
            "who_ictrp": WHOICTRPScraper(),
            "eu_ctr": EUCTRScraper(),
            "isrctn": ISRCTNScraper(),
            "anzctr": ANZCTRScraper(),
        }

        self.supplementary_scrapers = {
            "pubmed": PubMedScraper(),
            "orphanet": OrphanetScraper(),
            "openfda": OpenFDAScraper(),
        }

        self.deduplicator = Deduplicator()

    async def search_all_sources(
        self,
        query_terms: List[str],
        filters: Optional[Dict[str, Any]] = None,
        include_supplementary: bool = False,
        timeout: float = 30.0
    ) -> List[Dict[str, Any]]:
        """Search all sources in parallel and aggregate results.

        Args:
            query_terms: List of search terms (including translations/synonyms)
            filters: Optional filters (status, phase, countries, etc.)
            include_supplementary: Include PubMed, Orphanet, OpenFDA
            timeout: Maximum time to wait for all sources

        Returns:
            List of deduplicated trial records
        """
        # Create search tasks for each source
        tasks = []

        # Primary trial registries
        for source_name, scraper in self.scrapers.items():
            for term in query_terms:
                tasks.append(
                    self._search_source(source_name, scraper, term, filters)
                )

        # Supplementary sources (optional)
        if include_supplementary:
            for source_name, scraper in self.supplementary_scrapers.items():
                for term in query_terms:
                    tasks.append(
                        self._search_source(source_name, scraper, term, filters)
                    )

        # Run all searches in parallel with timeout
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            print(f"Search timed out after {timeout}s")
            results = []

        # Flatten results and filter errors
        all_trials = []
        for result in results:
            if isinstance(result, Exception):
                print(f"Search error: {result}")
                continue
            all_trials.extend(result)

        # Deduplicate
        unique_trials = self.deduplicator.deduplicate(all_trials)

        return unique_trials

    async def search_single_source(
        self,
        source_name: str,
        query: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search a single source.

        Args:
            source_name: Name of the source to search
            query: Search query
            filters: Optional filters

        Returns:
            List of normalized trial records
        """
        scraper = self.scrapers.get(source_name)
        if not scraper:
            scraper = self.supplementary_scrapers.get(source_name)

        if not scraper:
            raise ValueError(f"Unknown source: {source_name}")

        return await self._search_source(source_name, scraper, query, filters)

    async def _search_source(
        self,
        source_name: str,
        scraper,
        query: str,
        filters: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Search a single source and normalize results.

        Args:
            source_name: Name of the source
            scraper: Scraper instance
            query: Search query
            filters: Optional filters

        Returns:
            List of normalized trial records
        """
        try:
            # Extract status filter if provided
            status = None
            if filters and filters.get("status"):
                status = filters["status"]

            # Search the source
            raw_results = await scraper.search(query, status=status)

            # Normalize results
            normalized = []
            for raw in raw_results:
                try:
                    trial = scraper.normalize(raw)
                    trial["_sources"] = [source_name]
                    trial["_fetched_at"] = datetime.utcnow().isoformat()
                    normalized.append(trial)
                except Exception as e:
                    print(f"Error normalizing trial from {source_name}: {e}")

            return normalized

        except Exception as e:
            print(f"Error searching {source_name}: {e}")
            return []

    async def get_recent_updates(
        self,
        days: int = 7,
        sources: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get trials updated in the last N days.

        Args:
            days: Number of days to look back
            sources: Optional list of sources to check (default: all)

        Returns:
            List of recently updated trials
        """
        if sources is None:
            sources = list(self.scrapers.keys())

        tasks = []
        for source_name in sources:
            scraper = self.scrapers.get(source_name)
            if scraper:
                tasks.append(
                    self._get_source_updates(source_name, scraper, days)
                )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_trials = []
        for result in results:
            if isinstance(result, Exception):
                print(f"Update fetch error: {result}")
                continue
            all_trials.extend(result)

        return self.deduplicator.deduplicate(all_trials)

    async def _get_source_updates(
        self,
        source_name: str,
        scraper,
        days: int
    ) -> List[Dict[str, Any]]:
        """Get updates from a single source."""
        try:
            raw_results = await scraper.get_recent_updates(days)

            normalized = []
            for raw in raw_results:
                try:
                    trial = scraper.normalize(raw)
                    trial["_sources"] = [source_name]
                    normalized.append(trial)
                except Exception as e:
                    print(f"Error normalizing update from {source_name}: {e}")

            return normalized

        except Exception as e:
            print(f"Error getting updates from {source_name}: {e}")
            return []

    def get_source_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status information for all sources.

        Returns:
            Dictionary with source names and their status
        """
        status = {}

        for name, scraper in self.scrapers.items():
            status[name] = {
                "type": "primary",
                "name": scraper.source_name,
                "rate_limit": scraper.rate_limit,
                "available": True
            }

        for name, scraper in self.supplementary_scrapers.items():
            status[name] = {
                "type": "supplementary",
                "name": scraper.source_name,
                "rate_limit": scraper.rate_limit,
                "available": True
            }

        return status

    async def close(self):
        """Close all scraper connections."""
        for scraper in self.scrapers.values():
            await scraper.close()
        for scraper in self.supplementary_scrapers.values():
            await scraper.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
