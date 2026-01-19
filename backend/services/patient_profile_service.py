"""Patient profile service with AI analysis."""

import json
from typing import Dict, List, Optional, Any
from datetime import datetime, date
import openai

from config import settings
from models.patient_profile import (
    PatientProfile,
    PatientProfileCreate,
    PatientProfileAIAnalysis,
    FeedItem,
    ContentType,
    Priority
)


class PatientProfileService:
    """Service for managing patient profiles and AI analysis."""

    def __init__(self, db=None):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"

    async def analyze_patient_data(
        self,
        form_100_text: Optional[str],
        diagnosis: str,
        medical_history: Optional[str],
        date_of_birth: date,
        language: str = "ka"
    ) -> PatientProfileAIAnalysis:
        """Analyze patient data and create AI profile.

        Args:
            form_100_text: Extracted text from Form 100 document
            diagnosis: Primary diagnosis
            medical_history: Additional medical history
            date_of_birth: Patient's date of birth
            language: User's preferred language

        Returns:
            AI analysis of the patient profile
        """
        # Calculate age
        today = date.today()
        age_years = (today - date_of_birth).days / 365.25
        age_category = self._get_age_category(age_years)

        # Build context for AI
        context_parts = []
        if diagnosis:
            context_parts.append(f"Primary Diagnosis: {diagnosis}")
        if form_100_text:
            context_parts.append(f"Medical Document (Form 100):\n{form_100_text}")
        if medical_history:
            context_parts.append(f"Medical History:\n{medical_history}")

        context = "\n\n".join(context_parts)

        # Get language name
        language_name = self._get_language_name(language)

        system_prompt = f"""You are a medical AI assistant analyzing patient data to help find relevant clinical trials and medical research.

Analyze the patient information and extract:
1. Primary condition and any secondary conditions
2. Key medical terms for searching clinical trials
3. Any contraindications or treatments to avoid
4. Recommended types of trials/treatments to search for

Patient age: {age_years:.1f} years ({age_category})

Output JSON with:
- primary_condition: main diagnosis
- secondary_conditions: list of other conditions
- condition_keywords: list of search terms (English, for database search)
- recommended_trial_types: types of trials that might help
- contraindicated_treatments: treatments to avoid
- profile_summary: 2-3 sentence summary in {language_name} for the patient/family
- search_strategy: brief description of search approach (English)"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)

            return PatientProfileAIAnalysis(
                primary_condition=result.get("primary_condition", diagnosis),
                secondary_conditions=result.get("secondary_conditions", []),
                condition_keywords=result.get("condition_keywords", [diagnosis]),
                age_years=age_years,
                age_category=age_category,
                recommended_trial_types=result.get("recommended_trial_types", []),
                contraindicated_treatments=result.get("contraindicated_treatments", []),
                profile_summary=result.get("profile_summary", ""),
                search_strategy=result.get("search_strategy", "")
            )

        except Exception as e:
            print(f"AI analysis error: {e}")
            # Return basic analysis on error
            return PatientProfileAIAnalysis(
                primary_condition=diagnosis,
                secondary_conditions=[],
                condition_keywords=[diagnosis],
                age_years=age_years,
                age_category=age_category,
                recommended_trial_types=[],
                contraindicated_treatments=[],
                profile_summary="",
                search_strategy=f"Search for {diagnosis} trials"
            )

    async def generate_personal_relevance(
        self,
        content: Dict[str, Any],
        patient_profile: PatientProfile,
        content_type: ContentType
    ) -> Dict[str, Any]:
        """Generate 'What it means for you' explanation.

        Args:
            content: The content item (trial, news, etc.)
            patient_profile: Patient's profile
            content_type: Type of content

        Returns:
            Dict with personal_relevance and why_relevant
        """
        language_name = self._get_language_name(patient_profile.preferred_language)

        # Build content description
        if content_type == ContentType.CLINICAL_TRIAL:
            content_desc = f"""
Clinical Trial: {content.get('title_original', '')}
Phase: {content.get('phase', 'N/A')}
Status: {content.get('status', 'N/A')}
Location: {', '.join(content.get('location_countries', []))}
Age requirement: {content.get('age_min', 'N/A')} - {content.get('age_max', 'N/A')}
Eligibility: {content.get('eligibility_original', '')[:500]}
"""
        elif content_type == ContentType.RESEARCH_RESULT:
            content_desc = f"""
Research Result: {content.get('title', '')}
Summary: {content.get('summary', '')}
Journal: {content.get('journal', 'N/A')}
"""
        else:
            content_desc = f"""
{content_type.value}: {content.get('title', '')}
Summary: {content.get('summary', '')}
"""

        patient_desc = f"""
Patient: {patient_profile.patient_name}
Age: {patient_profile.age_category}
Condition: {patient_profile.primary_diagnosis}
Location: {patient_profile.country}
"""

        system_prompt = f"""You are helping a patient's family understand medical information.

Write in {language_name}, using VERY SIMPLE language that a 12-year-old could understand.
Avoid medical jargon. If you must use a medical term, explain it in parentheses.

Generate:
1. personal_relevance: 2-3 sentences explaining what this means for this specific patient
2. why_relevant: 2-4 bullet points of why this matches/doesn't match the patient

Be honest - if something doesn't match well, say so kindly.

