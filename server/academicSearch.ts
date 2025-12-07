export interface AcademicPaper {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  publicationDate?: string;
  year?: number;
  journal?: string;
  doi?: string;
  url?: string;
  citationCount?: number;
  openAccessUrl?: string;
  concepts?: string[];
  fields?: string[];
  source: "openalex" | "semantic_scholar" | "pubmed";
}

export interface AcademicSearchResult {
  papers: AcademicPaper[];
  query: string;
  totalResults: number;
  source: string;
  crossDisciplinaryMatches?: AcademicPaper[];
}

export interface UnifiedAcademicSearchResult {
  papers: AcademicPaper[];
  query: string;
  sources: string[];
  totalResults: number;
  crossDisciplinaryInsights?: {
    field: string;
    relevantPapers: AcademicPaper[];
    potentialApplications: string[];
  }[];
}

interface OpenAlexWork {
  id: string;
  title: string;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: { author: { display_name: string } }[];
  publication_date?: string;
  publication_year?: number;
  primary_location?: {
    source?: { display_name: string };
  };
  doi?: string;
  open_access?: {
    oa_url?: string;
    is_oa?: boolean;
  };
  cited_by_count?: number;
  concepts?: { display_name: string; score: number }[];
  topics?: { display_name: string; score: number }[];
}

interface OpenAlexResponse {
  results: OpenAlexWork[];
  meta: {
    count: number;
    page: number;
    per_page: number;
  };
}

function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | undefined {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
    return undefined;
  }

  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }

  words.sort((a, b) => a[1] - b[1]);
  return words.map(([word]) => word).join(" ");
}

function mapOpenAlexToPaper(work: OpenAlexWork): AcademicPaper {
  return {
    id: work.id,
    title: work.title || "Untitled",
    abstract: reconstructAbstract(work.abstract_inverted_index),
    authors: work.authorships?.map((a) => a.author.display_name) || [],
    publicationDate: work.publication_date,
    year: work.publication_year,
    journal: work.primary_location?.source?.display_name,
    doi: work.doi,
    url: work.doi ? `https://doi.org/${work.doi.replace("https://doi.org/", "")}` : undefined,
    citationCount: work.cited_by_count,
    openAccessUrl: work.open_access?.oa_url,
    concepts: work.concepts?.slice(0, 10).map((c) => c.display_name) || [],
    fields: work.topics?.slice(0, 5).map((t) => t.display_name) || [],
    source: "openalex",
  };
}

export async function searchOpenAlex(
  query: string,
  options: {
    maxResults?: number;
    yearFrom?: number;
    yearTo?: number;
    openAccessOnly?: boolean;
    sortBy?: "relevance" | "cited_by_count" | "publication_date";
  } = {}
): Promise<AcademicSearchResult> {
  const { maxResults = 25, yearFrom, yearTo, openAccessOnly = false, sortBy = "relevance" } = options;

  try {
    const params = new URLSearchParams();
    params.set("search", query);
    params.set("per_page", maxResults.toString());

    const filters: string[] = [];

    if (yearFrom) {
      filters.push(`publication_year:>${yearFrom - 1}`);
    }
    if (yearTo) {
      filters.push(`publication_year:<${yearTo + 1}`);
    }
    if (openAccessOnly) {
      filters.push("open_access.is_oa:true");
    }

    if (filters.length > 0) {
      params.set("filter", filters.join(","));
    }

    if (sortBy === "cited_by_count") {
      params.set("sort", "cited_by_count:desc");
    } else if (sortBy === "publication_date") {
      params.set("sort", "publication_date:desc");
    }

    params.set("mailto", "hie-command-center@replit.app");

    const url = `https://api.openalex.org/works?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "HIE-Parent-Command-Center/1.0 (mailto:hie-command-center@replit.app)",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAlex API error: ${response.status} - ${errorText}`);
      return {
        papers: [],
        query,
        totalResults: 0,
        source: "OpenAlex",
      };
    }

    const data: OpenAlexResponse = await response.json();

    const papers = data.results.map(mapOpenAlexToPaper);

    return {
      papers,
      query,
      totalResults: data.meta.count,
      source: "OpenAlex",
    };
  } catch (error) {
    console.error("OpenAlex search error:", error);
    return {
      papers: [],
      query,
      totalResults: 0,
      source: "OpenAlex",
    };
  }
}

