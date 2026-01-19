"""Translation service using GPT-4o."""

import json
from typing import Dict, List, Optional, Any
import openai

from config import settings


class TranslationService:
    """AI-powered translation service for clinical trials."""

    def __init__(self, api_key: str = None):
        """Initialize the translation service.

        Args:
            api_key: OpenAI API key (uses settings if not provided)
        """
        self.api_key = api_key or settings.openai_api_key
        self.client = openai.AsyncOpenAI(api_key=self.api_key)
        self.model = "gpt-4o"

    async def translate_trial(
        self,
        trial: Dict[str, Any],
        target_language: str,
        glossary: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """Translate trial information to target language.

        Args:
            trial: Trial data with title_original, summary_original, eligibility_original
            target_language: Target language code (e.g., 'ka' for Georgian)
            glossary: Optional medical term glossary for the target language

        Returns:
            Dictionary with translated fields
        """
        # Get language name from code
        language_name = self._get_language_name(target_language)

        # Build glossary context
        glossary_text = ""
        if glossary:
            glossary_lines = [f"- {eng}: {trans}" for eng, trans in glossary.items()]
            glossary_text = "\n".join(glossary_lines)

        system_prompt = f"""You are a medical translator specializing in clinical trial information.
Translate the following clinical trial information to {language_name}.

CRITICAL RULES:
1. Maintain medical accuracy - use proper medical terminology in {language_name}
2. Keep the translation clear and understandable for non-medical readers
3. Preserve all numbers, dates, and specific medical values exactly
4. Do NOT translate proper nouns (hospital names, drug brand names, etc.)
5. If a medical term has no equivalent in {language_name}, keep the English term and add translation in parentheses

{f"Use these verified medical term translations:{chr(10)}{glossary_text}" if glossary_text else ""}

Output ONLY valid JSON with these fields:
- title_translated: translated title
- summary_translated: translated summary
- eligibility_translated: translated eligibility criteria
- simplified_summary: 2-3 sentence summary for non-medical parents"""

        user_content = f"""Translate this clinical trial to {language_name}:

TITLE: {trial.get('title_original', '')}

SUMMARY: {trial.get('summary_original', '')}

ELIGIBILITY CRITERIA: {trial.get('eligibility_original', '')}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
                max_tokens=4000
            )

            result = json.loads(response.choices[0].message.content)
            return result

        except json.JSONDecodeError as e:
            print(f"JSON parse error in translation: {e}")
            # Try to extract text content
            content = response.choices[0].message.content
            return {
                "title_translated": trial.get('title_original', ''),
                "summary_translated": trial.get('summary_original', ''),
                "eligibility_translated": trial.get('eligibility_original', ''),
                "simplified_summary": content[:500] if content else "",
                "_error": str(e)
            }

        except Exception as e:
            print(f"Translation error: {e}")
            raise

    async def translate_text(
        self,
        text: str,
        target_language: str,
        context: str = "medical"
    ) -> str:
        """Translate a single piece of text.

        Args:
            text: Text to translate
            target_language: Target language code
            context: Context for translation (medical, general, etc.)

        Returns:
            Translated text
        """
        language_name = self._get_language_name(target_language)

        system_prompt = f"""You are a translator specializing in {context} content.
Translate to {language_name}. Be accurate and clear.
Return ONLY the translated text, no explanations."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                temperature=0.3,
                max_tokens=2000
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Text translation error: {e}")
            raise

    async def expand_query(
        self,
        query: str,
        source_language: str
    ) -> List[str]:
        """Expand search query with medical synonyms and translations.

        Args:
            query: Original search query
            source_language: Language of the query

        Returns:
            List of expanded search terms (including English)
        """
        system_prompt = """You are a medical search query expansion system.
Given a search query (possibly in a non-English language), generate:
1. English translation if not already English
2. Medical synonyms and related terms
3. Common abbreviations
4. Related conditions

Output as JSON with a "terms" array of search terms.
Include the original query and up to 10 additional terms."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Query ({source_language}): {query}"}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            terms = result.get("terms", [query])

            # Ensure original query is included
            if query not in terms:
                terms.insert(0, query)

            return terms

        except Exception as e:
            print(f"Query expansion error: {e}")
            return [query]

    async def get_glossary_term(
        self,
        term: str,
        target_language: str
    ) -> Dict[str, str]:
        """Get translation and definition for a medical term.

        Args:
            term: English medical term
            target_language: Target language code

        Returns:
            Dictionary with term_translated and definition_translated
        """
        language_name = self._get_language_name(target_language)

        system_prompt = f"""You are a medical terminology expert.
Translate the given medical term to {language_name} and provide a simple definition.

Output as JSON with:
- term_translated: the term in {language_name}
- definition_translated: simple definition in {language_name} (1-2 sentences)"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Medical term: {term}"}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            print(f"Glossary term error: {e}")
            return {
                "term_translated": term,
                "definition_translated": ""
            }

    def _get_language_name(self, code: str) -> str:
        """Get language name from code.

        Args:
            code: Language code (e.g., 'ka')

        Returns:
            Language name (e.g., 'Georgian')
        """
        language_names = {
            # Tier 1 - Caucasus & Central Asia
            "ka": "Georgian",
            "hy": "Armenian",
            "az": "Azerbaijani",
            "kk": "Kazakh",
            "uz": "Uzbek",
            "mn": "Mongolian",

            # Tier 2 - European Minority
            "eu": "Basque",
            "cy": "Welsh",
            "ga": "Irish",
            "mt": "Maltese",
            "et": "Estonian",
            "lv": "Latvian",
            "lt": "Lithuanian",

            # Tier 3 - Asian
            "km": "Khmer",
            "my": "Burmese",
            "ne": "Nepali",
            "si": "Sinhala",
            "bn": "Bengali",

            # Tier 3 - African
            "am": "Amharic",
            "ti": "Tigrinya",
            "so": "Somali",
            "sw": "Swahili",

            # Common languages
            "en": "English",
            "ru": "Russian",
            "de": "German",
            "fr": "French",
            "es": "Spanish",
            "pt": "Portuguese",
            "it": "Italian",
            "pl": "Polish",
            "uk": "Ukrainian",
            "tr": "Turkish",
            "ar": "Arabic",
            "fa": "Persian",
            "he": "Hebrew",
            "hi": "Hindi",
            "ja": "Japanese",
            "ko": "Korean",
            "zh": "Chinese",
            "vi": "Vietnamese",
            "th": "Thai",
            "id": "Indonesian",
            "ms": "Malay",
        }

        return language_names.get(code, code)


