"""Medical news and discoveries scrapers."""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
import httpx


class BaseNewsScraper(ABC):
    """Base class for news scrapers."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    @property
    @abstractmethod
    def source_name(self) -> str:
        pass

    @abstractmethod
    async def search(self, query: str, days: int = 30) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        pass


class PubMedNewsScraper(BaseNewsScraper):
    """Scraper for PubMed articles and research results."""

    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    @property
    def source_name(self) -> str:
        return "pubmed"

    async def search(
        self,
        query: str,
        days: int = 30,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """Search PubMed for recent articles.

        Args:
            query: Search query
            days: Look back this many days
            max_results: Maximum results to return

        Returns:
            List of article data
        """
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        date_range = f"{start_date.strftime('%Y/%m/%d')}:{end_date.strftime('%Y/%m/%d')}[pdat]"

        # Search for IDs
        search_params = {
            "db": "pubmed",
            "term": f"({query}) AND {date_range}",
            "retmax": max_results,
            "retmode": "json",
            "sort": "relevance"
        }

        try:
            search_response = await self.client.get(
                f"{self.BASE_URL}/esearch.fcgi",
                params=search_params
            )
            search_data = search_response.json()

            id_list = search_data.get("esearchresult", {}).get("idlist", [])

            if not id_list:
                return []

            # Fetch article details
            fetch_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "json",
                "rettype": "abstract"
            }

            fetch_response = await self.client.get(
                f"{self.BASE_URL}/esummary.fcgi",
                params=fetch_params
            )
            fetch_data = fetch_response.json()

            articles = []
            result = fetch_data.get("result", {})

            for pmid in id_list:
                if pmid in result:
                    articles.append(result[pmid])

            return articles

        except Exception as e:
            print(f"PubMed search error: {e}")
            return []

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize PubMed article to common format."""
        # Parse publication date
        pub_date = None
        if "pubdate" in raw:
            try:
                pub_date = datetime.strptime(raw["pubdate"], "%Y %b %d")
            except:
                try:
                    pub_date = datetime.strptime(raw["pubdate"], "%Y %b")
                except:
                    pass

        # Get authors
        authors = []
        for author in raw.get("authors", []):
            authors.append(author.get("name", ""))

        return {
            "content_type": "research_result",
            "title": raw.get("title", ""),
            "summary": raw.get("abstract", raw.get("title", "")),
            "source": "PubMed",
            "source_url": f"https://pubmed.ncbi.nlm.nih.gov/{raw.get('uid', '')}/",
            "published_at": pub_date,
            "journal": raw.get("fulljournalname", raw.get("source", "")),
            "authors": authors[:5],  # First 5 authors
            "pmid": raw.get("uid"),
            "doi": raw.get("elocationid", "")
        }


class BioRxivScraper(BaseNewsScraper):
    """Scraper for bioRxiv/medRxiv preprints."""

    BASE_URL = "https://api.biorxiv.org"

    @property
    def source_name(self) -> str:
        return "biorxiv"

    async def search(
        self,
        query: str,
        days: int = 30,
        max_results: int = 30
    ) -> List[Dict[str, Any]]:
        """Search bioRxiv for recent preprints.

        Note: bioRxiv API is limited, we search by date range.
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # bioRxiv API format
        url = f"{self.BASE_URL}/details/biorxiv/{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"

        try:
            response = await self.client.get(url)
            data = response.json()

            articles = data.get("collection", [])

            # Filter by query (basic keyword match)
            query_lower = query.lower()
            filtered = [
                a for a in articles
                if query_lower in a.get("title", "").lower()
                or query_lower in a.get("abstract", "").lower()
            ]

            return filtered[:max_results]

        except Exception as e:
            print(f"bioRxiv search error: {e}")
            return []

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize bioRxiv preprint to common format."""
        pub_date = None
        if "date" in raw:
            try:
                pub_date = datetime.strptime(raw["date"], "%Y-%m-%d")
            except:
                pass

        return {
            "content_type": "discovery",
            "title": raw.get("title", ""),
            "summary": raw.get("abstract", "")[:500],
            "source": "bioRxiv (preprint)",
            "source_url": f"https://www.biorxiv.org/content/{raw.get('doi', '')}",
            "published_at": pub_date,
            "journal": "bioRxiv (preprint)",
            "authors": raw.get("authors", "").split("; ")[:5],
            "doi": raw.get("doi", ""),
            "is_preprint": True
        }