export async function searchOpenAlexCrossDisciplinary(
  medicalQuery: string,
  targetDisciplines: string[] = ["physics", "engineering", "mathematics", "computer science", "materials science"],
  maxResultsPerDiscipline: number = 10
): Promise<AcademicSearchResult> {
  const allPapers: AcademicPaper[] = [];

  const crossDisciplinaryQueries = targetDisciplines.map((discipline) => {
    const conceptualQuery = extractCoreConceptsForCrossDisciplinary(medicalQuery);
    return `${conceptualQuery} ${discipline}`;
  });

  const searchPromises = crossDisciplinaryQueries.map((q) =>
    searchOpenAlex(q, {
      maxResults: maxResultsPerDiscipline,
      sortBy: "relevance",
    })
  );

  const results = await Promise.all(searchPromises);

  for (const result of results) {
    allPapers.push(...result.papers);
  }

  const uniquePapers = deduplicatePapers(allPapers);

  return {
    papers: uniquePapers,
    query: medicalQuery,
    totalResults: uniquePapers.length,
    source: "OpenAlex (Cross-Disciplinary)",
    crossDisciplinaryMatches: uniquePapers,
  };
}

function extractCoreConceptsForCrossDisciplinary(medicalQuery: string): string {
  const medicalToUniversalConcepts: Record<string, string[]> = {
    "hypoxic-ischemic encephalopathy": ["oxygen deprivation", "cellular damage", "neuroprotection", "recovery"],
    "hie": ["hypoxia", "ischemia", "brain injury", "neural repair"],
    "neuroprotection": ["protection mechanisms", "damage prevention", "cellular repair"],
    "neuroplasticity": ["plasticity", "adaptation", "reorganization", "learning"],
    "hypothermia": ["cooling", "temperature regulation", "thermal protection"],
    "rehabilitation": ["recovery", "restoration", "adaptation", "training"],
    "stem cell": ["regeneration", "cell therapy", "tissue repair"],
    "brain injury": ["neural damage", "repair mechanisms", "recovery"],
    "seizure": ["electrical activity", "signal patterns", "control mechanisms"],
    "cerebral palsy": ["motor control", "movement patterns", "coordination"],
    "therapy": ["treatment", "intervention", "improvement"],
    "developmental delay": ["development", "growth patterns", "milestones"],
  };

  let conceptualQuery = medicalQuery.toLowerCase();

  for (const [medical, universal] of Object.entries(medicalToUniversalConcepts)) {
    if (conceptualQuery.includes(medical)) {
      conceptualQuery = universal.join(" OR ");
      break;
    }
  }

  return conceptualQuery;
}

