/**
 * Feed Routes - Personalized News Feed
 * =====================================
 * The core feature - aggregates personalized content based on patient profile
 *
 * Feed types:
 * - Clinical trials (ClinicalTrials.gov, EU, WHO)
 * - Research articles (PubMed)
 * - Drug information (OpenFDA)
 * - Medical news
 */

import { Router, Response } from "express";
import { storage } from "../storage";
import { AuthenticatedRequest, getUserId } from "../types";
import { sendError } from "../middleware/errorHandler";
import { searchClinicalTrials } from "../services/clinicalTrialsApi";
import { searchPubMed, getArticle as getPubMedArticle } from "../services/pubmedApi";
import { searchDrugLabels, getDrugLabel } from "../services/openfdaApi";
import { z } from "zod";

const router = Router();

// Feed item types
type FeedItemType = "clinical_trial" | "research_article" | "drug_info" | "news";

interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  publishedAt?: string;
  relevanceScore?: number;
  metadata: Record<string, any>;
}

// Validation
const feedQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: z.enum(["all", "clinical_trial", "research_article", "drug_info", "news"]).default("all"),
});

/**
 * GET /api/feed
 * Get personalized feed based on patient profile
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const query = feedQuerySchema.safeParse(req.query);
    if (!query.success) {
      return sendError.badRequest(res, "Invalid query parameters");
    }

    const { page, limit, type } = query.data;

    // Get patient profile to personalize feed
    const patientProfile = await storage.getPatientProfile(userId);

    // Build search keywords from patient profile
    let searchKeywords: string[] = [];
    if (patientProfile) {
      if (patientProfile.primaryDiagnosis) {
        searchKeywords.push(patientProfile.primaryDiagnosis);
      }
      if (patientProfile.icd10Codes && Array.isArray(patientProfile.icd10Codes)) {
        searchKeywords.push(...patientProfile.icd10Codes);
      }
      if (patientProfile.secondaryDiagnoses && Array.isArray(patientProfile.secondaryDiagnoses)) {
        searchKeywords.push(...patientProfile.secondaryDiagnoses);
      }
    }

    // Default keywords if no profile
    if (searchKeywords.length === 0) {
      searchKeywords = ["pediatric neurology", "cerebral palsy", "HIE"];
    }

    const feedItems: FeedItem[] = [];

    // Fetch from different sources based on type filter
    const fetchPromises: Promise<void>[] = [];

    // Clinical Trials
    if (type === "all" || type === "clinical_trial") {
      fetchPromises.push(
        (async () => {
          try {
            const result = await searchClinicalTrials({
              query: searchKeywords.join(" OR "),
              pageSize: 10,
            });
            if (result && result.studies && Array.isArray(result.studies)) {
              for (const trial of result.studies) {
                feedItems.push({
                  id: `trial_${trial.nctId}`,
                  type: "clinical_trial",
                  title: trial.title || "Clinical Trial",
                  summary: trial.eligibility?.criteria || "",
                  source: "ClinicalTrials.gov",
                  sourceUrl: `https://clinicaltrials.gov/study/${trial.nctId}`,
                  publishedAt: trial.startDate,
                  metadata: {
                    nctId: trial.nctId,
                    status: trial.status,
                    phase: trial.phase,
                    conditions: trial.conditions,
                    locations: trial.locations,
                  },
                });
              }
            }
          } catch (error) {
            console.error("Error fetching clinical trials:", error);
          }
        })()
      );
    }

    // Research Articles
    if (type === "all" || type === "research_article") {
      fetchPromises.push(
        (async () => {
          try {
            const result = await searchPubMed({
              term: searchKeywords[0] || "pediatric neurology",
              maxResults: 10,
            });
            if (result && result.articles && Array.isArray(result.articles)) {
              for (const article of result.articles) {
                const pubDate = article.publicationDate;
                const dateStr = pubDate?.year
                  ? `${pubDate.year}${pubDate.month ? `-${pubDate.month}` : ""}${pubDate.day ? `-${pubDate.day}` : ""}`
                  : undefined;

                feedItems.push({
                  id: `pubmed_${article.pmid}`,
                  type: "research_article",
                  title: article.title || "Research Article",
                  summary: article.abstract || "",
                  source: "PubMed",
                  sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`,
                  publishedAt: dateStr,
                  metadata: {
                    pmid: article.pmid,
                    authors: article.authors,
                    journal: article.journal?.name,
                    doi: article.doi,
                  },
                });
              }
            }
          } catch (error) {
            console.error("Error fetching PubMed articles:", error);
          }
        })()
      );
    }

    // Drug Information
    if (type === "all" || type === "drug_info") {
      fetchPromises.push(
        (async () => {
          try {
            // Get medications from patient profile if available
            const medications = patientProfile?.currentMedications;
            if (medications && Array.isArray(medications) && medications.length > 0) {
              const result = await searchDrugLabels({
                query: medications[0],
                limit: 5,
              });
              if (result && result.results && Array.isArray(result.results)) {
                for (const drug of result.results) {
                  feedItems.push({
                    id: `drug_${drug.id}`,
                    type: "drug_info",
                    title: drug.brandName || drug.genericName || "Drug Information",
                    summary: drug.indications || "",
                    source: "OpenFDA",
                    sourceUrl: drug.splId
                      ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${drug.splId}`
                      : undefined,
                    metadata: {
                      brandName: drug.brandName,
                      genericName: drug.genericName,
                      manufacturer: drug.manufacturer,
                      warnings: drug.warnings,
                    },
                  });
                }
              }
            }
          } catch (error) {
            console.error("Error fetching drug info:", error);
          }
        })()
      );
    }

    // Wait for all fetches
    await Promise.all(fetchPromises);

    // Sort by publishedAt (most recent first)
    feedItems.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedItems = feedItems.slice(startIndex, startIndex + limit);

    return res.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: feedItems.length,
        totalPages: Math.ceil(feedItems.length / limit),
      },
      searchKeywords,
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return sendError.internal(res, "Failed to fetch feed");
  }
});

/**
 * GET /api/feed/trials
 * Get clinical trials only
 */
