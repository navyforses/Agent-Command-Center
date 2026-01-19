"""Base scraper class for all trial registries."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx
import asyncio


class BaseScraper(ABC):
    """Abstract base class for all trial scrapers."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.rate_limit = 3.0  # requests per second
        self._last_request_time = 0

    async def _rate_limit_wait(self):
        """Ensure we don't exceed rate limits."""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self._last_request_time
        min_interval = 1.0 / self.rate_limit

        if time_since_last < min_interval:
            await asyncio.sleep(min_interval - time_since_last)

        self._last_request_time = asyncio.get_event_loop().time()

    async def _get(self, url: str, params: Dict = None) -> httpx.Response:
        """Make a rate-limited GET request."""
        await self._rate_limit_wait()
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        return response

    async def _post(self, url: str, data: Dict = None, json: Dict = None) -> httpx.Response:
        """Make a rate-limited POST request."""
        await self._rate_limit_wait()
        response = await self.client.post(url, data=data, json=json)
        response.raise_for_status()
        return response

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Return the name of this data source."""
        pass

    @abstractmethod
    async def search(
        self,
        condition: str,
        status: List[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search for trials by condition.

        Args:
            condition: The medical condition to search for
            status: List of trial statuses to filter by
            **kwargs: Additional source-specific parameters

        Returns:
            List of raw trial data from the source
        """
        pass

    @abstractmethod
    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize trial data to common format.

        Args:
            raw_trial: Raw trial data from the source

        Returns:
            Normalized trial data with standard fields
        """
        pass

    async def get_recent_updates(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get trials updated in the last N days.

        Default implementation - override in subclasses if supported.
        """
        return []

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
