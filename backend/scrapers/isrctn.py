"""ISRCTN Registry scraper."""

from typing import List, Dict, Any, Optional
from datetime import datetime

from .base_scraper import BaseScraper


class ISRCTNScraper(BaseScraper):
    """Scraper for ISRCTN Registry.

    ISRCTN (International Standard Randomised Controlled Trial Number Registry)
    is a primary clinical trial registry recognized by WHO and ICMJE.

    API Documentation: https://www.isrctn.com/page/api
    """

    BASE_URL = "https://www.isrctn.com/api"

    def __init__(self):
        super().__init__()
        self.rate_limit = 2.0

    @property
    def source_name(self) -> str:
        return "isrctn"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        page: int = 1,
        page_size: int = 100,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search ISRCTN for trials.

        Args:
            condition: Medical condition to search for
            status: Trial status filter
            page: Page number
            page_size: Results per page

        Returns:
            List of raw trial data
        """
        trials = []

        params = {
            "q": condition,
            "page": page,
            "pageSize": min(page_size, 100),
            "format": "json"
        }

        # Add status filter
        if status:
            status_map = {
                "RECRUITING": "Recruiting",
                "NOT_YET_RECRUITING": "Not yet recruiting",
                "COMPLETED": "No longer recruiting",
                "TERMINATED": "Stopped"
            }
            for s in status:
                if s in status_map:
                    params["recruitmentStatus"] = status_map[s]
                    break

        try:
            response = await self._get(f"{self.BASE_URL}/query", params=params)
            data = response.json()

            items = data.get("items", [])
            for item in items:
                trials.append(item)

        except Exception as e:
            print(f"ISRCTN search error: {e}")

        return trials

    async def get_trial_by_id(self, isrctn_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific trial by ISRCTN ID.

        Args:
            isrctn_id: ISRCTN number (e.g., ISRCTN12345678)

        Returns:
            Trial data or None
        """
        # Ensure proper format
        if not isrctn_id.startswith("ISRCTN"):
            isrctn_id = f"ISRCTN{isrctn_id}"

        try:
            response = await self._get(f"{self.BASE_URL}/{isrctn_id}")
            return response.json()
        except Exception as e:
            print(f"ISRCTN fetch error: {e}")
            return None

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize ISRCTN data to common format."""
        # ISRCTN has a nested structure
        trial_data = raw_trial.get("trial", raw_trial)

        # Extract ISRCTN ID
        isrctn_id = trial_data.get("isrctn", "")
        if not isrctn_id.startswith("ISRCTN"):
            isrctn_id = f"ISRCTN{isrctn_id}"

        # Extract conditions
        conditions = []
        condition_data = trial_data.get("conditionBeingStudied", {})
        if isinstance(condition_data, dict):
            conditions = [condition_data.get("condition", "")]
        elif isinstance(condition_data, list):
            conditions = [c.get("condition", "") for c in condition_data]
        conditions = [c for c in conditions if c]

        # Extract countries
        countries = []
        sites = trial_data.get("sites", [])
        if sites:
            countries = list(set(site.get("country", "") for site in sites if site.get("country")))

        # Extract interventions
        interventions = trial_data.get("interventions", [])
        intervention_names = []
        if isinstance(interventions, list):
            intervention_names = [i.get("interventionName", "") for i in interventions if i.get("interventionName")]

        # Extract eligibility
        eligibility_parts = []
        inclusion = trial_data.get("participantInclusionCriteria", "")
        exclusion = trial_data.get("participantExclusionCriteria", "")
        if inclusion:
            eligibility_parts.append(f"Inclusion: {inclusion}")
        if exclusion:
            eligibility_parts.append(f"Exclusion: {exclusion}")
        eligibility = "\n".join(eligibility_parts)

        # Extract contact
        contacts = trial_data.get("contacts", [])
        primary_contact = contacts[0] if contacts else {}

        # Extract dates
        start_date = trial_data.get("overallTrialStartDate")
        end_date = trial_data.get("overallTrialEndDate")

        return {
            "nct_id": trial_data.get("nctId"),  # Some ISRCTN trials also have NCT IDs
            "eudract_id": trial_data.get("eudractNumber"),
            "who_id": None,
            "isrctn_id": isrctn_id,

            "title_original": trial_data.get("scientificTitle") or trial_data.get("publicTitle"),
            "summary_original": trial_data.get("plainEnglishSummary") or trial_data.get("trialAbstract"),
            "eligibility_original": eligibility,

            "condition": conditions,
            "intervention_type": trial_data.get("interventionType"),
            "intervention_name": ", ".join(intervention_names) if intervention_names else None,

            "phase": trial_data.get("phase"),
            "status": self._normalize_status(trial_data.get("recruitmentStatus")),
            "enrollment_target": trial_data.get("targetNumberOfParticipants"),

            "start_date": start_date,
            "completion_date": end_date,

            "sponsor": trial_data.get("primarySponsor", {}).get("organisation"),
            "lead_sponsor_type": trial_data.get("primarySponsor", {}).get("type"),

            "location_countries": countries,
            "location_cities": [],
            "location_facilities": [site.get("name", "") for site in sites if site.get("name")],

            "contact_name": primary_contact.get("name"),
            "contact_email": primary_contact.get("email"),
            "contact_phone": primary_contact.get("phone"),

            "age_min": trial_data.get("participantMinAge"),
            "age_max": trial_data.get("participantMaxAge"),
            "gender": trial_data.get("participantGender"),

            "source_registry": self.source_name,
            "source_url": f"https://www.isrctn.com/{isrctn_id}",
            "source_ids": {"isrctn_id": isrctn_id},

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
            "no longer recruiting": "ACTIVE_NOT_RECRUITING",
            "completed": "COMPLETED",
            "stopped": "TERMINATED",
            "suspended": "SUSPENDED",
        }

        for key, value in status_map.items():
            if key in status_lower:
                return value

        return status.upper()
