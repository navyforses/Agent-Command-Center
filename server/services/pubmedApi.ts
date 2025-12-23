/**
 * PubMed API Service
 * Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 *
 * Provides access to biomedical literature from MEDLINE, life science journals,
 * and online books via the NCBI E-utilities API.
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Optional: Add your API key for higher rate limits
// Get one at: https://www.ncbi.nlm.nih.gov/account/settings/
const API_KEY = process.env.PUBMED_API_KEY || '';

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract?: string;
  authors: PubMedAuthor[];
  journal: {
    name: string;
    abbreviation?: string;
    volume?: string;
    issue?: string;
    pages?: string;
  };
  publicationDate: {
    year?: string;
    month?: string;
    day?: string;
  };
  doi?: string;
  pmcid?: string;
  keywords: string[];
  meshTerms: string[];
  publicationTypes: string[];
  language?: string;
  fullTextLinks: string[];
}

export interface PubMedAuthor {
  lastName?: string;
  firstName?: string;
  initials?: string;
  affiliation?: string;
}

export interface PubMedSearchParams {
  term: string;
  maxResults?: number;
  start?: number;
  sort?: 'relevance' | 'pub_date' | 'first_author' | 'journal';
  dateFrom?: string; // YYYY/MM/DD
  dateTo?: string;   // YYYY/MM/DD
  articleTypes?: string[];
}

export interface PubMedSearchResult {
  articles: PubMedArticle[];
  totalCount: number;
  queryTranslation?: string;
}

/**
 * Build URL with API key if available
 */
function buildUrl(endpoint: string, params: URLSearchParams): string {
  if (API_KEY) {
    params.set('api_key', API_KEY);
  }
  return `${BASE_URL}/${endpoint}?${params.toString()}`;
}

/**
 * Search PubMed for articles
 */
export async function searchPubMed(params: PubMedSearchParams): Promise<PubMedSearchResult> {
  // Step 1: Search for PMIDs using esearch
  const searchParams = new URLSearchParams({
    db: 'pubmed',
    term: params.term,
    retmax: String(params.maxResults || 20),
    retstart: String(params.start || 0),
    retmode: 'json',
    usehistory: 'y',
  });

  // Add sort parameter
  if (params.sort) {
    const sortMap: Record<string, string> = {
      'relevance': 'relevance',
      'pub_date': 'pub_date',
      'first_author': 'first_author',
      'journal': 'journal',
    };
    searchParams.set('sort', sortMap[params.sort] || 'relevance');
  }

  // Add date filters
  if (params.dateFrom || params.dateTo) {
    let dateFilter = '';
    if (params.dateFrom) dateFilter += params.dateFrom.replace(/\//g, '/');
    dateFilter += ':';
    if (params.dateTo) dateFilter += params.dateTo.replace(/\//g, '/');
    searchParams.set('datetype', 'pdat');
    searchParams.set('mindate', params.dateFrom || '1900/01/01');
    searchParams.set('maxdate', params.dateTo || '3000/12/31');
  }

  const searchUrl = buildUrl('esearch.fcgi', searchParams);

  try {
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubMed search error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json() as any;
    const result = searchData.esearchresult;

    if (!result || !result.idlist || result.idlist.length === 0) {
      return {
        articles: [],
        totalCount: parseInt(result?.count || '0'),
        queryTranslation: result?.querytranslation,
      };
    }

    // Step 2: Fetch full article details using efetch
    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: result.idlist.join(','),
      retmode: 'xml',
      rettype: 'abstract',
    });

    const fetchUrl = buildUrl('efetch.fcgi', fetchParams);
    const fetchResponse = await fetch(fetchUrl);

    if (!fetchResponse.ok) {
      throw new Error(`PubMed fetch error: ${fetchResponse.status}`);
    }

    const xmlText = await fetchResponse.text();
    const articles = parseArticlesXml(xmlText);

    return {
      articles,
      totalCount: parseInt(result.count || '0'),
      queryTranslation: result.querytranslation,
    };
  } catch (error) {
    console.error('PubMed API error:', error);
    throw error;
  }
}

/**
 * Get a specific article by PMID
 */
export async function getArticle(pmid: string): Promise<PubMedArticle | null> {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmid,
    retmode: 'xml',
    rettype: 'abstract',
  });

  const url = buildUrl('efetch.fcgi', params);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`PubMed fetch error: ${response.status}`);
    }

    const xmlText = await response.text();
    const articles = parseArticlesXml(xmlText);
    return articles[0] || null;
  } catch (error) {
    console.error('PubMed API error:', error);
    throw error;
  }
}

/**
 * Parse PubMed XML response into structured articles
 * Note: This is a simplified XML parser - for production, use a proper XML parser
 */
function parseArticlesXml(xml: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];

  // Split by article tags
  const articleMatches = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

  for (const articleXml of articleMatches) {
    try {
      const article = parseArticleXml(articleXml);
      if (article) {
        articles.push(article);
      }
    } catch (e) {
      console.error('Error parsing article:', e);
    }
  }

  return articles;
}