function deduplicatePapers(papers: AcademicPaper[]): AcademicPaper[] {
  const seen = new Set<string>();
  return papers.filter((paper) => {
    const key = paper.doi || paper.title.toLowerCase().substring(0, 100);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  authors?: { name: string }[];
  publicationDate?: string;
  year?: number;
  venue?: string;
  externalIds?: { DOI?: string };
  url?: string;
  citationCount?: number;
  isOpenAccess?: boolean;
  openAccessPdf?: { url: string };
  fieldsOfStudy?: string[];
}

interface SemanticScholarResponse {
  total: number;
  data: SemanticScholarPaper[];
}

function mapSemanticScholarToPaper(paper: SemanticScholarPaper): AcademicPaper {
  return {
    id: paper.paperId,
    title: paper.title || "Untitled",
    abstract: paper.abstract,
    authors: paper.authors?.map((a) => a.name) || [],
    publicationDate: paper.publicationDate,
    year: paper.year,
    journal: paper.venue,
    doi: paper.externalIds?.DOI,
    url: paper.url || (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : undefined),
    citationCount: paper.citationCount,
    openAccessUrl: paper.openAccessPdf?.url,
    fields: paper.fieldsOfStudy || [],
    source: "semantic_scholar",
  };
}

export async function searchSemanticScholar(
  query: string,
  options: {
    maxResults?: number;
    yearFrom?: number;
    yearTo?: number;
    openAccessOnly?: boolean;
    fieldsOfStudy?: string[];
  } = {}
): Promise<AcademicSearchResult> {
  const { maxResults = 25, yearFrom, yearTo, openAccessOnly = false, fieldsOfStudy } = options;

  try {
    const params = new URLSearchParams();
    params.set("query", query);
    params.set("limit", maxResults.toString());
    params.set(
      "fields",
      "paperId,title,abstract,authors,publicationDate,year,venue,externalIds,url,citationCount,isOpenAccess,openAccessPdf,fieldsOfStudy"
    );

    if (yearFrom || yearTo) {
      const yearFilter = `${yearFrom || 1900}-${yearTo || new Date().getFullYear()}`;
      params.set("year", yearFilter);
    }

    if (openAccessOnly) {
      params.set("openAccessPdf", "");
    }

    if (fieldsOfStudy && fieldsOfStudy.length > 0) {
      params.set("fieldsOfStudy", fieldsOfStudy.join(","));
    }

    const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Semantic Scholar API error: ${response.status} - ${errorText}`);
      return {
        papers: [],
        query,
        totalResults: 0,
        source: "Semantic Scholar",
      };
    }

    const data: SemanticScholarResponse = await response.json();

    const papers = data.data.map(mapSemanticScholarToPaper);

    return {
      papers,
      query,
      totalResults: data.total,
      source: "Semantic Scholar",
    };
  } catch (error) {
    console.error("Semantic Scholar search error:", error);
    return {
      papers: [],
      query,
      totalResults: 0,
      source: "Semantic Scholar",
    };
  }
}

export async function searchSemanticScholarRecommendations(
  paperIds: string[],
  maxResults: number = 20
): Promise<AcademicPaper[]> {
  if (paperIds.length === 0) {
    return [];
  }

  try {
    const recommendations: AcademicPaper[] = [];

    for (const paperId of paperIds.slice(0, 3)) {
      const url = `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paperId}?limit=${Math.ceil(maxResults / paperIds.length)}&fields=paperId,title,abstract,authors,year,venue,citationCount,fieldsOfStudy`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recommendedPapers) {
          recommendations.push(...data.recommendedPapers.map(mapSemanticScholarToPaper));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return deduplicatePapers(recommendations);
  } catch (error) {
    console.error("Semantic Scholar recommendations error:", error);
    return [];
  }
}

export async function searchAcademicSources(
  query: string,
  options: {
    maxResults?: number;
    yearFrom?: number;
    yearTo?: number;
    openAccessOnly?: boolean;
    includeCrossDisciplinary?: boolean;
    targetDisciplines?: string[];
  } = {}
): Promise<UnifiedAcademicSearchResult> {
  const {
    maxResults = 20,
    yearFrom,
    yearTo,
    openAccessOnly = false,
    includeCrossDisciplinary = true,
    targetDisciplines = ["physics", "engineering", "mathematics", "computer science"],
  } = options;

  const searchPromises: Promise<AcademicSearchResult>[] = [
    searchOpenAlex(query, { maxResults, yearFrom, yearTo, openAccessOnly, sortBy: "relevance" }),
    searchSemanticScholar(query, { maxResults, yearFrom, yearTo, openAccessOnly }),
  ];

  if (includeCrossDisciplinary) {
    searchPromises.push(
      searchOpenAlexCrossDisciplinary(query, targetDisciplines, Math.ceil(maxResults / targetDisciplines.length))
    );
  }

  const results = await Promise.all(searchPromises);

  const allPapers: AcademicPaper[] = [];
  const sources: string[] = [];

  for (const result of results) {
    if (result.papers.length > 0) {
      allPapers.push(...result.papers);
      if (!sources.includes(result.source)) {
        sources.push(result.source);
      }
    }
  }

  const uniquePapers = deduplicatePapers(allPapers);

  uniquePapers.sort((a, b) => {
    const aScore = (a.citationCount || 0) * 0.7 + (a.year || 2000) * 0.3;
    const bScore = (b.citationCount || 0) * 0.7 + (b.year || 2000) * 0.3;
    return bScore - aScore;
  });

  const crossDisciplinaryInsights = includeCrossDisciplinary
    ? extractCrossDisciplinaryInsights(uniquePapers, targetDisciplines)
    : undefined;

  return {
    papers: uniquePapers.slice(0, maxResults * 2),
    query,
    sources,
    totalResults: uniquePapers.length,
    crossDisciplinaryInsights,
  };
}

function extractCrossDisciplinaryInsights(
  papers: AcademicPaper[],
  targetDisciplines: string[]
): {
  field: string;
  relevantPapers: AcademicPaper[];
  potentialApplications: string[];
}[] {
  const insights: {
    field: string;
    relevantPapers: AcademicPaper[];
    potentialApplications: string[];
  }[] = [];

  for (const discipline of targetDisciplines) {
    const relevantPapers = papers.filter((paper) => {
      const fieldsLower = (paper.fields || []).map((f) => f.toLowerCase());
      const conceptsLower = (paper.concepts || []).map((c) => c.toLowerCase());
      const allTerms = [...fieldsLower, ...conceptsLower];
      return allTerms.some((term) => term.includes(discipline.toLowerCase()));
    });

    if (relevantPapers.length > 0) {
      insights.push({
        field: discipline,
        relevantPapers: relevantPapers.slice(0, 5),
        potentialApplications: generatePotentialApplications(discipline, relevantPapers),
      });
    }
  }

  return insights;
}

function generatePotentialApplications(discipline: string, papers: AcademicPaper[]): string[] {
  const disciplineApplications: Record<string, string[]> = {
    physics: [
      "Magnetic stimulation techniques for neural repair",
      "Ultrasound-based therapeutic delivery",
      "Biophysical modeling of brain injury recovery",
      "Optical imaging for monitoring neural activity",
    ],
    engineering: [
      "Biomedical device development for therapy",
      "Signal processing for brain monitoring",
      "Robotic rehabilitation systems",
      "Wearable sensors for progress tracking",
    ],
    mathematics: [
      "Predictive modeling of treatment outcomes",
      "Statistical analysis of recovery patterns",
      "Optimization of therapy schedules",
      "Network analysis of neural connectivity",
    ],
    "computer science": [
      "AI-assisted diagnosis and prognosis",
      "Machine learning for treatment optimization",
      "Digital therapeutics and apps",
      "Data-driven personalized medicine",
    ],
    "materials science": [
      "Biocompatible materials for implants",
      "Drug delivery systems",
      "Neural interface materials",
      "Tissue engineering scaffolds",
    ],
  };

  return disciplineApplications[discipline.toLowerCase()] || [
    `Potential applications from ${discipline} research`,
  ];
}

export function formatAcademicResultsForAI(result: UnifiedAcademicSearchResult): string {
  if (result.papers.length === 0) {
    return "No academic papers found.";
  }

  let formatted = `Found ${result.totalResults} papers from: ${result.sources.join(", ")}\n\n`;

  formatted += "## Key Papers\n\n";
  for (const paper of result.papers.slice(0, 10)) {
    formatted += `### ${paper.title}\n`;
    formatted += `- Authors: ${paper.authors.slice(0, 3).join(", ")}${paper.authors.length > 3 ? " et al." : ""}\n`;
    formatted += `- Year: ${paper.year || "N/A"} | Citations: ${paper.citationCount || 0}\n`;
    if (paper.journal) {
      formatted += `- Journal: ${paper.journal}\n`;
    }
    if (paper.abstract) {
      formatted += `- Abstract: ${paper.abstract.substring(0, 300)}...\n`;
    }
    if (paper.url) {
      formatted += `- URL: ${paper.url}\n`;
    }
    formatted += "\n";
  }

  if (result.crossDisciplinaryInsights && result.crossDisciplinaryInsights.length > 0) {
    formatted += "\n## Cross-Disciplinary Insights\n\n";
    for (const insight of result.crossDisciplinaryInsights) {
      formatted += `### ${insight.field}\n`;
      formatted += `Found ${insight.relevantPapers.length} relevant papers\n`;
      formatted += "Potential applications:\n";
      for (const app of insight.potentialApplications) {
        formatted += `- ${app}\n`;
      }
      formatted += "\n";
    }
  }

  return formatted;
}
