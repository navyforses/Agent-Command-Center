"""Deduplication service for clinical trials."""

from typing import List, Dict, Any, Set, Optional
from difflib import SequenceMatcher
import hashlib


class Deduplicator:
    """Removes duplicate trials from aggregated results."""

    def __init__(self, similarity_threshold: float = 0.85):
        """Initialize the deduplicator.

        Args:
            similarity_threshold: Minimum title similarity to consider a duplicate (0-1)
        """
        self.similarity_threshold = similarity_threshold

    def deduplicate(self, trials: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate trials based on IDs and title similarity.

        Args:
            trials: List of trial records from multiple sources

        Returns:
            List of unique trials with merged source information
        """
        if not trials:
            return []

        # First pass: exact ID matching
        id_groups = self._group_by_ids(trials)

        # Convert groups to unique trials
        unique_trials = list(id_groups.values())

        # Second pass: fuzzy title matching for remaining
        final_trials = self._merge_similar_titles(unique_trials)

        return final_trials

    def _group_by_ids(self, trials: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Group trials by their unique identifiers.

        Args:
            trials: List of trial records

        Returns:
            Dictionary mapping identifiers to merged trial records
        """
        id_groups = {}

        for trial in trials:
            matched_key = None

            # Check all possible IDs
            id_fields = ["nct_id", "eudract_id", "who_id", "isrctn_id"]

            for id_field in id_fields:
                trial_id = trial.get(id_field)
                if trial_id:
                    key = f"{id_field}:{trial_id}"

                    if key in id_groups:
                        # Merge with existing trial
                        self._merge_trials(id_groups[key], trial)
                        matched_key = key
                        break
                    else:
                        # New trial with this ID
                        id_groups[key] = trial.copy()
                        matched_key = key
                        break

            if not matched_key:
                # No ID found, use title hash as key
                title = trial.get("title_original", "")
                if title:
                    title_hash = self._hash_title(title)
                    key = f"title:{title_hash}"

                    if key in id_groups:
                        self._merge_trials(id_groups[key], trial)
                    else:
                        id_groups[key] = trial.copy()
                else:
                    # No title either, create unique key
                    import uuid
                    id_groups[f"unknown:{uuid.uuid4()}"] = trial.copy()

        return id_groups

    def _merge_similar_titles(
        self,
        trials: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Merge trials with similar titles.

        Args:
            trials: List of potentially unique trials

        Returns:
            List with similar titles merged
        """
        final_trials = []

        for trial in trials:
            is_duplicate = False
            title = trial.get("title_original", "")

            for existing in final_trials:
                existing_title = existing.get("title_original", "")

                similarity = self._title_similarity(title, existing_title)

                if similarity > self.similarity_threshold:
                    # Merge with existing trial
                    self._merge_trials(existing, trial)
                    is_duplicate = True
                    break

            if not is_duplicate:
                final_trials.append(trial)

        return final_trials

    def _merge_trials(self, target: Dict[str, Any], source: Dict[str, Any]):
        """Merge source trial data into target.

        Args:
            target: Trial to merge into
            source: Trial to merge from
        """
        # Merge sources list
        target_sources = set(target.get("_sources", []))
        source_sources = set(source.get("_sources", []))
        target["_sources"] = list(target_sources | source_sources)

        # Merge IDs (fill in missing)
        id_fields = ["nct_id", "eudract_id", "who_id", "isrctn_id"]
        for field in id_fields:
            if not target.get(field) and source.get(field):
                target[field] = source[field]

        # Merge source_ids
        target_ids = target.get("source_ids", {}) or {}
        source_ids = source.get("source_ids", {}) or {}
        target["source_ids"] = {**target_ids, **source_ids}

        # Prefer more complete data
        # Fill in missing fields from source
        fields_to_merge = [
            "title_original", "summary_original", "eligibility_original",
            "phase", "status", "enrollment_target",
            "start_date", "completion_date",
            "sponsor", "lead_sponsor_type",
            "contact_name", "contact_email", "contact_phone",
            "age_min", "age_max", "gender"
        ]

        for field in fields_to_merge:
            if not target.get(field) and source.get(field):
                target[field] = source[field]

        # Merge array fields (combine unique values)
        array_fields = [
            "condition", "location_countries", "location_cities", "location_facilities"
        ]

        for field in array_fields:
            target_values = target.get(field, []) or []
            source_values = source.get(field, []) or []

            if isinstance(target_values, list) and isinstance(source_values, list):
                combined = list(dict.fromkeys(target_values + source_values))
                target[field] = combined

    def _title_similarity(self, title1: str, title2: str) -> float:
        """Calculate similarity between two titles.

        Args:
            title1: First title
            title2: Second title

        Returns:
            Similarity score between 0 and 1
        """
        if not title1 or not title2:
            return 0.0

        # Normalize titles
        t1 = self._normalize_title(title1)
        t2 = self._normalize_title(title2)

        # Use SequenceMatcher for fuzzy matching
        return SequenceMatcher(None, t1, t2).ratio()

    def _normalize_title(self, title: str) -> str:
        """Normalize a title for comparison.

        Args:
            title: Title to normalize

        Returns:
            Normalized title (lowercase, stripped, common words removed)
        """
        # Lowercase and strip
        title = title.lower().strip()

        # Remove common words that don't add meaning
        stop_words = {
            "a", "an", "the", "and", "or", "of", "in", "to", "for",
            "with", "on", "at", "by", "from", "study", "trial",
            "clinical", "randomized", "randomised", "controlled",
            "double-blind", "double blind", "single-blind", "single blind",
            "phase", "open-label", "open label"
        }

        words = title.split()
        filtered_words = [w for w in words if w not in stop_words]

        return " ".join(filtered_words)

    def _hash_title(self, title: str) -> str:
        """Create a hash of a normalized title.

        Args:
            title: Title to hash

        Returns:
            MD5 hash of normalized title
        """
        normalized = self._normalize_title(title)
        return hashlib.md5(normalized.encode()).hexdigest()[:12]

    def find_duplicates(
        self,
        trials: List[Dict[str, Any]]
    ) -> List[List[Dict[str, Any]]]:
        """Find groups of duplicate trials without merging.

        Args:
            trials: List of trial records

        Returns:
            List of duplicate groups (each group is a list of similar trials)
        """
        groups = []
        used_indices = set()

        for i, trial1 in enumerate(trials):
            if i in used_indices:
                continue

            group = [trial1]
            used_indices.add(i)

            title1 = trial1.get("title_original", "")

            for j, trial2 in enumerate(trials[i + 1:], start=i + 1):
                if j in used_indices:
                    continue

                # Check ID match
                id_match = any(
                    trial1.get(f) and trial1.get(f) == trial2.get(f)
                    for f in ["nct_id", "eudract_id", "who_id", "isrctn_id"]
                )

                # Check title similarity
                title2 = trial2.get("title_original", "")
                title_similar = self._title_similarity(title1, title2) > self.similarity_threshold

                if id_match or title_similar:
                    group.append(trial2)
                    used_indices.add(j)

            if len(group) > 1:
                groups.append(group)

        return groups
