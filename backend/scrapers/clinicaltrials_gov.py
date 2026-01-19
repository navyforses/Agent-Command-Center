"""ClinicalTrials.gov API scraper."""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from .base_scraper import BaseScraper


class ClinicalTrialsGovScraper(BaseScraper):
    """Scraper for ClinicalTrials.gov API v2."""

    BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

    def __init__(self):
        super().__init__()
        self.rate_limit = 3.0  # 3 requests per second

    @property
    def source_name(self) -> str:
        return "clinicaltrials.gov"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        page_size: int = 100,
        page_token: Optional[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search for clinical trials by condition.

        Args:
            condition: Medical condition to search for
            status: List of statuses (RECRUITING, NOT_YET_RECRUITING, etc.)
            page_size: Number of results per page (max 1000)
            page_token: Token for pagination

        Returns:
            List of raw trial data
        """
        if status is None:
            status = ["RECRUITING", "NOT_YET_RECRUITING", "ACTIVE_NOT_RECRUITING"]

        params = {
            "query.cond": condition,
            "filter.overallStatus": ",".join(status),
            "pageSize": min(page_size, 1000),
            "format": "json",
            "fields": (
                "NCTId,BriefTitle,OfficialTitle,BriefSummary,DetailedDescription,"
                "Condition,InterventionType,InterventionName,InterventionDescription,"
                "Phase,OverallStatus,EnrollmentCount,EnrollmentType,"
                "StartDate,StartDateType,CompletionDate,CompletionDateType,"
                "LeadSponsorName,LeadSponsorClass,"
                "LocationCountry,LocationCity,LocationFacility,LocationStatus,"
                "CentralContactName,CentralContactEMail,CentralContactPhone,"
                "EligibilityCriteria,MinimumAge,MaximumAge,Sex,HealthyVolunteers,"
                "StudyType,PrimaryOutcomeMeasure,SecondaryOutcomeMeasure"
            )
        }

        if page_token:
            params["pageToken"] = page_token

        response = await self._get(self.BASE_URL, params=params)
        data = response.json()

        return data.get("studies", [])

    async def search_all(
        self,
        condition: str,
        status: List[str] = None,
        max_results: int = 1000
    ) -> List[Dict[str, Any]]:
        """Search with automatic pagination to get all results.

        Args:
            condition: Medical condition to search for
            status: List of statuses to filter by
            max_results: Maximum number of results to return

        Returns:
            List of all matching trials
        """
        all_trials = []
        page_token = None

        while len(all_trials) < max_results:
            params = {
                "query.cond": condition,
                "pageSize": min(100, max_results - len(all_trials)),
                "format": "json"
            }

            if status:
                params["filter.overallStatus"] = ",".join(status)

            if page_token:
                params["pageToken"] = page_token

            response = await self._get(self.BASE_URL, params=params)
            data = response.json()

            studies = data.get("studies", [])
            if not studies:
                break

            all_trials.extend(studies)
            page_token = data.get("nextPageToken")

            if not page_token:
                break

        return all_trials[:max_results]

    async def get_recent_updates(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get trials updated in the last N days."""
        date_from = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        all_trials = []
        page_token = None

        while True:
            params = {
                "filter.lastUpdatePostDate": f"[{date_from},]",
                "pageSize": 1000,
                "format": "json"
            }

            if page_token:
                params["pageToken"] = page_token

            response = await self._get(self.BASE_URL, params=params)
            data = response.json()

            studies = data.get("studies", [])
            all_trials.extend(studies)

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        return all_trials

    async def get_by_nct_id(self, nct_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific trial by NCT ID."""
        url = f"{self.BASE_URL}/{nct_id}"
        try:
            response = await self._get(url)
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize ClinicalTrials.gov data to common format."""
        protocol = raw_trial.get("protocolSection", {})

        id_module = protocol.get("identificationModule", {})
        status_module = protocol.get("statusModule", {})
        desc_module = protocol.get("descriptionModule", {})
        design_module = protocol.get("designModule", {})
        eligibility_module = protocol.get("eligibilityModule", {})
        contacts_module = protocol.get("contactsLocationsModule", {})
        sponsor_module = protocol.get("sponsorCollaboratorsModule", {})
        conditions_module = protocol.get("conditionsModule", {})
        arms_module = protocol.get("armsInterventionsModule", {})

        # Extract locations
        locations = contacts_module.get("locations", [])
        countries = list(set(loc.get("country", "") for loc in locations if loc.get("country")))
        cities = list(set(loc.get("city", "") for loc in locations if loc.get("city")))
        facilities = [loc.get("facility", "") for loc in locations if loc.get("facility")]

        # Extract contact
        central_contacts = contacts_module.get("centralContacts", [])
        contact = central_contacts[0] if central_contacts else {}

        # Extract interventions
        interventions = arms_module.get("interventions", [])
        intervention_types = list(set(i.get("type", "") for i in interventions if i.get("type")))
        intervention_names = [i.get("name", "") for i in interventions if i.get("name")]

        # Parse dates
        start_date = self._parse_date(status_module.get("startDateStruct", {}))
        completion_date = self._parse_date(status_module.get("completionDateStruct", {}))

        # Get phases
        phases = design_module.get("phases", [])
        phase_str = ", ".join(phases) if phases else None

        nct_id = id_module.get("nctId", "")

        return {
            "nct_id": nct_id,
            "eudract_id": None,
            "who_id": None,
            "isrctn_id": None,

            "title_original": id_module.get("briefTitle") or id_module.get("officialTitle"),
            "summary_original": desc_module.get("briefSummary"),
            "eligibility_original": eligibility_module.get("eligibilityCriteria"),

            "condition": conditions_module.get("conditions", []),
            "intervention_type": intervention_types[0] if intervention_types else None,
            "intervention_name": ", ".join(intervention_names[:3]) if intervention_names else None,

            "phase": phase_str,
            "status": status_module.get("overallStatus"),
            "enrollment_target": design_module.get("enrollmentInfo", {}).get("count"),

            "start_date": start_date,
            "completion_date": completion_date,

            "sponsor": sponsor_module.get("leadSponsor", {}).get("name"),
            "lead_sponsor_type": sponsor_module.get("leadSponsor", {}).get("class"),

            "location_countries": countries,
            "location_cities": cities,
            "location_facilities": facilities,

            "contact_name": contact.get("name"),
            "contact_email": contact.get("email"),
            "contact_phone": contact.get("phone"),

            "age_min": eligibility_module.get("minimumAge"),
            "age_max": eligibility_module.get("maximumAge"),
            "gender": eligibility_module.get("sex"),

            "source_registry": self.source_name,
            "source_url": f"https://clinicaltrials.gov/study/{nct_id}",
            "source_ids": {"nct_id": nct_id},

            "_sources": [self.source_name]
        }

    def _parse_date(self, date_struct: Dict) -> Optional[str]:
        """Parse date from ClinicalTrials.gov date structure."""
        if not date_struct:
            return None

        date_str = date_struct.get("date")
        if not date_str:
            return None

        # Handle various date formats
        for fmt in ["%Y-%m-%d", "%Y-%m", "%B %Y", "%B %d, %Y"]:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

        return date_str  # Return as-is if can't parse
