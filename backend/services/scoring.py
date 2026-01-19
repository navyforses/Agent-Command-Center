"""Relevance scoring service for clinical trials."""

from typing import List, Dict, Any, Optional
import re
from datetime import datetime


class RelevanceScorer:
    """Calculates relevance scores for clinical trials."""

    def __init__(self):
        # Weights for different factors
        self.weights = {
            "title_match": 30,
            "condition_match": 25,
            "summary_match": 15,
            "status_recruiting": 20,
            "recency": 10
        }

    def score_all(
        self,
        trials: List[Dict[str, Any]],
        query: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Score all trials for relevance.

        Args:
            trials: List of trials to score
            query: Original search query
            user_context: Optional user preferences/context

        Returns:
            Trials with relevance_score field added
        """
        query_terms = self._tokenize(query)

        for trial in trials:
            score = self.score_trial(trial, query_terms, user_context)
            trial["relevance_score"] = score

        return trials

    def score_trial(
        self,
        trial: Dict[str, Any],
        query_terms: List[str],
        user_context: Optional[Dict[str, Any]] = None
    ) -> float:
        """Calculate relevance score for a single trial.

        Args:
            trial: Trial data
            query_terms: Tokenized search terms
            user_context: Optional user context

        Returns:
            Relevance score (0-100)
        """
        score = 0.0

        # Title match
        title = trial.get("title_original", "").lower()
        title_score = self._calculate_term_match(title, query_terms)
        score += title_score * self.weights["title_match"]

        # Condition match
        conditions = trial.get("condition", [])
        if conditions:
            condition_text = " ".join(conditions).lower()
            condition_score = self._calculate_term_match(condition_text, query_terms)
            score += condition_score * self.weights["condition_match"]

        # Summary match
        summary = trial.get("summary_original", "").lower()
        summary_score = self._calculate_term_match(summary, query_terms)
        score += summary_score * self.weights["summary_match"]

        # Status bonus (recruiting trials are more relevant)
        status = trial.get("status", "").upper()
        if status in ["RECRUITING", "NOT_YET_RECRUITING"]:
            score += self.weights["status_recruiting"]
        elif status == "ACTIVE_NOT_RECRUITING":
            score += self.weights["status_recruiting"] * 0.5

        # Recency bonus
        recency_score = self._calculate_recency(trial)
        score += recency_score * self.weights["recency"]

        # User context adjustments
        if user_context:
            score = self._apply_user_context(score, trial, user_context)

        # Normalize to 0-100
        max_possible = sum(self.weights.values())
        normalized_score = min(100, (score / max_possible) * 100)

        return round(normalized_score, 2)

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into search terms.

        Args:
            text: Text to tokenize

        Returns:
            List of lowercase terms
        """
        # Remove special characters and split
        text = re.sub(r"[^\w\s]", " ", text.lower())
        terms = text.split()

        # Remove common stop words
        stop_words = {
            "a", "an", "the", "and", "or", "of", "in", "to", "for",
            "with", "on", "at", "by", "from", "is", "are", "was", "were"
        }

        terms = [t for t in terms if t not in stop_words and len(t) > 2]

        return terms

    def _calculate_term_match(self, text: str, query_terms: List[str]) -> float:
        """Calculate how well text matches query terms.

        Args:
            text: Text to search in
            query_terms: Terms to search for

        Returns:
            Match score (0-1)
        """
        if not query_terms or not text:
            return 0.0

        matches = 0
        total_terms = len(query_terms)

        for term in query_terms:
            if term in text:
                # Exact word match gets full point
                if re.search(rf"\b{re.escape(term)}\b", text):
                    matches += 1.0
                else:
                    # Partial match gets half point
                    matches += 0.5

        return matches / total_terms if total_terms > 0 else 0.0

    def _calculate_recency(self, trial: Dict[str, Any]) -> float:
        """Calculate recency score based on trial dates.

        Args:
            trial: Trial data

        Returns:
            Recency score (0-1)
        """
        # Check for update date or start date
        date_str = trial.get("updated_at") or trial.get("start_date")

        if not date_str:
            return 0.5  # Middle ground if no date

        try:
            # Parse date
            if isinstance(date_str, str):
                for fmt in ["%Y-%m-%d", "%Y-%m", "%Y"]:
                    try:
                        date = datetime.strptime(date_str[:len(fmt.replace("%", ""))], fmt)
                        break
                    except ValueError:
                        continue
                else:
                    return 0.5
            else:
                date = date_str

            # Calculate days since update
            days_ago = (datetime.now() - date).days

            # Score based on recency (more recent = higher score)
            if days_ago < 30:
                return 1.0
            elif days_ago < 90:
                return 0.8
            elif days_ago < 180:
                return 0.6
            elif days_ago < 365:
                return 0.4
            else:
                return 0.2

        except Exception:
            return 0.5

    def _apply_user_context(
        self,
        score: float,
        trial: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> float:
        """Apply user-specific adjustments to score.

        Args:
            score: Current score
            trial: Trial data
            user_context: User preferences/context

        Returns:
            Adjusted score
        """
        # Location preference
        preferred_countries = user_context.get("preferred_countries", [])
        if preferred_countries:
            trial_countries = set(trial.get("location_countries", []))
            if trial_countries & set(preferred_countries):
                score *= 1.2  # 20% bonus

        # Age group preference
        user_age = user_context.get("patient_age")
        if user_age:
            if self._age_matches(trial, user_age):
                score *= 1.1  # 10% bonus

        # Condition/diagnosis match
        user_diagnosis = user_context.get("diagnosis", [])
        if user_diagnosis:
            conditions = trial.get("condition", [])
            if any(d.lower() in " ".join(conditions).lower() for d in user_diagnosis):
                score *= 1.15  # 15% bonus

        return score

    def _age_matches(self, trial: Dict[str, Any], patient_age: int) -> bool:
        """Check if trial age requirements match patient age.

        Args:
            trial: Trial data
            patient_age: Patient age in years

        Returns:
            True if age matches
        """
        try:
            age_min_str = trial.get("age_min", "")
            age_max_str = trial.get("age_max", "")

            # Parse minimum age
            min_age = 0
            if age_min_str:
                age_num = "".join(filter(str.isdigit, age_min_str))
                if age_num:
                    min_age = int(age_num)
                    if "month" in age_min_str.lower():
                        min_age = min_age / 12
                    elif "day" in age_min_str.lower():
                        min_age = min_age / 365

            # Parse maximum age
            max_age = 999
            if age_max_str:
                age_num = "".join(filter(str.isdigit, age_max_str))
                if age_num:
                    max_age = int(age_num)
                    if "month" in age_max_str.lower():
                        max_age = max_age / 12
                    elif "day" in age_max_str.lower():
                        max_age = max_age / 365

            return min_age <= patient_age <= max_age

        except Exception:
            return True  # Assume match if can't parse
