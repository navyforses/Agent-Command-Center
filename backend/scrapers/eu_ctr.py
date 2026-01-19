"""EU Clinical Trials Register scraper."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import re

from bs4 import BeautifulSoup

from .base_scraper import BaseScraper


class EUCTRScraper(BaseScraper):
    """Scraper for EU Clinical Trials Register.

    The EU CTR doesn't have a public API, so we use web scraping.
    https://www.clinicaltrialsregister.eu/
    """

    BASE_URL = "https://www.clinicaltrialsregister.eu"
    SEARCH_URL = f"{BASE_URL}/ctr-search/search"

    def __init__(self):
        super().__init__()
        self.rate_limit = 1.0  # Be respectful

    @property
    def source_name(self) -> str:
        return "eu_ctr"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        page: int = 1,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search EU CTR for trials.

        Args:
            condition: Medical condition to search for
            status: Trial status filter (ongoing, completed, etc.)
            page: Page number for pagination

        Returns:
            List of raw trial data
        """
        trials = []

        params = {
            "query": condition,
            "page": page,
            "mode": "basic"
        }

        # Add status filter
        if status:
            status_map = {
                "RECRUITING": "ongoing",
                "COMPLETED": "completed",
                "TERMINATED": "terminated"
            }
            for s in status:
                if s in status_map:
                    params["status"] = status_map[s]
                    break

        try:
            response = await self._get(self.SEARCH_URL, params=params)
            soup = BeautifulSoup(response.text, "lxml")

            # Find trial entries
            trial_divs = soup.find_all("div", class_="result")

            for div in trial_divs:
                trial = self._parse_search_result(div)
                if trial:
                    trials.append(trial)

        except Exception as e:
            print(f"EU CTR search error: {e}")

        return trials

    async def get_trial_details(self, eudract_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information for a specific trial.

        Args:
            eudract_id: EudraCT number (e.g., 2020-001234-56)

        Returns:
            Detailed trial information
        """
        url = f"{self.BASE_URL}/ctr-search/trial/{eudract_id}/GB"

        try:
            response = await self._get(url)
            soup = BeautifulSoup(response.text, "lxml")

            return self._parse_detail_page(soup, eudract_id)

        except Exception as e:
            print(f"EU CTR detail fetch error: {e}")
            return None

    def _parse_search_result(self, div) -> Optional[Dict[str, Any]]:
        """Parse a single search result div."""
        try:
            # Extract EudraCT number
            eudract_link = div.find("a", class_="eudract-number")
            if not eudract_link:
                return None

            eudract_id = eudract_link.text.strip()

            # Extract title
            title_elem = div.find("span", class_="title")
            title = title_elem.text.strip() if title_elem else ""

            # Extract sponsor
            sponsor_elem = div.find("span", class_="sponsor")
            sponsor = sponsor_elem.text.strip() if sponsor_elem else ""

            # Extract status
            status_elem = div.find("span", class_="status")
            status = status_elem.text.strip() if status_elem else ""

            # Extract condition
            condition_elem = div.find("span", class_="condition")
            condition = condition_elem.text.strip() if condition_elem else ""

            return {
                "eudract_id": eudract_id,
                "title": title,
                "sponsor": sponsor,
                "status": status,
                "condition": condition,
                "url": f"{self.BASE_URL}/ctr-search/trial/{eudract_id}/GB"
            }

        except Exception as e:
            print(f"Error parsing EU CTR result: {e}")
            return None

    def _parse_detail_page(self, soup, eudract_id: str) -> Dict[str, Any]:
        """Parse a trial detail page."""
        trial = {
            "eudract_id": eudract_id,
            "title": "",
            "summary": "",
            "condition": "",
            "intervention": "",
            "phase": "",
            "status": "",
            "sponsor": "",
            "countries": [],
            "eligibility": "",
            "age_min": "",
            "age_max": "",
            "gender": "",
        }

        try:
            # Title
            title_elem = soup.find("td", {"id": "title"})
            if title_elem:
                trial["title"] = title_elem.text.strip()

            # Find sections by header text
            sections = soup.find_all("tr", class_="tricell")

            for section in sections:
                header = section.find("td", class_="first")
                value = section.find("td", class_="second")

                if not header or not value:
                    continue

                header_text = header.text.strip().lower()
                value_text = value.text.strip()

                if "objective" in header_text:
                    trial["summary"] = value_text
                elif "medical condition" in header_text:
                    trial["condition"] = value_text
                elif "intervention" in header_text or "treatment" in header_text:
                    trial["intervention"] = value_text
                elif "phase" in header_text:
                    trial["phase"] = value_text
                elif "sponsor" in header_text:
                    trial["sponsor"] = value_text
                elif "age" in header_text and "minimum" in header_text:
                    trial["age_min"] = value_text
                elif "age" in header_text and "maximum" in header_text:
                    trial["age_max"] = value_text
                elif "gender" in header_text or "sex" in header_text:
                    trial["gender"] = value_text
                elif "inclusion" in header_text or "exclusion" in header_text:
                    trial["eligibility"] += value_text + "\n"

        except Exception as e:
            print(f"Error parsing EU CTR detail: {e}")

        trial["url"] = f"{self.BASE_URL}/ctr-search/trial/{eudract_id}/GB"
        return trial

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize EU CTR data to common format."""
        # Parse condition
        condition_str = raw_trial.get("condition", "")
        conditions = [c.strip() for c in condition_str.split(";") if c.strip()]
        if not conditions and condition_str:
            conditions = [condition_str]

        # Parse countries from the URL or content
        countries = raw_trial.get("countries", [])
        if isinstance(countries, str):
            countries = [c.strip() for c in countries.split(",") if c.strip()]

        eudract_id = raw_trial.get("eudract_id", "")

        return {
            "nct_id": None,
            "eudract_id": eudract_id,
            "who_id": None,
            "isrctn_id": None,

            "title_original": raw_trial.get("title"),
            "summary_original": raw_trial.get("summary"),
            "eligibility_original": raw_trial.get("eligibility"),

            "condition": conditions,
            "intervention_type": None,
            "intervention_name": raw_trial.get("intervention"),

            "phase": self._normalize_phase(raw_trial.get("phase")),
            "status": self._normalize_status(raw_trial.get("status")),
            "enrollment_target": None,

            "start_date": None,
            "completion_date": None,

            "sponsor": raw_trial.get("sponsor"),
            "lead_sponsor_type": None,

            "location_countries": countries,
            "location_cities": [],
            "location_facilities": [],

            "contact_name": None,
            "contact_email": None,
            "contact_phone": None,

            "age_min": raw_trial.get("age_min"),
            "age_max": raw_trial.get("age_max"),
            "gender": raw_trial.get("gender"),

            "source_registry": self.source_name,
            "source_url": raw_trial.get("url"),
            "source_ids": {"eudract_id": eudract_id},

            "_sources": [self.source_name]
        }

    def _normalize_phase(self, phase: str) -> Optional[str]:
        """Normalize phase to standard format."""
        if not phase:
            return None

        phase_lower = phase.lower()

        if "i" in phase_lower and "ii" not in phase_lower:
            return "PHASE1"
        elif "ii" in phase_lower and "iii" not in phase_lower:
            return "PHASE2"
        elif "iii" in phase_lower and "iv" not in phase_lower:
            return "PHASE3"
        elif "iv" in phase_lower:
            return "PHASE4"

        return phase

    def _normalize_status(self, status: str) -> str:
        """Normalize status to standard format."""
        if not status:
            return "UNKNOWN"

        status_lower = status.lower()

        if "ongoing" in status_lower or "recruiting" in status_lower:
            return "RECRUITING"
        elif "completed" in status_lower:
            return "COMPLETED"
        elif "terminated" in status_lower:
            return "TERMINATED"
        elif "suspended" in status_lower:
            return "SUSPENDED"

        return status.upper()