# Supported languages list
SUPPORTED_LANGUAGES = [
    # Tier 1 - Priority languages (Caucasus & Central Asia)
    {"code": "ka", "name_native": "ქართული", "name_english": "Georgian", "tier": 1, "speakers_millions": 4.0},
    {"code": "hy", "name_native": "Հայdelays delays", "name_english": "Armenian", "tier": 1, "speakers_millions": 6.0},
    {"code": "az", "name_native": "Azərbaycan", "name_english": "Azerbaijani", "tier": 1, "speakers_millions": 10.0},
    {"code": "kk", "name_native": "Қазақша", "name_english": "Kazakh", "tier": 1, "speakers_millions": 13.0},
    {"code": "uz", "name_native": "Oʻzbekcha", "name_english": "Uzbek", "tier": 1, "speakers_millions": 35.0},
    {"code": "mn", "name_native": "Монгол", "name_english": "Mongolian", "tier": 1, "speakers_millions": 6.0},

    # Tier 2 - European Minority
    {"code": "eu", "name_native": "Euskara", "name_english": "Basque", "tier": 2, "speakers_millions": 0.75},
    {"code": "cy", "name_native": "Cymraeg", "name_english": "Welsh", "tier": 2, "speakers_millions": 0.9},
    {"code": "ga", "name_native": "Gaeilge", "name_english": "Irish", "tier": 2, "speakers_millions": 1.7},
    {"code": "mt", "name_native": "Malti", "name_english": "Maltese", "tier": 2, "speakers_millions": 0.5},
    {"code": "et", "name_native": "Eesti", "name_english": "Estonian", "tier": 2, "speakers_millions": 1.1},
    {"code": "lv", "name_native": "Latviešu", "name_english": "Latvian", "tier": 2, "speakers_millions": 1.5},
    {"code": "lt", "name_native": "Lietuvių", "name_english": "Lithuanian", "tier": 2, "speakers_millions": 3.0},

    # Tier 3 - Asian
    {"code": "km", "name_native": "ខ្មែរ", "name_english": "Khmer", "tier": 3, "speakers_millions": 16.0},
    {"code": "my", "name_native": "မြန်မာ", "name_english": "Burmese", "tier": 3, "speakers_millions": 33.0},
    {"code": "ne", "name_native": "नेपाली", "name_english": "Nepali", "tier": 3, "speakers_millions": 25.0},
    {"code": "si", "name_native": "සිංහල", "name_english": "Sinhala", "tier": 3, "speakers_millions": 17.0},
    {"code": "bn", "name_native": "বাংলা", "name_english": "Bengali", "tier": 3, "speakers_millions": 230.0},

    # Tier 3 - African
    {"code": "am", "name_native": "አማርኛ", "name_english": "Amharic", "tier": 3, "speakers_millions": 32.0},
    {"code": "ti", "name_native": "ትግርኛ", "name_english": "Tigrinya", "tier": 3, "speakers_millions": 9.0},
    {"code": "so", "name_native": "Soomaali", "name_english": "Somali", "tier": 3, "speakers_millions": 22.0},
    {"code": "sw", "name_native": "Kiswahili", "name_english": "Swahili", "tier": 3, "speakers_millions": 100.0},

    # Common languages
    {"code": "en", "name_native": "English", "name_english": "English", "tier": 0, "speakers_millions": 1500.0},
    {"code": "ru", "name_native": "Русский", "name_english": "Russian", "tier": 2, "speakers_millions": 250.0},
]
