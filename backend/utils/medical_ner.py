"""Medical named entity recognition utilities."""

import re
from typing import List, Dict, Any


# Medical entity patterns
PATTERNS = {
    "drug": [
        r"\b[A-Z][a-z]+mab\b",  # Monoclonal antibodies (e.g., Rituximab)
        r"\b[A-Z][a-z]+nib\b",  # Kinase inhibitors (e.g., Imatinib)
        r"\b[A-Z][a-z]+vir\b",  # Antivirals (e.g., Acyclovir)
        r"\b[A-Z][a-z]+cillin\b",  # Penicillins
        r"\b[A-Z][a-z]+mycin\b",  # Antibiotics
    ],
    "dosage": [
        r"\b\d+\s*(?:mg|g|mcg|μg|ml|mL|IU)\b",
        r"\b\d+\s*(?:mg|g)/(?:kg|m2|day)\b",
    ],
    "age": [
        r"\b\d+\s*(?:years?|months?|weeks?|days?)\s*(?:old|of age)?\b",
        r"\b(?:newborn|neonate|infant|child|pediatric|adult|elderly)\b",
    ],
    "condition": [
        r"\bhypoxic[- ]ischemic encephalopathy\b",
        r"\bcerebral palsy\b",
        r"\bepileps(?:y|ies)\b",
        r"\bseizure(?:s)?\b",
        r"\bstroke\b",
        r"\bautism\b",
    ],
    "treatment": [
        r"\bstem cell(?:s)?\s*(?:therapy|transplant|treatment)?\b",
        r"\b(?:therapeutic|cooling)\s*hypothermia\b",
        r"\bcord blood\b",
        r"\bgene therapy\b",
        r"\bimmunotherapy\b",
    ],
    "phase": [
        r"\bphase\s*[1234I]+(?:/[234I]+)?\b",
        r"\bfirst[- ]in[- ]human\b",
    ],
}


def extract_medical_entities(text: str) -> Dict[str, List[str]]:
    """Extract medical entities from text.

    Args:
        text: Text to analyze

    Returns:
        Dictionary mapping entity types to found entities
    """
    entities: Dict[str, List[str]] = {
        "drugs": [],
        "dosages": [],
        "ages": [],
        "conditions": [],
        "treatments": [],
        "phases": [],
    }

    if not text:
        return entities

    text_lower = text.lower()

    # Extract drugs
    for pattern in PATTERNS["drug"]:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities["drugs"].extend(matches)

    # Extract dosages
    for pattern in PATTERNS["dosage"]:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities["dosages"].extend(matches)

    # Extract ages
    for pattern in PATTERNS["age"]:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities["ages"].extend(matches)

    # Extract conditions
    for pattern in PATTERNS["condition"]:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities["conditions"].extend(matches)

    # Extract treatments
    for pattern in PATTERNS["treatment"]:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities["treatments"].extend(matches)

    # Extract phases
    for pattern in PATTERNS["phase"]:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities["phases"].extend(matches)

    # Deduplicate
    for key in entities:
        entities[key] = list(set(entities[key]))

    return entities


def extract_eligibility_criteria(text: str) -> Dict[str, Any]:
    """Extract structured eligibility criteria from text.

    Args:
        text: Eligibility criteria text

    Returns:
        Structured criteria
    """
    criteria = {
        "age_min": None,
        "age_max": None,
        "gender": None,
        "conditions_required": [],
        "conditions_excluded": [],
        "treatments_excluded": [],
    }

    if not text:
        return criteria

    text_lower = text.lower()

    # Extract age range
    age_patterns = [
        r"(?:age|aged?)\s*(?:>=?|≥|at least|minimum)\s*(\d+)\s*(?:years?|months?)?",
        r"(?:age|aged?)\s*(?:<=?|≤|maximum|up to|no more than)\s*(\d+)\s*(?:years?|months?)?",
        r"(\d+)\s*(?:to|-)\s*(\d+)\s*years?\s*(?:old|of age)?",
    ]

    for pattern in age_patterns:
        match = re.search(pattern, text_lower)
        if match:
            groups = match.groups()
            if len(groups) == 1:
                # Single value - context determines min/max
                value = int(groups[0])
                if "minimum" in text_lower or "at least" in text_lower:
                    criteria["age_min"] = value
                else:
                    criteria["age_max"] = value
            elif len(groups) == 2:
                criteria["age_min"] = int(groups[0])
                criteria["age_max"] = int(groups[1])

    # Extract gender
    if "male only" in text_lower or "men only" in text_lower:
        criteria["gender"] = "male"
    elif "female only" in text_lower or "women only" in text_lower:
        criteria["gender"] = "female"
    elif "both" in text_lower or "all genders" in text_lower:
        criteria["gender"] = "all"

    # Extract required conditions (from inclusion criteria)
    inclusion_section = extract_section(text, "inclusion")
    if inclusion_section:
        entities = extract_medical_entities(inclusion_section)
        criteria["conditions_required"] = entities.get("conditions", [])

    # Extract excluded conditions/treatments (from exclusion criteria)
    exclusion_section = extract_section(text, "exclusion")
    if exclusion_section:
        entities = extract_medical_entities(exclusion_section)
        criteria["conditions_excluded"] = entities.get("conditions", [])
        criteria["treatments_excluded"] = entities.get("treatments", [])

    return criteria


def extract_section(text: str, section_name: str) -> str:
    """Extract a specific section from criteria text.

    Args:
        text: Full text
        section_name: Section to extract (inclusion, exclusion)

    Returns:
        Section text or empty string
    """
    patterns = {
        "inclusion": [
            r"inclusion\s*criteria[:\s]*(.*?)(?=exclusion|$)",
            r"eligible\s*if[:\s]*(.*?)(?=not eligible|exclusion|$)",
        ],
        "exclusion": [
            r"exclusion\s*criteria[:\s]*(.*?)(?=inclusion|$)",
            r"not\s*eligible\s*if[:\s]*(.*?)(?=eligible|inclusion|$)",
        ],
    }

    for pattern in patterns.get(section_name, []):
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()

    return ""


def is_pediatric_trial(text: str) -> bool:
    """Determine if trial text indicates a pediatric population.

    Args:
        text: Trial text (title, summary, eligibility)

    Returns:
        True if likely pediatric
    """
    text_lower = text.lower()

    pediatric_keywords = [
        "pediatric",
        "paediatric",
        "child",
        "children",
        "infant",
        "newborn",
        "neonate",
        "neonatal",
        "adolescent",
        "youth",
        "juvenile",
    ]

    for keyword in pediatric_keywords:
        if keyword in text_lower:
            return True

    # Check age criteria
    age_match = re.search(r"(\d+)\s*(?:to|-)\s*(\d+)\s*years?", text_lower)
    if age_match:
        min_age = int(age_match.group(1))
        max_age = int(age_match.group(2))
        if max_age <= 18:
            return True

    return False
