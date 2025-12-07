interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  answer?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  summary?: string;
}

export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.error("TAVILY_API_KEY not configured");
    return { results: [], query, summary: undefined };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_answer: true,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tavily API error: ${response.status} - ${errorText}`);
      return { results: [], query, summary: undefined };
    }

    const data: TavilySearchResponse = await response.json();
    
    const results: SearchResult[] = data.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score,
    }));

    return {
      results,
      query: data.query,
      summary: data.answer,
    };
  } catch (error) {
    console.error("Tavily search error:", error);
    return { results: [], query, summary: undefined };
  }
}

export function formatSearchResultsForAI(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }

  return results
    .map((r, i) => `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
    .join("\n\n");
}

export function shouldTriggerSearch(message: string): boolean {
  const searchTriggers = [
    /\b(find|search|look up|lookup|locate|discover)\b/i,
    /\b(latest|recent|current|new|updated|2024|2025)\b.*\b(research|study|studies|trial|trials|treatment|therapy)\b/i,
    /\b(research|study|studies|trial|trials)\b.*\b(latest|recent|current|new|updated)\b/i,
    /\b(clinic|hospital|doctor|specialist|center|centre)\b.*\b(near|in|at|for)\b/i,
    /\bwho (is|are)\b/i,
    /\bwhat (is|are) the (best|top|leading)\b/i,
    /\bwhere (can|do|is)\b/i,
    /\bhow (to|do|can)\b.*\bfind\b/i,
    /\bcontact\b.*\b(info|information|details|number|email)\b/i,
    /\bclinical trial/i,
    /\bHIE (expert|specialist|doctor|clinic)/i,
    /\bpediatric neurologist/i,
    /\btherapy (center|centre|provider)/i,
  ];

  return searchTriggers.some((pattern) => pattern.test(message));
}