router.get("/trials", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const { q, limit = "20" } = req.query;

    // Get patient profile for personalized search
    const patientProfile = await storage.getPatientProfile(userId);
    let searchQuery = q as string;

    if (!searchQuery && patientProfile?.primaryDiagnosis) {
      searchQuery = patientProfile.primaryDiagnosis;
    }

    if (!searchQuery) {
      searchQuery = "pediatric neurology";
    }

    const result = await searchClinicalTrials({
      query: searchQuery,
      pageSize: parseInt(limit as string),
    });

    return res.json({
      trials: result?.studies || [],
      totalCount: result?.totalCount || 0,
      query: searchQuery,
    });
  } catch (error) {
    console.error("Error fetching trials:", error);
    return sendError.internal(res, "Failed to fetch clinical trials");
  }
});

/**
 * GET /api/feed/trial/:nctId
 * Get specific clinical trial details
 */
router.get("/trial/:nctId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nctId } = req.params;

    // Fetch trial details from ClinicalTrials.gov
    const result = await searchClinicalTrials({
      query: nctId,
      pageSize: 1,
    });

    const trial = result?.studies?.[0];

    if (!trial) {
      return sendError.notFound(res, "Clinical trial");
    }

    return res.json(trial);
  } catch (error) {
    console.error("Error fetching trial:", error);
    return sendError.internal(res, "Failed to fetch trial details");
  }
});

/**
 * GET /api/feed/articles
 * Get research articles only
 */
router.get("/articles", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const { q, limit = "20" } = req.query;

    const patientProfile = await storage.getPatientProfile(userId);
    let searchQuery = q as string;

    if (!searchQuery && patientProfile?.primaryDiagnosis) {
      searchQuery = patientProfile.primaryDiagnosis;
    }

    if (!searchQuery) {
      searchQuery = "pediatric neurology";
    }

    const result = await searchPubMed({
      term: searchQuery,
      maxResults: parseInt(limit as string),
    });

    return res.json({
      articles: result?.articles || [],
      totalCount: result?.totalCount || 0,
      query: searchQuery,
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return sendError.internal(res, "Failed to fetch research articles");
  }
});

/**
 * GET /api/feed/article/:pmid
 * Get specific PubMed article details
 */
router.get("/article/:pmid", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pmid } = req.params;

    const article = await getPubMedArticle(pmid);

    if (!article) {
      return sendError.notFound(res, "Article");
    }

    return res.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return sendError.internal(res, "Failed to fetch article details");
  }
});

/**
 * GET /api/feed/drugs
 * Get drug information
 */
router.get("/drugs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, limit = "10" } = req.query;

    if (!q) {
      return sendError.badRequest(res, "Search query required");
    }

    const result = await searchDrugLabels({
      query: q as string,
      limit: parseInt(limit as string),
    });

    return res.json({
      drugs: result?.results || [],
      query: q,
    });
  } catch (error) {
    console.error("Error fetching drugs:", error);
    return sendError.internal(res, "Failed to fetch drug information");
  }
});

/**
 * GET /api/feed/drug/:drugId
 * Get specific drug details
 */
router.get("/drug/:drugId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { drugId } = req.params;

    const drug = await getDrugLabel(drugId);

    if (!drug) {
      return sendError.notFound(res, "Drug");
    }

    return res.json(drug);
  } catch (error) {
    console.error("Error fetching drug:", error);
    return sendError.internal(res, "Failed to fetch drug details");
  }
});

export default router;
