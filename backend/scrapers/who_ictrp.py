"""WHO International Clinical Trials Registry Platform scraper."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import csv
import io

from .base_scraper import BaseScraper


class WHOICTRPScraper(BaseScraper):
    """Scraper for WHO ICTRP (International Clinical Trials Registry Platform).

    WHO ICTRP aggregates data from 17 primary registries worldwide.
    Data is available via weekly CSV exports.
    """

    SEARCH_URL = "https://trialsearch.who.int/Trial2.aspx"
    EXPORT_URL = "https://trialsearch.who.int/TrialService.asmx"

    def __init__(self):
        super().__init__()
        self.rate_limit = 1.0  # Be gentle with WHO servers

    @property
    def source_name(self) -> str:
        return "who_ictrp"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search WHO ICTRP for trials.

        Note: WHO ICTRP doesn't have a public API, so we use web scraping
        or rely on their weekly data exports.
        """
        # WHO ICTRP search is complex - they use a SOAP service
        # For now, we'll implement basic search via their export functionality

        trials = []

        try:
            # Try to fetch from the search interface
            params = {
                "SearchText": condition,
                "Recruitment": "ALL" if not status else status[0]
            }

            response = await self._get(self.SEARCH_URL, params=params)

            # Parse the HTML response (simplified)
            # In production, you'd use BeautifulSoup here
            # For now, return empty and rely on CSV imports

        except Exception as e:
            print(f"WHO ICTRP search error: {e}")

        return trials

    async def parse_csv_export(self, csv_content: str) -> List[Dict[str, Any]]:
        """Parse WHO ICTRP CSV export data.

        Args:
            csv_content: Raw CSV content from WHO ICTRP export

        Returns:
            List of parsed trial records
        """
        trials = []

        reader = csv.DictReader(io.StringIO(csv_content))

        for row in reader:
            trials.append({
                "who_id": row.get("TrialID", ""),
                "title": row.get("Public title", "") or row.get("Scientific title", ""),
                "summary": row.get("Primary objective", ""),
                "condition": row.get("Health condition(s) or problem(s) studied", ""),
                "intervention": row.get("Intervention(s)", ""),
                "status": row.get("Recruitment Status", ""),
                "phase": row.get("Study type", ""),
                "sponsor": row.get("Primary Sponsor", ""),
                "countries": row.get("Countries of recruitment", ""),
                "contact_name": row.get("Contact for public queries", ""),
                "contact_email": row.get("Email", ""),
                "date_registered": row.get("Date of registration", ""),
                "source_registry": row.get("Source Register", ""),
                "url": row.get("URL", ""),
                "age_min": row.get("Minimum Age", ""),
                "age_max": row.get("Maximum Age", ""),
                "gender": row.get("Gender", ""),
                "eligibility": row.get("Key inclusion/exclusion criteria", ""),
            })

        return trials

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize WHO ICTRP data to common format."""
        # Parse countries (comma-separated)
        countries_str = raw_trial.get("countries", "")
        countries = [c.strip() for c in countries_str.split(",") if c.strip()]

        # Parse condition (may be semicolon-separated)
        condition_str = raw_trial.get("condition", "")
        conditions = [c.strip() for c in condition_str.split(";") if c.strip()]

        who_id = raw_trial.get("who_id", "")

        return {
            "nct_id": None,
            "eudract_id": None,
            "who_id": who_id,
            "isrctn_id": None,

            "title_original": raw_trial.get("title"),
            "summary_original": raw_trial.get("summary"),
            "eligibility_original": raw_trial.get("eligibility"),

            "condition": conditions,
            "intervention_type": None,
            "intervention_name": raw_trial.get("intervention"),

            "phase": raw_trial.get("phase"),
            "status": self._normalize_status(raw_trial.get("status")),
            "enrollment_target": None,

            "start_date": raw_trial.get("date_registered"),
            "completion_date": None,

            "sponsor": raw_trial.get("sponsor"),
            "lead_sponsor_type": None,

            "location_countries": countries,
            "location_cities": [],
            "location_facilities": [],

            "contact_name": raw_trial.get("contact_name"),
            "contact_email": raw_trial.get("contact_email"),
            "contact_phone": None,

            "age_min": raw_trial.get("age_min"),
            "age_max": raw_trial.get("age_max"),
            "gender": raw_trial.get("gender"),

            "source_registry": f"who_ictrp ({raw_trial.get('source_registry', '')})",
            "source_url": raw_trial.get("url"),
            "source_ids": {"who_id": who_id},

            "_sources": [self.source_name]
        }

    def _normalize_status(self, status: str) -> str:
        """Normalize status to standard format."""
        if not status:
            return "UNKNOWN"

        status_lower = status.lower()

        status_map = {
            "recruiting": "RECRUITING",
            "not yet recruiting": "NOT_YET_RECRUITING",
            "completed": "COMPLETED",
            "terminated": "TERMINATED",
            "suspended": "SUSPENDED",
            "active, not recruiting": "ACTIVE_NOT_RECRUITING",
            "withdrawn": "WITHDRAWN",
        }

        for key, value in status_map.items():
            if key in status_lower:
                return value

        return status.upper()