Output JSON with:
- personal_relevance: string (in {language_name})
- why_relevant: list of strings (in {language_name})
- relevance_score: number 0-100"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"CONTENT:\n{content_desc}\n\nPATIENT:\n{patient_desc}"}
                ],
                temperature=0.4,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            print(f"Relevance generation error: {e}")
            return {
                "personal_relevance": "",
                "why_relevant": [],
                "relevance_score": 50
            }

    async def simplify_content(
        self,
        title: str,
        content: str,
        language: str
    ) -> Dict[str, str]:
        """Simplify medical content for non-medical audience.

        Args:
            title: Original title
            content: Original content
            language: Target language

        Returns:
            Dict with simplified title and content
        """
        language_name = self._get_language_name(language)

        system_prompt = f"""You are a medical translator who makes complex medical information understandable.

Translate and simplify the following medical content to {language_name}.

Rules:
1. Use language a 12-year-old could understand
2. Explain medical terms in parentheses
3. Keep important numbers and facts
4. Maximum 3 sentences for summary

Output JSON with:
- title: simplified title in {language_name}
- summary: simplified summary in {language_name} (max 3 sentences)"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"TITLE: {title}\n\nCONTENT: {content[:2000]}"}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            print(f"Simplification error: {e}")
            return {"title": title, "summary": content[:200]}

    def calculate_relevance_score(
        self,
        content: Dict[str, Any],
        patient_profile: PatientProfile,
        content_type: ContentType
    ) -> float:
        """Calculate relevance score for content.

        Args:
            content: Content item
            patient_profile: Patient profile
            content_type: Type of content

        Returns:
            Relevance score 0-100
        """
        score = 50.0  # Base score

        # Condition match
        patient_conditions = [patient_profile.primary_diagnosis.lower()] + \
                           [d.lower() for d in patient_profile.secondary_diagnoses]
        patient_keywords = [k.lower() for k in patient_profile.extracted_keywords]

        content_text = f"{content.get('title_original', '')} {content.get('summary_original', '')}".lower()

        # Check for condition matches
        for condition in patient_conditions:
            if condition in content_text:
                score += 20
                break

        # Check for keyword matches
        keyword_matches = sum(1 for k in patient_keywords if k in content_text)
        score += min(keyword_matches * 5, 15)

        # For trials - check eligibility
        if content_type == ContentType.CLINICAL_TRIAL:
            # Age check
            age_min = content.get('age_min', '')
            age_max = content.get('age_max', '')
            patient_age = self._calculate_age(patient_profile.date_of_birth)

            if self._age_matches(patient_age, age_min, age_max):
                score += 10

            # Location check
            trial_countries = [c.lower() for c in content.get('location_countries', [])]
            if patient_profile.country.lower() in trial_countries:
                score += 10
            elif patient_profile.willing_to_travel:
                score += 5

            # Status check (recruiting is better)
            status = content.get('status', '').lower()
            if 'recruiting' in status:
                score += 5

        # Cap at 100
        return min(score, 100.0)

    def determine_priority(
        self,
        relevance_score: float,
        content: Dict[str, Any],
        content_type: ContentType
    ) -> Priority:
        """Determine content priority.

        Args:
            relevance_score: Calculated relevance score
            content: Content item
            content_type: Type of content

        Returns:
            Priority level
        """
        # Check for urgency factors
        is_urgent = False

        if content_type == ContentType.CLINICAL_TRIAL:
            # Check deadline
            status = content.get('status', '').lower()
            if 'recruiting' in status and relevance_score >= 90:
                is_urgent = True

        if is_urgent:
            return Priority.URGENT

        if relevance_score >= 85:
            return Priority.IMPORTANT

        if relevance_score >= 60:
            return Priority.RELEVANT

        return Priority.GENERAL

    def _get_age_category(self, age_years: float) -> str:
        """Get age category from years."""
        if age_years < 1:
            return "infant"
        elif age_years < 3:
            return "toddler"
        elif age_years < 12:
            return "child"
        elif age_years < 18:
            return "adolescent"
        elif age_years < 65:
            return "adult"
        else:
            return "elderly"

    def _calculate_age(self, dob: date) -> float:
        """Calculate age in years."""
        today = date.today()
        return (today - dob).days / 365.25

    def _age_matches(self, patient_age: float, age_min: str, age_max: str) -> bool:
        """Check if patient age matches trial requirements."""
        try:
            # Parse age strings like "2 Years", "18 Months"
            min_years = self._parse_age_string(age_min) if age_min else 0
            max_years = self._parse_age_string(age_max) if age_max else 120

            return min_years <= patient_age <= max_years
        except:
            return True  # Assume match if can't parse

    def _parse_age_string(self, age_str: str) -> float:
        """Parse age string to years."""
        if not age_str:
            return 0

        age_str = age_str.lower().strip()

        # Try to extract number
        import re
        numbers = re.findall(r'[\d.]+', age_str)
        if not numbers:
            return 0

        value = float(numbers[0])

        if 'month' in age_str:
            return value / 12
        elif 'week' in age_str:
            return value / 52
        elif 'day' in age_str:
            return value / 365
        else:
            return value  # Assume years

    def _get_language_name(self, code: str) -> str:
        """Get language name from code."""
        names = {
            "ka": "Georgian",
            "hy": "Armenian",
            "az": "Azerbaijani",
            "en": "English",
            "ru": "Russian",
            "de": "German",
            "fr": "French",
        }
        return names.get(code, code)
