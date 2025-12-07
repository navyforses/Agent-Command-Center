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
  source?: string;
}

export interface MultiSearchResponse {
  results: SearchResult[];
  query: string;
  sources: string[];
}

export async function searchWithTavily(query: string, maxResults: number = 5): Promise<SearchResponse> {
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
    
    /(მომიძებნე|მოძებნე|მოიძიე|იპოვე).*(კლინიკა|საავადმყოფო|ექიმი|ნევროლოგი|სპეციალისტი|ცენტრი|ნომერი|კონტაქტი|კვლევა)/i,
    
    /(კლინიკა|საავადმყოფო|ექიმი|ნევროლოგი|სპეციალისტი|ცენტრი).*(ნომერი|ტელეფონი|კონტაქტი|მისამართი)/i,
    
    /(კლინიკა|საავადმყოფო|ექიმი|ნევროლოგი).*(საფრანგეთ|გერმანი|ამერიკა|ევროპა|პარიზ|ბერლინ|ლონდონ)/i,
    
    /(საფრანგეთ|გერმანი|ამერიკა|ევროპა|პარიზ|ბერლინ|ლონდონ).*(კლინიკა|საავადმყოფო|ექიმი|ნევროლოგი)/i,
    
    /HIE.*(კლინიკა|საავადმყოფო|ექიმი|ნევროლოგი|სპეციალისტი|ცენტრი|კვლევა)/i,
    
    /(კლინიკა|საავადმყოფო|ექიმი|ნევროლოგი|სპეციალისტი|ცენტრი|კვლევა).*HIE/i,
    
    /(ვინ არის).*(მთავარი|წამყვანი|საუკეთესო).*(ნევროლოგი|ექიმი|სპეციალისტი)/i,
    
    /(საუკეთესო|წამყვანი|ტოპ).*(კლინიკა|საავადმყოფო|ექიმი|ნევროლოგი|ცენტრი)/i,
  ];

  return searchTriggers.some((pattern) => pattern.test(message));
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
  };
}

export async function searchWithGoogle(query: string, maxResults: number = 5): Promise<SearchResponse> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  
  if (!apiKey || !cx) {
    console.error("GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX not configured");
    return { results: [], query, summary: undefined, source: "Google" };
  }

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", Math.min(maxResults, 10).toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Search API error: ${response.status} - ${errorText}`);
      return { results: [], query, summary: undefined, source: "Google" };
    }

    const data: GoogleSearchResponse = await response.json();
    
    const results: SearchResult[] = (data.items || []).map((item, index) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      score: 1 - (index * 0.1),
    }));

    return {
      results,
      query,
      summary: undefined,
      source: "Google",
    };
  } catch (error) {
    console.error("Google search error:", error);
    return { results: [], query, summary: undefined, source: "Google" };
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let normalized = parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, "");
    const cleanParams = new URLSearchParams();
    const trackingParams = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source", "fbclid", "gclid"]);
    parsed.searchParams.forEach((value, key) => {
      if (!trackingParams.has(key.toLowerCase())) {
        cleanParams.set(key, value);
      }
    });
    const paramString = cleanParams.toString();
    if (paramString) {
      normalized += "?" + paramString;
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export async function searchWebMultiSource(query: string, maxResultsPerSource: number = 5): Promise<MultiSearchResponse> {
  const [tavilyResponse, googleResponse] = await Promise.all([
    searchWithTavily(query, maxResultsPerSource),
    searchWithGoogle(query, maxResultsPerSource),
  ]);

  const allResults: SearchResult[] = [];
  const sources: string[] = [];

  if (tavilyResponse.results.length > 0) {
    allResults.push(...tavilyResponse.results);
    sources.push("Tavily");
  }

  if (googleResponse.results.length > 0) {
    allResults.push(...googleResponse.results);
    sources.push("Google");
  }

  const seenUrls = new Set<string>();
  const uniqueResults = allResults.filter((result) => {
    const normalized = normalizeUrl(result.url);
    if (seenUrls.has(normalized)) {
      return false;
    }
    seenUrls.add(normalized);
    return true;
  });

  uniqueResults.sort((a, b) => b.score - a.score);

  return {
    results: uniqueResults.slice(0, maxResultsPerSource * 2),
    query,
    sources,
  };
}

export const searchWeb = searchWithTavily;
