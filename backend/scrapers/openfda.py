"""OpenFDA API scraper for drug information."""

from typing import List, Dict, Any, Optional

from .base_scraper import BaseScraper


class OpenFDAScraper(BaseScraper):
    """Scraper for OpenFDA API.

    OpenFDA provides access to FDA data including drug information,
    adverse events, and more.

    API: https://api.fda.gov/
    """

    BASE_URL = "https://api.fda.gov"

    def __init__(self, api_key: str = None):
        super().__init__()
        self.api_key = api_key
        self.rate_limit = 4.0  # 4 requests/second for basic, 120/minute with key

    @property
    def source_name(self) -> str:
        return "openfda"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        limit: int = 100,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search OpenFDA for drug information related to a condition.

        Args:
            condition: Medical condition to search for
            status: Not used for OpenFDA
            limit: Maximum number of results

        Returns:
            List of drug information
        """
        # Search drug labels for the condition
        drugs = await self._search_drug_labels(condition, limit)
        return drugs

    async def _search_drug_labels(
        self,
        condition: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search drug labeling data."""
        params = {
            "search": f'indications_and_usage:"{condition}"',
            "limit": min(limit, 1000)
        }

        if self.api_key:
            params["api_key"] = self.api_key

        try:
            response = await self._get(f"{self.BASE_URL}/drug/label.json", params=params)
            data = response.json()

            results = data.get("results", [])
            return results

        except Exception as e:
            print(f"OpenFDA drug label search error: {e}")
            return []

    async def search_adverse_events(
        self,
        drug_name: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search adverse event reports for a drug.

        Args:
            drug_name: Drug name to search for
            limit: Maximum number of results

        Returns:
            List of adverse event reports
        """
        params = {
            "search": f'patient.drug.openfda.brand_name:"{drug_name}"',
            "limit": min(limit, 1000)
        }

        if self.api_key:
            params["api_key"] = self.api_key

        try:
            response = await self._get(f"{self.BASE_URL}/drug/event.json", params=params)
            data = response.json()

            results = data.get("results", [])
            return results

        except Exception as e:
            print(f"OpenFDA adverse event search error: {e}")
            return []

    async def get_drug_info(self, drug_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a drug.

        Args:
            drug_name: Drug name

        Returns:
            Drug information or None
        """
        params = {
            "search": f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"',
            "limit": 1
        }

        if self.api_key:
            params["api_key"] = self.api_key

        try:
            response = await self._get(f"{self.BASE_URL}/drug/label.json", params=params)
            data = response.json()

            results = data.get("results", [])
            return results[0] if results else None

        except Exception as e:
            print(f"OpenFDA drug info error: {e}")
            return None

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize OpenFDA drug data to trial-like format.

        Note: OpenFDA provides drug information, not trials.
        This is used for enriching trial data with drug context.
        """
        openfda = raw_trial.get("openfda", {})

        # Get drug identifiers
        brand_names = openfda.get("brand_name", [])
        generic_names = openfda.get("generic_name", [])
        ndc = openfda.get("product_ndc", [])
        rxcui = openfda.get("rxcui", [])

        # Get indications
        indications = raw_trial.get("indications_and_usage", [])
        if isinstance(indications, list):
            indications = " ".join(indications)

        # Get warnings
        warnings = raw_trial.get("warnings", [])
        if isinstance(warnings, list):
            warnings = " ".join(warnings)

        # Get dosage
        dosage = raw_trial.get("dosage_and_administration", [])
        if isinstance(dosage, list):
            dosage = " ".join(dosage)

        # Get contraindications
        contraindications = raw_trial.get("contraindications", [])
        if isinstance(contraindications, list):
            contraindications = " ".join(contraindications)

        # Get manufacturer
        manufacturer = openfda.get("manufacturer_name", [])
        if manufacturer:
            manufacturer = manufacturer[0]

        drug_name = (brand_names[0] if brand_names else
                     generic_names[0] if generic_names else "Unknown Drug")

        return {
            "nct_id": None,
            "eudract_id": None,
            "who_id": None,
            "isrctn_id": None,

            "title_original": drug_name,
            "summary_original": indications,
            "eligibility_original": contraindications,

            "condition": openfda.get("pharm_class_epc", []),
            "intervention_type": "DRUG",
            "intervention_name": drug_name,

            "phase": "APPROVED",  # It's an approved drug
            "status": "APPROVED",
            "enrollment_target": None,

            "start_date": None,
            "completion_date": None,

            "sponsor": manufacturer,
            "lead_sponsor_type": "INDUSTRY",

            "location_countries": ["US"],  # FDA is US
            "location_cities": [],
            "location_facilities": [],

            "contact_name": None,
            "contact_email": None,
            "contact_phone": None,

            "age_min": None,
            "age_max": None,
            "gender": None,

            "source_registry": self.source_name,
            "source_url": f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:{drug_name}",
            "source_ids": {
                "ndc": ndc[0] if ndc else None,
                "rxcui": rxcui[0] if rxcui else None
            },

            "_sources": [self.source_name],
            "_is_drug_info": True,
            "_warnings": warnings,
            "_dosage": dosage
        }
