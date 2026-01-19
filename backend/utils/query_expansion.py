"""Query expansion utilities for medical search."""

from typing import List, Dict, Set

# Medical synonyms and abbreviations
MEDICAL_SYNONYMS: Dict[str, List[str]] = {
    # Conditions
    "hie": [
        "hypoxic-ischemic encephalopathy",
        "hypoxic ischemic encephalopathy",
        "birth asphyxia",
        "perinatal asphyxia",
        "neonatal encephalopathy"
    ],
    "hypoxic-ischemic encephalopathy": [
        "HIE",
        "birth asphyxia",
        "perinatal asphyxia",
        "neonatal encephalopathy"
    ],
    "cerebral palsy": [
        "CP",
        "spastic diplegia",
        "spastic quadriplegia",
        "hemiplegia"
    ],
    "epilepsy": [
        "seizure disorder",
        "seizures",
        "convulsions"
    ],
    "autism": [
        "autism spectrum disorder",
        "ASD",
        "autistic disorder",
        "Asperger syndrome"
    ],
    "stroke": [
        "cerebrovascular accident",
        "CVA",
        "brain infarction",
        "ischemic stroke",
        "hemorrhagic stroke"
    ],

    # Treatments
    "stem cell therapy": [
        "stem cell transplant",
        "cell therapy",
        "regenerative medicine",
        "cellular therapy"
    ],
    "mesenchymal stem cells": [
        "MSC",
        "MSCs",
        "mesenchymal stromal cells"
    ],
    "cord blood": [
        "umbilical cord blood",
        "UCB",
        "cord blood transplant"
    ],
    "therapeutic hypothermia": [
        "cooling therapy",
        "brain cooling",
        "hypothermia treatment"
    ],

    # General medical terms
    "pediatric": [
        "children",
        "child",
        "pediatrics",
        "paediatric"
    ],
    "neonatal": [
        "newborn",
        "neonate",
        "infant"
    ],
}


def expand_medical_query(query: str) -> List[str]:
    """Expand a medical search query with synonyms.

    Args:
        query: Original search query

    Returns:
        List of expanded search terms
    """
    terms: Set[str] = {query}
    query_lower = query.lower()

    # Check direct matches
    if query_lower in MEDICAL_SYNONYMS:
        terms.update(MEDICAL_SYNONYMS[query_lower])

    # Check if query contains any known terms
    for term, synonyms in MEDICAL_SYNONYMS.items():
        if term in query_lower:
            terms.update(synonyms)
        # Also check if any synonym is in the query
        for synonym in synonyms:
            if synonym.lower() in query_lower:
                terms.add(term)
                terms.update(synonyms)

    return list(terms)


def get_synonyms(term: str) -> List[str]:
    """Get synonyms for a medical term.

    Args:
        term: Medical term

    Returns:
        List of synonyms (empty if not found)
    """
    term_lower = term.lower()

    if term_lower in MEDICAL_SYNONYMS:
        return MEDICAL_SYNONYMS[term_lower]

    # Check if term is a synonym of something
    for main_term, synonyms in MEDICAL_SYNONYMS.items():
        if term_lower in [s.lower() for s in synonyms]:
            return [main_term] + [s for s in synonyms if s.lower() != term_lower]

    return []


def get_related_conditions(condition: str) -> List[str]:
    """Get conditions related to the given condition.

    Args:
        condition: Medical condition

    Returns:
        List of related conditions
    """
    # Related conditions mapping
    related: Dict[str, List[str]] = {
        "hie": [
            "cerebral palsy",
            "epilepsy",
            "developmental delay",
            "cognitive impairment"
        ],
        "cerebral palsy": [
            "epilepsy",
            "developmental delay",
            "spasticity"
        ],
        "stroke": [
            "hemiplegia",
            "aphasia",
            "cognitive impairment"
        ],
        "autism": [
            "developmental delay",
            "intellectual disability",
            "ADHD"
        ],
    }

    condition_lower = condition.lower()

    if condition_lower in related:
        return related[condition_lower]

    # Check synonyms
    for main_term, synonyms in MEDICAL_SYNONYMS.items():
        if condition_lower == main_term or condition_lower in [s.lower() for s in synonyms]:
            if main_term in related:
                return related[main_term]

    return []


def normalize_condition_name(condition: str) -> str:
    """Normalize a condition name to standard form.

    Args:
        condition: Condition name (possibly abbreviated)

    Returns:
        Normalized condition name
    """
    condition_lower = condition.lower().strip()

    # Abbreviation mappings
    abbreviations = {
        "hie": "hypoxic-ischemic encephalopathy",
        "cp": "cerebral palsy",
        "asd": "autism spectrum disorder",
        "cva": "stroke",
        "tbi": "traumatic brain injury",
        "sci": "spinal cord injury",
        "ms": "multiple sclerosis",
        "als": "amyotrophic lateral sclerosis",
        "msc": "mesenchymal stem cells",
        "ucb": "umbilical cord blood",
    }

    if condition_lower in abbreviations:
        return abbreviations[condition_lower]

    return condition
