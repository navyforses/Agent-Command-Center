"""Medical glossary service."""

from typing import Dict, List, Optional, Any

from database import Database
from .translator import TranslationService


class GlossaryService:
    """Service for managing medical term glossaries."""

    def __init__(self, db: Database = None):
        self.db = db
        self.translator = TranslationService()

        # Pre-defined medical terms for seeding
        self.seed_terms = [
            # Conditions
            "hypoxic-ischemic encephalopathy",
            "HIE",
            "cerebral palsy",
            "epilepsy",
            "autism spectrum disorder",
            "neonatal seizures",
            "brain injury",
            "stroke",
            "traumatic brain injury",
            "spinal cord injury",

            # Treatments
            "stem cell therapy",
            "mesenchymal stem cells",
            "cord blood",
            "therapeutic hypothermia",
            "cooling therapy",
            "erythropoietin",
            "gene therapy",
            "immunotherapy",

            # Trial terms
            "clinical trial",
            "randomized controlled trial",
            "double-blind",
            "placebo",
            "phase 1",
            "phase 2",
            "phase 3",
            "informed consent",
            "eligibility criteria",
            "inclusion criteria",
            "exclusion criteria",
            "primary outcome",
            "secondary outcome",
            "adverse event",
            "serious adverse event",

            # Medical terms
            "MRI",
            "EEG",
            "CT scan",
            "lumbar puncture",
            "blood test",
            "biopsy",
            "infusion",
            "intrathecal",
            "intravenous",

            # Anatomy
            "brain",
            "spinal cord",
            "neurons",
            "white matter",
            "gray matter",
            "basal ganglia",
        ]

    async def get_glossary(self, language_code: str) -> Dict[str, str]:
        """Get all glossary terms for a language.

        Args:
            language_code: Target language code

        Returns:
            Dictionary mapping English terms to translations
        """
        if self.db:
            return await self.db.get_glossary(language_code)
        return {}

    async def get_term(
        self,
        term: str,
        language_code: str
    ) -> Optional[Dict[str, str]]:
        """Get a specific term translation.

        Args:
            term: English medical term
            language_code: Target language code

        Returns:
            Dictionary with term_translated and definition_translated
        """
        # Check database first
        if self.db:
            glossary = await self.db.get_glossary(language_code)
            if term.lower() in glossary:
                return {
                    "term_english": term,
                    "term_translated": glossary[term.lower()],
                    "language_code": language_code
                }

        # Generate translation
        translation = await self.translator.get_glossary_term(term, language_code)

        # Store in database
        if self.db and translation.get("term_translated"):
            await self._save_term(term, language_code, translation)

        return {
            "term_english": term,
            "term_translated": translation.get("term_translated", term),
            "definition_translated": translation.get("definition_translated", ""),
            "language_code": language_code
        }

    async def seed_language(
        self,
        language_code: str,
        terms: List[str] = None
    ) -> int:
        """Seed glossary for a language with common medical terms.

        Args:
            language_code: Target language code
            terms: Optional list of terms (uses default if not provided)

        Returns:
            Number of terms added
        """
        terms = terms or self.seed_terms
        added = 0

        for term in terms:
            try:
                result = await self.get_term(term, language_code)
                if result and result.get("term_translated"):
                    added += 1
                    print(f"Added: {term} -> {result['term_translated']}")
            except Exception as e:
                print(f"Error seeding term '{term}': {e}")

        return added

    async def _save_term(
        self,
        term: str,
        language_code: str,
        translation: Dict[str, str]
    ):
        """Save a term to the database.

        Args:
            term: English term
            language_code: Target language
            translation: Translation data
        """
        if not self.db:
            return

        # This would use a specific database method
        # For now, we'll use a raw query approach
        pass

    async def search_terms(
        self,
        query: str,
        language_code: str
    ) -> List[Dict[str, str]]:
        """Search glossary terms.

        Args:
            query: Search query
            language_code: Language to search in

        Returns:
            List of matching terms
        """
        glossary = await self.get_glossary(language_code)

        results = []
        query_lower = query.lower()

        for eng_term, translated in glossary.items():
            if query_lower in eng_term.lower() or query_lower in translated.lower():
                results.append({
                    "term_english": eng_term,
                    "term_translated": translated,
                    "language_code": language_code
                })

        return results

    def get_category_terms(self, category: str) -> List[str]:
        """Get terms by category.

        Args:
            category: Term category (conditions, treatments, trial_terms, etc.)

        Returns:
            List of terms in that category
        """
        categories = {
            "conditions": [
                "hypoxic-ischemic encephalopathy", "HIE", "cerebral palsy",
                "epilepsy", "autism spectrum disorder", "neonatal seizures",
                "brain injury", "stroke", "traumatic brain injury", "spinal cord injury"
            ],
            "treatments": [
                "stem cell therapy", "mesenchymal stem cells", "cord blood",
                "therapeutic hypothermia", "cooling therapy", "erythropoietin",
                "gene therapy", "immunotherapy"
            ],
            "trial_terms": [
                "clinical trial", "randomized controlled trial", "double-blind",
                "placebo", "phase 1", "phase 2", "phase 3", "informed consent",
                "eligibility criteria", "inclusion criteria", "exclusion criteria",
                "primary outcome", "secondary outcome", "adverse event"
            ],
            "procedures": [
                "MRI", "EEG", "CT scan", "lumbar puncture", "blood test",
                "biopsy", "infusion", "intrathecal", "intravenous"
            ],
            "anatomy": [
                "brain", "spinal cord", "neurons", "white matter",
                "gray matter", "basal ganglia"
            ]
        }

        return categories.get(category, [])


# Pre-defined Georgian medical glossary
GEORGIAN_GLOSSARY = {
    "hypoxic-ischemic encephalopathy": "ჰიპოქსიურ-იშემიური ენცეფალოპათია",
    "HIE": "ჰიპოქსიურ-იშემიური ენცეფალოპათია (HIE)",
    "cerebral palsy": "ცერებრული დამბლა",
    "epilepsy": "ეპილეფსია",
    "stem cell therapy": "ღეროვანი უჯრედების თერაპია",
    "mesenchymal stem cells": "მეზენქიმური ღეროვანი უჯრედები",
    "cord blood": "ჭიპლის სისხლი",
    "therapeutic hypothermia": "თერაპიული ჰიპოთერმია",
    "cooling therapy": "გაგრილების თერაპია",
    "clinical trial": "კლინიკური კვლევა",
    "randomized controlled trial": "რანდომიზებული კონტროლირებადი კვლევა",
    "double-blind": "ორმაგად ბრმა",
    "placebo": "პლაცებო",
    "informed consent": "ინფორმირებული თანხმობა",
    "eligibility criteria": "შერჩევის კრიტერიუმები",
    "inclusion criteria": "ჩართვის კრიტერიუმები",
    "exclusion criteria": "გამორიცხვის კრიტერიუმები",
    "adverse event": "გვერდითი მოვლენა",
    "brain": "ტვინი",
    "spinal cord": "ზურგის ტვინი",
    "neurons": "ნეირონები",
    "neonatal": "ახალშობილთა",
    "pediatric": "პედიატრიული",
    "MRI": "მაგნიტურ-რეზონანსული ტომოგრაფია (MRI)",
    "EEG": "ელექტროენცეფალოგრაფია (EEG)",
}
