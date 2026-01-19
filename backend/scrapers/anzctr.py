"""Australian New Zealand Clinical Trials Registry (ANZCTR) scraper."""

from typing import List, Dict, Any, Optional
import xmltodict

from .base_scraper import BaseScraper


class ANZCTRScraper(BaseScraper):
    """Scraper for ANZCTR (Australian New Zealand Clinical Trials Registry).

    ANZCTR provides XML export functionality for trial data.
    """

    BASE_URL = "https://www.anzctr.org.au"
    SEARCH_URL = f"{BASE_URL}/TrialSearch.aspx"

    def __init__(self):
        super().__init__()
        self.rate_limit = 1.0  # Be respectful

    @property
    def source_name(self) -> str:
        return "anzctr"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search ANZCTR for trials.

        Args:
            condition: Medical condition to search for
            status: Trial status filter

        Returns:
            List of raw trial data
        """
        trials = []

        params = {
            "searchTxt": condition,
            "isBasic": "True"
        }

        try:
            # ANZCTR search returns XML
            response = await self._get(f"{self.BASE_URL}/Trial/Search", params=params)

            # Parse XML response
            if response.headers.get("content-type", "").startswith("application/xml"):
                data = xmltodict.parse(response.text)
                trial_list = data.get("trials", {}).get("trial", [])

                if isinstance(trial_list, dict):
                    trial_list = [trial_list]

                for trial in trial_list:
                    trials.append(trial)

        except Exception as e:
            print(f"ANZCTR search error: {e}")

        return trials

    async def get_trial_by_id(self, actrn_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific trial by ACTRN ID.

        Args:
            actrn_id: ACTRN number (e.g., ACTRN12620000123456)

        Returns:
            Trial data or None
        """
        try:
            # ANZCTR provides XML export for individual trials
            response = await self._get(f"{self.BASE_URL}/Trial/Registration/{actrn_id}/Export/xml")

            if response.headers.get("content-type", "").startswith("application/xml"):
                data = xmltodict.parse(response.text)
                return data.get("trial", data)

        except Exception as e:
            print(f"ANZCTR fetch error: {e}")

        return None

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize ANZCTR data to common format."""
        # Handle nested XML structure
        trial_data = raw_trial

        # Extract ACTRN ID
        actrn_id = trial_data.get("actrn", "") or trial_data.get("trial_id", "")

        # Extract conditions
        conditions = []
        health_condition = trial_data.get("healthcondition", {})
        if isinstance(health_condition, dict):
            conditions = [health_condition.get("healthcondition1", "")]
        elif isinstance(health_condition, list):
            conditions = [hc.get("healthcondition1", "") for hc in health_condition]
        conditions = [c for c in conditions if c]

        # Extract countries
        countries = []
        recruitment_countries = trial_data.get("recruitment_country", "")
        if recruitment_countries:
            countries = [c.strip() for c in recruitment_countries.split(",")]

        # Extract interventions
        interventions = trial_data.get("interventions", {})
        intervention_name = ""
        if isinstance(interventions, dict):
            intervention_name = interventions.get("interventions1", "")

        # Extract eligibility
        eligibility_parts = []
        inclusion = trial_data.get("eligibility", {}).get("inclusivecriteria", "")
        exclusion = trial_data.get("eligibility", {}).get("exclusivecriteria", "")
        if inclusion:
            eligibility_parts.append(f"Inclusion: {inclusion}")
        if exclusion:
            eligibility_parts.append(f"Exclusion: {exclusion}")
        eligibility = "\n".join(eligibility_parts)

        # Extract age
        eligibility_data = trial_data.get("eligibility", {})
        age_min = eligibility_data.get("inclusiveagemin", "")
        age_max = eligibility_data.get("inclusiveagemax", "")
        gender = eligibility_data.get("inclusivegender", "")

        # Extract sponsor
        sponsor_data = trial_data.get("sponsors", {})
        if isinstance(sponsor_data, dict):
            sponsor = sponsor_data.get("primarysponsorname", "")
        else:
            sponsor = ""

        # Extract contact
        contact_data = trial_data.get("contacts", {}).get("contact", {})
        if isinstance(contact_data, list):
            contact_data = contact_data[0] if contact_data else {}

        return {
            "nct_id": None,
            "eudract_id": None,
            "who_id": trial_data.get("who_id"),
            "isrctn_id": None,

            "title_original": trial_data.get("studytitle") or trial_data.get("scientifictitle"),
            "summary_original": trial_data.get("brief_summary") or trial_data.get("trialwebsite"),
            "eligibility_original": eligibility,

            "condition": conditions,
            "intervention_type": trial_data.get("intervention_type"),
            "intervention_name": intervention_name,

            "phase": trial_data.get("phase"),
            "status": self._normalize_status(trial_data.get("recruitmentstatus")),
            "enrollment_target": trial_data.get("target_size"),

            "start_date": trial_data.get("anticipatedstartdate"),
            "completion_date": trial_data.get("anticipatedenddate"),

            "sponsor": sponsor,
            "lead_sponsor_type": None,

            "location_countries": countries,
            "location_cities": [],
            "location_facilities": [],

            "contact_name": contact_data.get("name"),
            "contact_email": contact_data.get("email"),
            "contact_phone": contact_data.get("phone"),

            "age_min": age_min,
            "age_max": age_max,
            "gender": gender,

            "source_registry": self.source_name,
            "source_url": f"{self.BASE_URL}/Trial/Registration/{actrn_id}",
            "source_ids": {"actrn_id": actrn_id},

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
            "closed to recruitment": "ACTIVE_NOT_RECRUITING",
            "completed": "COMPLETED",
            "stopped": "TERMINATED",
            "suspended": "SUSPENDED",
            "withdrawn": "WITHDRAWN",
        }

        for key, value in status_map.items():
            if key in status_lower:
                return value

        return status.upper()
