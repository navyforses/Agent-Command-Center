"""Orphanet scraper for rare disease information."""

from typing import List, Dict, Any, Optional
import xmltodict

from .base_scraper import BaseScraper


class OrphanetScraper(BaseScraper):
    """Scraper for Orphanet rare disease database.

    Orphanet provides information about rare diseases and orphan drugs.
    Data exports: https://www.orphadata.com/
    """

    BASE_URL = "https://www.orpha.net"
    DATA_URL = "https://www.orphadata.com/data"

    def __init__(self):
        super().__init__()
        self.rate_limit = 1.0

    @property
    def source_name(self) -> str:
        return "orphanet"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search Orphanet for rare disease information.

        Args:
            condition: Disease name to search for
            status: Not used for Orphanet

        Returns:
            List of disease/trial information
        """
        # Orphanet doesn't have a public API for searching
        # In production, you would:
        # 1. Download their XML data exports weekly
        # 2. Index them locally
        # 3. Search the local index

        # For now, return empty and rely on data imports
        return []

    async def get_disease_info(self, orpha_code: str) -> Optional[Dict[str, Any]]:
        """Get information about a rare disease by ORPHA code.

        Args:
            orpha_code: Orphanet code (e.g., ORPHA:558)

        Returns:
            Disease information or None
        """
        # This would query a local database of Orphanet data
        # or use their API if one becomes available
        return None

    async def import_xml_data(self, xml_content: str) -> List[Dict[str, Any]]:
        """Import Orphanet XML data export.

        Args:
            xml_content: Raw XML content from Orphanet export

        Returns:
            List of parsed disease records
        """
        diseases = []

        try:
            data = xmltodict.parse(xml_content)

            # Orphanet exports have various structures depending on the file
            # Common structure for diseases
            disorder_list = data.get("JDBOR", {}).get("DisorderList", {}).get("Disorder", [])

            if isinstance(disorder_list, dict):
                disorder_list = [disorder_list]

            for disorder in disorder_list:
                parsed = self._parse_disorder(disorder)
                if parsed:
                    diseases.append(parsed)

        except Exception as e:
            print(f"Error parsing Orphanet XML: {e}")

        return diseases

    def _parse_disorder(self, disorder: Dict) -> Optional[Dict[str, Any]]:
        """Parse an Orphanet disorder record."""
        try:
            orpha_code = disorder.get("OrphaCode", "")
            if not orpha_code:
                return None

            # Name
            name_data = disorder.get("Name", {})
            if isinstance(name_data, dict):
                name = name_data.get("#text", "")
            else:
                name = name_data

            # Synonyms
            synonym_list = disorder.get("SynonymList", {}).get("Synonym", [])
            if isinstance(synonym_list, dict):
                synonym_list = [synonym_list]
            synonyms = []
            for syn in synonym_list:
                if isinstance(syn, dict):
                    synonyms.append(syn.get("#text", ""))
                else:
                    synonyms.append(syn)

            # Definition
            definition = ""
            summary = disorder.get("SummaryInformation", {})
            if isinstance(summary, dict):
                definition = summary.get("Definition", "")

            # Prevalence
            prevalence_list = disorder.get("PrevalenceList", {}).get("Prevalence", [])
            if isinstance(prevalence_list, dict):
                prevalence_list = [prevalence_list]

            # Inheritance
            inheritance_list = disorder.get("TypeOfInheritanceList", {}).get("TypeOfInheritance", [])
            if isinstance(inheritance_list, dict):
                inheritance_list = [inheritance_list]
            inheritance_types = []
            for inh in inheritance_list:
                if isinstance(inh, dict):
                    inheritance_types.append(inh.get("Name", {}).get("#text", ""))

            # Age of onset
            onset_list = disorder.get("AverageAgeOfOnsetList", {}).get("AverageAgeOfOnset", [])
            if isinstance(onset_list, dict):
                onset_list = [onset_list]
            onset_ages = []
            for onset in onset_list:
                if isinstance(onset, dict):
                    onset_ages.append(onset.get("Name", {}).get("#text", ""))

            return {
                "orpha_code": f"ORPHA:{orpha_code}",
                "name": name,
                "synonyms": synonyms,
                "definition": definition,
                "inheritance": inheritance_types,
                "age_of_onset": onset_ages,
                "prevalence": prevalence_list,
                "url": f"{self.BASE_URL}/consor/cgi-bin/OC_Exp.php?Lng=EN&Expert={orpha_code}"
            }

        except Exception as e:
            print(f"Error parsing Orphanet disorder: {e}")
            return None

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Orphanet data to trial-like format.

        Note: Orphanet provides disease information, not trials.
        This is used for enriching trial data with rare disease context.
        """
        orpha_code = raw_trial.get("orpha_code", "")

        return {
            "nct_id": None,
            "eudract_id": None,
            "who_id": None,
            "isrctn_id": None,

            "title_original": raw_trial.get("name"),
            "summary_original": raw_trial.get("definition"),
            "eligibility_original": None,

            "condition": [raw_trial.get("name")] + raw_trial.get("synonyms", []),
            "intervention_type": "RARE_DISEASE_INFO",
            "intervention_name": None,

            "phase": None,
            "status": "ACTIVE",  # Disease database entry is always active
            "enrollment_target": None,

            "start_date": None,
            "completion_date": None,

            "sponsor": "Orphanet",
            "lead_sponsor_type": "DATABASE",

            "location_countries": [],
            "location_cities": [],
            "location_facilities": [],

            "contact_name": None,
            "contact_email": None,
            "contact_phone": None,

            "age_min": raw_trial.get("age_of_onset", [None])[0],
            "age_max": None,
            "gender": None,

            "source_registry": self.source_name,
            "source_url": raw_trial.get("url"),
            "source_ids": {"orpha_code": orpha_code},

            "_sources": [self.source_name],
            "_is_disease_info": True
        }