class FDANewsScraper(BaseNewsScraper):
    """Scraper for FDA drug approvals and news."""

    BASE_URL = "https://api.fda.gov/drug"

    @property
    def source_name(self) -> str:
        return "fda"

    async def search(
        self,
        query: str,
        days: int = 90,
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """Search FDA for drug approvals related to condition."""
        # Search drug labels that mention the condition
        params = {
            "search": f'indications_and_usage:"{query}"',
            "limit": max_results
        }

        try:
            response = await self.client.get(
                f"{self.BASE_URL}/label.json",
                params=params
            )
            data = response.json()

            return data.get("results", [])

        except Exception as e:
            print(f"FDA search error: {e}")
            return []

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize FDA data to common format."""
        openfda = raw.get("openfda", {})
        brand_names = openfda.get("brand_name", ["Unknown"])
        manufacturer = openfda.get("manufacturer_name", ["Unknown"])

        return {
            "content_type": "drug_approval",
            "title": f"FDA: {brand_names[0]}",
            "summary": raw.get("indications_and_usage", [""])[0][:500] if isinstance(raw.get("indications_and_usage"), list) else "",
            "source": "FDA",
            "source_url": f"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query={brand_names[0]}",
            "manufacturer": manufacturer[0] if manufacturer else "Unknown",
            "drug_name": brand_names[0] if brand_names else "Unknown",
            "is_approved": True
        }


class ScienceDailyScraper(BaseNewsScraper):
    """Scraper for ScienceDaily news articles."""

    # Note: ScienceDaily doesn't have a public API
    # In production, you'd need to use RSS feed or web scraping

    @property
    def source_name(self) -> str:
        return "sciencedaily"

    async def search(
        self,
        query: str,
        days: int = 30,
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """Search ScienceDaily for news.

        Note: This is a placeholder. In production, parse RSS feed:
        https://www.sciencedaily.com/rss/health_medicine.xml
        """
        # RSS feed URL for health/medicine
        rss_url = "https://www.sciencedaily.com/rss/health_medicine.xml"

        # Would parse RSS here
        # For now, return empty
        return []

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize ScienceDaily article."""
        return {
            "content_type": "news",
            "title": raw.get("title", ""),
            "summary": raw.get("description", ""),
            "source": "ScienceDaily",
            "source_url": raw.get("link", ""),
            "published_at": raw.get("pubDate")
        }


class MedicalNewsAggregator:
    """Aggregates news from all sources."""

    def __init__(self):
        self.scrapers = {
            "pubmed": PubMedNewsScraper(),
            "biorxiv": BioRxivScraper(),
            "fda": FDANewsScraper(),
            "sciencedaily": ScienceDailyScraper()
        }

    async def search_all(
        self,
        query: str,
        days: int = 30,
        sources: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Search all news sources.

        Args:
            query: Search query
            days: Look back period
            sources: Specific sources to search (None = all)

        Returns:
            Combined list of news items
        """
        import asyncio

        scrapers_to_use = self.scrapers
        if sources:
            scrapers_to_use = {k: v for k, v in self.scrapers.items() if k in sources}

        # Search all sources in parallel
        tasks = []
        for name, scraper in scrapers_to_use.items():
            tasks.append(self._search_source(name, scraper, query, days))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine and sort by date
        all_items = []
        for result in results:
            if isinstance(result, Exception):
                print(f"Search error: {result}")
                continue
            all_items.extend(result)

        # Sort by published date (newest first)
        all_items.sort(
            key=lambda x: x.get("published_at") or datetime.min,
            reverse=True
        )

        return all_items

    async def _search_source(
        self,
        name: str,
        scraper: BaseNewsScraper,
        query: str,
        days: int
    ) -> List[Dict[str, Any]]:
        """Search a single source and normalize results."""
        try:
            raw_results = await scraper.search(query, days)
            normalized = [scraper.normalize(r) for r in raw_results]
            return normalized
        except Exception as e:
            print(f"Error searching {name}: {e}")
            return []