function parseArticleXml(xml: string): PubMedArticle | null {
  const getTagContent = (tag: string, source: string = xml): string => {
    const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].trim() : '';
  };

  const getAllTagContents = (tag: string, source: string = xml): string[] => {
    const matches = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')) || [];
    return matches.map(m => {
      const inner = m.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return inner ? inner[1].trim() : '';
    }).filter(Boolean);
  };

  const pmid = getTagContent('PMID');
  if (!pmid) return null;

  // Parse authors
  const authorListXml = getTagContent('AuthorList');
  const authorXmls = authorListXml.match(/<Author[^>]*>[\s\S]*?<\/Author>/gi) || [];
  const authors: PubMedAuthor[] = authorXmls.map(authorXml => ({
    lastName: getTagContent('LastName', authorXml),
    firstName: getTagContent('ForeName', authorXml),
    initials: getTagContent('Initials', authorXml),
    affiliation: getTagContent('Affiliation', authorXml),
  })).filter(a => a.lastName || a.firstName);

  // Parse publication date
  const pubDateXml = getTagContent('PubDate') || getTagContent('ArticleDate');
  const publicationDate = {
    year: getTagContent('Year', pubDateXml),
    month: getTagContent('Month', pubDateXml),
    day: getTagContent('Day', pubDateXml),
  };

  // Parse article IDs
  const articleIdList = getTagContent('ArticleIdList');
  const doi = articleIdList.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1] || '';
  const pmcid = articleIdList.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/)?.[1] || '';

  // Parse keywords
  const keywordListXml = getTagContent('KeywordList');
  const keywords = getAllTagContents('Keyword', keywordListXml);

  // Parse MeSH terms
  const meshListXml = getTagContent('MeshHeadingList');
  const meshTerms = getAllTagContents('DescriptorName', meshListXml);

  // Parse publication types
  const pubTypeListXml = getTagContent('PublicationTypeList');
  const publicationTypes = getAllTagContents('PublicationType', pubTypeListXml);

  // Build full text links
  const fullTextLinks: string[] = [];
  if (doi) {
    fullTextLinks.push(`https://doi.org/${doi}`);
  }
  if (pmcid) {
    fullTextLinks.push(`https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`);
  }
  fullTextLinks.push(`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`);

  return {
    pmid,
    title: getTagContent('ArticleTitle').replace(/<[^>]+>/g, ''),
    abstract: getTagContent('AbstractText').replace(/<[^>]+>/g, ''),
    authors,
    journal: {
      name: getTagContent('Title') || getTagContent('ISOAbbreviation'),
      abbreviation: getTagContent('ISOAbbreviation'),
      volume: getTagContent('Volume'),
      issue: getTagContent('Issue'),
      pages: getTagContent('MedlinePgn'),
    },
    publicationDate,
    doi,
    pmcid,
    keywords,
    meshTerms,
    publicationTypes,
    language: getTagContent('Language'),
    fullTextLinks,
  };
}

/**
 * Search for HIE-related research articles
 */
export async function searchHIEResearch(options: {
  specificTopic?: string;
  maxResults?: number;
  recentOnly?: boolean;
}): Promise<PubMedSearchResult> {
  // Build HIE-focused search query
  const baseTerms = [
    '("hypoxic ischemic encephalopathy"[MeSH] OR "HIE"[Title/Abstract] OR "perinatal asphyxia"[MeSH])',
  ];

  if (options.specificTopic) {
    baseTerms.push(`(${options.specificTopic})`);
  }

  // Add filter for human studies and English language
  baseTerms.push('("humans"[MeSH] AND English[Language])');

  const searchParams: PubMedSearchParams = {
    term: baseTerms.join(' AND '),
    maxResults: options.maxResults || 20,
    sort: 'pub_date',
  };

  // Filter to last 5 years if recentOnly
  if (options.recentOnly) {
    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    searchParams.dateFrom = `${fiveYearsAgo.getFullYear()}/01/01`;
  }

  return searchPubMed(searchParams);
}

/**
 * Get related articles for a given PMID
 */
export async function getRelatedArticles(pmid: string, maxResults: number = 10): Promise<PubMedSearchResult> {
  const params = new URLSearchParams({
    db: 'pubmed',
    dbfrom: 'pubmed',
    id: pmid,
    cmd: 'neighbor_score',
    retmode: 'json',
  });

  const linkUrl = buildUrl('elink.fcgi', params);

  try {
    const linkResponse = await fetch(linkUrl);
    if (!linkResponse.ok) {
      throw new Error(`PubMed link error: ${linkResponse.status}`);
    }

    const linkData = await linkResponse.json() as any;
    const linkSetDb = linkData.linksets?.[0]?.linksetdbs?.find(
      (db: any) => db.linkname === 'pubmed_pubmed'
    );

    if (!linkSetDb || !linkSetDb.links) {
      return { articles: [], totalCount: 0 };
    }

    // Get top related PMIDs
    const relatedPmids = linkSetDb.links.slice(0, maxResults);

    if (relatedPmids.length === 0) {
      return { articles: [], totalCount: 0 };
    }

    // Fetch article details
    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: relatedPmids.join(','),
      retmode: 'xml',
      rettype: 'abstract',
    });

    const fetchUrl = buildUrl('efetch.fcgi', fetchParams);
    const fetchResponse = await fetch(fetchUrl);

    if (!fetchResponse.ok) {
      throw new Error(`PubMed fetch error: ${fetchResponse.status}`);
    }

    const xmlText = await fetchResponse.text();
    const articles = parseArticlesXml(xmlText);

    return {
      articles,
      totalCount: linkSetDb.links.length,
    };
  } catch (error) {
    console.error('PubMed API error:', error);
    throw error;
  }
}

export default {
  searchPubMed,
  getArticle,
  searchHIEResearch,
  getRelatedArticles,
};
