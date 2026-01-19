"""PubMed API scraper for scientific literature."""

from typing import List, Dict, Any, Optional
import xmltodict

from .base_scraper import BaseScraper


class PubMedScraper(BaseScraper):
    """Scraper for PubMed (NCBI E-utilities).

    Used to find related scientific literature for clinical trials.
    API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
    """

    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    def __init__(self, api_key: str = None):
        super().__init__()
        self.api_key = api_key
        # 3 requests/sec without API key, 10 with API key
        self.rate_limit = 10.0 if api_key else 3.0

    @property
    def source_name(self) -> str:
        return "pubmed"

    async def search(
        self,
        condition: str,
        status: List[str] = None,
        max_results: int = 100,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Search PubMed for clinical trial articles.

        Args:
            condition: Medical condition to search for
            status: Not used for PubMed
            max_results: Maximum number of results

        Returns:
            List of article data
        """
        # Build search query - focus on clinical trials
        query = f'({condition}) AND ("clinical trial"[Publication Type])'

        params = {
            "db": "pubmed",
            "term": query,
            "retmax": min(max_results, 1000),
            "retmode": "json",
            "usehistory": "y"
        }

        if self.api_key:
            params["api_key"] = self.api_key

        try:
            # First, search to get IDs
            response = await self._get(f"{self.BASE_URL}/esearch.fcgi", params=params)
            search_data = response.json()

            result = search_data.get("esearchresult", {})
            id_list = result.get("idlist", [])

            if not id_list:
                return []

            # Fetch details for the IDs
            articles = await self._fetch_details(id_list)
            return articles

        except Exception as e:
            print(f"PubMed search error: {e}")
            return []

    async def _fetch_details(self, pmids: List[str]) -> List[Dict[str, Any]]:
        """Fetch detailed article information.

        Args:
            pmids: List of PubMed IDs

        Returns:
            List of article details
        """
        articles = []

        # Fetch in batches of 200
        batch_size = 200
        for i in range(0, len(pmids), batch_size):
            batch = pmids[i:i + batch_size]

            params = {
                "db": "pubmed",
                "id": ",".join(batch),
                "retmode": "xml",
                "rettype": "abstract"
            }

            if self.api_key:
                params["api_key"] = self.api_key

            try:
                response = await self._get(f"{self.BASE_URL}/efetch.fcgi", params=params)
                data = xmltodict.parse(response.text)

                article_set = data.get("PubmedArticleSet", {})
                pubmed_articles = article_set.get("PubmedArticle", [])

                if isinstance(pubmed_articles, dict):
                    pubmed_articles = [pubmed_articles]

                for article in pubmed_articles:
                    parsed = self._parse_article(article)
                    if parsed:
                        articles.append(parsed)

            except Exception as e:
                print(f"PubMed fetch error: {e}")

        return articles

    def _parse_article(self, article: Dict) -> Optional[Dict[str, Any]]:
        """Parse a PubMed article record."""
        try:
            medline = article.get("MedlineCitation", {})
            article_data = medline.get("Article", {})

            pmid = medline.get("PMID", {})
            if isinstance(pmid, dict):
                pmid = pmid.get("#text", "")

            # Title
            title = article_data.get("ArticleTitle", "")

            # Abstract
            abstract_data = article_data.get("Abstract", {})
            abstract_text = abstract_data.get("AbstractText", "")
            if isinstance(abstract_text, list):
                abstract_text = " ".join(
                    t.get("#text", t) if isinstance(t, dict) else t
                    for t in abstract_text
                )
            elif isinstance(abstract_text, dict):
                abstract_text = abstract_text.get("#text", "")

            # Authors
            author_list = article_data.get("AuthorList", {}).get("Author", [])
            if isinstance(author_list, dict):
                author_list = [author_list]
            authors = []
            for author in author_list:
                if isinstance(author, dict):
                    last_name = author.get("LastName", "")
                    first_name = author.get("ForeName", "")
                    if last_name:
                        authors.append(f"{last_name} {first_name}".strip())

            # Journal
            journal = article_data.get("Journal", {})
            journal_title = journal.get("Title", "")

            # Publication date
            pub_date = article_data.get("Journal", {}).get("JournalIssue", {}).get("PubDate", {})
            year = pub_date.get("Year", "")
            month = pub_date.get("Month", "")
            day = pub_date.get("Day", "")

            # MeSH terms (medical subject headings)
            mesh_list = medline.get("MeshHeadingList", {}).get("MeshHeading", [])
            if isinstance(mesh_list, dict):
                mesh_list = [mesh_list]
            mesh_terms = []
            for mesh in mesh_list:
                if isinstance(mesh, dict):
                    descriptor = mesh.get("DescriptorName", {})
                    if isinstance(descriptor, dict):
                        mesh_terms.append(descriptor.get("#text", ""))

            # Publication types
            pub_types = article_data.get("PublicationTypeList", {}).get("PublicationType", [])
            if isinstance(pub_types, dict):
                pub_types = [pub_types]
            pub_type_names = []
            for pt in pub_types:
                if isinstance(pt, dict):
                    pub_type_names.append(pt.get("#text", ""))
                else:
                    pub_type_names.append(pt)

            return {
                "pmid": pmid,
                "title": title,
                "abstract": abstract_text,
                "authors": authors,
                "journal": journal_title,
                "year": year,
                "month": month,
                "day": day,
                "mesh_terms": mesh_terms,
                "publication_types": pub_type_names,
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
            }

        except Exception as e:
            print(f"Error parsing PubMed article: {e}")
            return None

    def normalize(self, raw_trial: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize PubMed article to trial-like format.

        Note: PubMed articles are not trials, but can provide
        supplementary information about related research.
        """
        pmid = raw_trial.get("pmid", "")

        return {
            "nct_id": None,
            "eudract_id": None,
            "who_id": None,
            "isrctn_id": None,

            "title_original": raw_trial.get("title"),
            "summary_original": raw_trial.get("abstract"),
            "eligibility_original": None,

            "condition": raw_trial.get("mesh_terms", []),
            "intervention_type": "PUBLICATION",
            "intervention_name": None,

            "phase": None,
            "status": "PUBLISHED",
            "enrollment_target": None,

            "start_date": None,
            "completion_date": f"{raw_trial.get('year', '')}-{raw_trial.get('month', '01')}-{raw_trial.get('day', '01')}",

            "sponsor": raw_trial.get("journal"),
            "lead_sponsor_type": "JOURNAL",

            "location_countries": [],
            "location_cities": [],
            "location_facilities": [],

            "contact_name": ", ".join(raw_trial.get("authors", [])[:3]),
            "contact_email": None,
            "contact_phone": None,

            "age_min": None,
            "age_max": None,
            "gender": None,

            "source_registry": self.source_name,
            "source_url": raw_trial.get("url"),
            "source_ids": {"pmid": pmid},

            "_sources": [self.source_name],
            "_is_publication": True
        }
