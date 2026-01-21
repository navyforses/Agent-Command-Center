/**
 * Trial Navigator API Routes
 * ==========================
 * REST API for clinical trial search, translations, and management
 *
 * Features:
 * - In-memory caching for search results (5 min TTL)
 * - Consistent error responses with error codes
 * - Request validation
 */

import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import * as trialAggregator from "./services/trialAggregator";
import * as trialTranslator from "./services/trialTranslator";
import {
  extractTextFromPDF,
  extractTextFromImage,
  processDocument,
  type DocumentProcessingResult,
} from "./documentProcessor";
import { db } from "./db";
import {
  clinicalTrials,
  userSavedTrials,
  trialSearchHistory,
  documents,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// Multer configuration for document uploads
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: PDF, JPEG, PNG, WebP, TXT"));
    }
  },
});

const router = Router();

// ============================================================================
// In-Memory Cache for Trial Search Results
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TrialCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

const trialCache = new TrialCache();

// ============================================================================
// Error Response Helper
// ============================================================================

interface ApiError {
  error: string;
  code: string;
  details?: any;
}

function createErrorResponse(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: any
): Response {
  const error: ApiError = { error: message, code };
  if (details) error.details = details;
  return res.status(statusCode).json(error);
}

// Error codes
const ErrorCodes = {
  NOT_FOUND: "TRIAL_NOT_FOUND",
  INVALID_ID: "INVALID_TRIAL_ID",
  AUTH_REQUIRED: "AUTHENTICATION_REQUIRED",
  ALREADY_SAVED: "TRIAL_ALREADY_SAVED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
  TRANSLATION_FAILED: "TRANSLATION_FAILED",
} as const;

router.get("/trials/search", async (req: Request, res: Response) => {
  try {
    const {
      q,
      conditions,
      locations,
      phase,
      status,
      language = "ka",
      page = "1",
      pageSize = "20",
      noCache,
    } = req.query;

    // Build cache key from query params
    const cacheKey = `search:${JSON.stringify({
      q,
      conditions,
      locations,
      phase,
      status,
      language,
      page,
      pageSize,
    })}`;

    // Check cache first (unless noCache is set)
    if (!noCache) {
      const cached = trialCache.get<trialAggregator.TrialSearchResult>(cacheKey);
      if (cached) {
        console.log(`[Trial Routes] Cache hit for search: "${q}"`);
        return res.json({
          ...cached,
          _cached: true,
          _cacheKey: cacheKey,
        });
      }
    }

    console.log(`[Trial Routes] Cache miss, searching: "${q}"`);

    const result = await trialAggregator.searchTrials({
      query: String(q || ""),
      conditions: conditions ? String(conditions).split(",") : undefined,
      locations: locations ? String(locations).split(",") : undefined,
      phase: phase ? String(phase).split(",") : undefined,
      status: status ? String(status).split(",") : undefined,
      language: String(language),
      page: parseInt(String(page)),
      pageSize: parseInt(String(pageSize)),
    });

    // Cache the result
    trialCache.set(cacheKey, result);

    // Log search history for authenticated users
    const userId = (req as any).user?.id;
    if (userId && q) {
      db.insert(trialSearchHistory)
        .values({
          userId,
          searchQuery: String(q),
          filters: {
            conditions: conditions ? String(conditions).split(",") : undefined,
            locations: locations ? String(locations).split(",") : undefined,
            phase: phase ? String(phase).split(",") : undefined,
            status: status ? String(status).split(",") : undefined,
          },
          resultsCount: result.totalCount,
          languageCode: String(language),
        })
        .catch((err) =>
          console.error("[Trial Routes] Failed to log search history:", err)
        );
    }

    res.json(result);
  } catch (error) {
    console.error("[Trial Routes] Search error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to search trials",
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === "development" ? String(error) : undefined
    );
  }
});

router.get("/trials/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { language = "ka" } = req.query;

    const trialId = parseInt(id);
    if (isNaN(trialId)) {
      return createErrorResponse(res, 400, "Invalid trial ID", ErrorCodes.INVALID_ID);
    }

    // Check cache
    const cacheKey = `trial:${id}:${language}`;
    const cached = trialCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, _cached: true });
    }

    const trial = await trialAggregator.getTrialById(trialId, String(language));

    if (!trial) {
      return createErrorResponse(res, 404, "Trial not found", ErrorCodes.NOT_FOUND);
    }

    if (String(language) !== "en" && !trial.translation) {
      const translation = await trialTranslator.translateTrial(
        trialId,
        String(language)
      );
      if (translation) {
        (trial as any).translation = translation;
      }
    }

    // Cache for 10 minutes
    trialCache.set(cacheKey, trial, 10 * 60 * 1000);

    res.json(trial);
  } catch (error) {
    console.error("[Trial Routes] Get trial error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to get trial",
      ErrorCodes.INTERNAL_ERROR
    );
  }
});

router.get("/trials/nct/:nctNumber", async (req: Request, res: Response) => {
  try {
    const { nctNumber } = req.params;
    const { language = "ka" } = req.query;

    // Validate NCT number format
    if (!nctNumber || !/^NCT\d{8}$/i.test(nctNumber)) {
      return createErrorResponse(
        res,
        400,
        "Invalid NCT number format. Expected format: NCT########",
        ErrorCodes.INVALID_ID
      );
    }

    // Check cache
    const cacheKey = `nct:${nctNumber.toUpperCase()}:${language}`;
    const cached = trialCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, _cached: true });
    }

    const trial = await trialAggregator.getTrialByNCT(
      nctNumber.toUpperCase(),
      String(language)
    );

    if (!trial) {
      return createErrorResponse(res, 404, "Trial not found", ErrorCodes.NOT_FOUND);
    }

    // Cache for 10 minutes
    trialCache.set(cacheKey, trial, 10 * 60 * 1000);

    res.json(trial);
  } catch (error) {
    console.error("[Trial Routes] Get trial by NCT error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to get trial",
      ErrorCodes.INTERNAL_ERROR
    );
  }
});

router.post("/trials/:id/translate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { language = "ka", forceRefresh = false } = req.body;

    let trialId: number;
    
    // Check if id is an NCT number (starts with NCT)
    if (id.startsWith("NCT")) {
      // Look up the trial by NCT number to get the numeric id
      const trial = await db
        .select({ id: clinicalTrials.id })
        .from(clinicalTrials)
        .where(eq(clinicalTrials.nctNumber, id))
        .limit(1);
      
      if (!trial.length) {
        return res.status(404).json({ error: "Trial not found" });
      }
      trialId = trial[0].id;
    } else {
      trialId = parseInt(id);
      if (isNaN(trialId)) {
        return res.status(400).json({ error: "Invalid trial ID" });
      }
    }

    const translation = await trialTranslator.translateTrial(
      trialId,
      language,
      forceRefresh
    );

    if (!translation) {
      return res.status(404).json({ error: "Trial not found or translation failed" });
    }

    res.json(translation);
  } catch (error) {
    console.error("[Trial Routes] Translate error:", error);
    res.status(500).json({ error: "Failed to translate trial" });
  }
});

router.get("/trials/saved", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return createErrorResponse(
        res,
        401,
        "Authentication required",
        ErrorCodes.AUTH_REQUIRED
      );
    }

    const saved = await db
      .select({
        savedTrial: userSavedTrials,
        trial: clinicalTrials,
      })
      .from(userSavedTrials)
      .innerJoin(clinicalTrials, eq(userSavedTrials.trialId, clinicalTrials.id))
      .where(eq(userSavedTrials.userId, userId))
      .orderBy(desc(userSavedTrials.savedAt));

    res.json({
      trials: saved,
      count: saved.length,
    });
  } catch (error) {
    console.error("[Trial Routes] Get saved trials error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to get saved trials",
      ErrorCodes.INTERNAL_ERROR
    );
  }
});

router.post("/trials/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return createErrorResponse(
        res,
        401,
        "Authentication required",
        ErrorCodes.AUTH_REQUIRED
      );
    }

    const { id } = req.params;
    const trialId = parseInt(id);

    if (isNaN(trialId)) {
      return createErrorResponse(res, 400, "Invalid trial ID", ErrorCodes.INVALID_ID);
    }

    const { notes, notificationEnabled = true } = req.body;

    // Check if trial exists
    const trial = await db
      .select()
      .from(clinicalTrials)
      .where(eq(clinicalTrials.id, trialId))
      .limit(1);

    if (trial.length === 0) {
      return createErrorResponse(res, 404, "Trial not found", ErrorCodes.NOT_FOUND);
    }

    // Check if already saved
    const existing = await db
      .select()
      .from(userSavedTrials)
      .where(
        and(
          eq(userSavedTrials.userId, userId),
          eq(userSavedTrials.trialId, trialId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return createErrorResponse(
        res,
        400,
        "Trial already saved",
        ErrorCodes.ALREADY_SAVED
      );
    }

    const [saved] = await db
      .insert(userSavedTrials)
      .values({
        userId,
        trialId,
        notes,
        notificationEnabled,
      })
      .returning();

    res.status(201).json({
      success: true,
      savedTrial: saved,
    });
  } catch (error) {
    console.error("[Trial Routes] Save trial error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to save trial",
      ErrorCodes.INTERNAL_ERROR
    );
  }
});

router.delete("/trials/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return createErrorResponse(
        res,
        401,
        "Authentication required",
        ErrorCodes.AUTH_REQUIRED
      );
    }

    const { id } = req.params;
    const trialId = parseInt(id);

    if (isNaN(trialId)) {
      return createErrorResponse(res, 400, "Invalid trial ID", ErrorCodes.INVALID_ID);
    }

    const result = await db
      .delete(userSavedTrials)
      .where(
        and(
          eq(userSavedTrials.userId, userId),
          eq(userSavedTrials.trialId, trialId)
        )
      )
      .returning();

    if (result.length === 0) {
      return createErrorResponse(res, 404, "Saved trial not found", ErrorCodes.NOT_FOUND);
    }

    res.json({ success: true, message: "Trial removed from saved list" });
  } catch (error) {
    console.error("[Trial Routes] Unsave trial error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to unsave trial",
      ErrorCodes.INTERNAL_ERROR
    );
  }
});

router.get("/trials/sources/status", async (_req: Request, res: Response) => {
  try {
    const sources = await trialAggregator.getDataSourcesStatus();
    res.json(sources);
  } catch (error) {
    console.error("[Trial Routes] Get sources status error:", error);
    res.status(500).json({ error: "Failed to get sources status" });
  }
});

router.post("/trials/sync", async (req: Request, res: Response) => {
  try {
    const { conditions } = req.body;
    
    res.json({ message: "Sync started", status: "processing" });
    
    trialAggregator.syncAllSources(conditions).catch((err) => {
      console.error("[Trial Routes] Background sync error:", err);
    });
  } catch (error) {
    console.error("[Trial Routes] Sync error:", error);
    res.status(500).json({ error: "Failed to start sync" });
  }
});

router.get("/languages", async (_req: Request, res: Response) => {
  try {
    const languages = await trialAggregator.getSupportedLanguages();
    res.json(languages);
  } catch (error) {
    console.error("[Trial Routes] Get languages error:", error);
    res.status(500).json({ error: "Failed to get languages" });
  }
});

router.get("/glossary/:term", async (req: Request, res: Response) => {
  try {
    const { term } = req.params;
    const { language = "ka" } = req.query;

    const result = await trialTranslator.getGlossaryTerm(
      term,
      String(language)
    );

    if (!result) {
      return res.status(404).json({ error: "Term not found" });
    }

    res.json(result);
  } catch (error) {
    console.error("[Trial Routes] Get glossary term error:", error);
    res.status(500).json({ error: "Failed to get glossary term" });
  }
});

router.post("/translate", async (req: Request, res: Response) => {
  try {
    const { text, language = "ka", context = "medical" } = req.body;

    if (!text) {
      return createErrorResponse(
        res,
        400,
        "Text is required",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (text.length > 10000) {
      return createErrorResponse(
        res,
        400,
        "Text too long. Maximum 10000 characters.",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const translated = await trialTranslator.translateText(
      text,
      language,
      context
    );

    res.json({ original: text, translated, language });
  } catch (error) {
    console.error("[Trial Routes] Translate text error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to translate text",
      ErrorCodes.TRANSLATION_FAILED
    );
  }
});

// ============================================================================
// Document Upload & Processing Endpoints
// ============================================================================

router.post(
  "/documents/upload",
  documentUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return createErrorResponse(
          res,
          401,
          "Authentication required",
          ErrorCodes.AUTH_REQUIRED
        );
      }

      const file = req.file;
      if (!file) {
        return createErrorResponse(
          res,
          400,
          "No file uploaded",
          ErrorCodes.VALIDATION_ERROR
        );
      }

      const { title, category = "medical_document", childId } = req.body;

      console.log(
        `[Trial Routes] Processing uploaded document: ${file.originalname} (${file.mimetype})`
      );

      // Process the document to extract text
      let processingResult: DocumentProcessingResult;

      if (file.mimetype === "application/pdf") {
        processingResult = await extractTextFromPDF(file.buffer);
      } else if (file.mimetype.startsWith("image/")) {
        processingResult = await extractTextFromImage(file.buffer, file.mimetype);
      } else {
        // Text file
        processingResult = {
          success: true,
          text: file.buffer.toString("utf-8"),
          extractionMethod: "text",
          language: "unknown",
        };
      }

      if (!processingResult.success) {
        console.error(
          `[Trial Routes] Document processing failed: ${processingResult.error}`
        );
        return createErrorResponse(
          res,
          500,
          processingResult.error || "Failed to process document",
          ErrorCodes.INTERNAL_ERROR
        );
      }

      // Create document record in database
      const [newDocument] = await db
        .insert(documents)
        .values({
          userId,
          childId: childId ? parseInt(childId) : null,
          title: title || file.originalname,
          category,
          fileType: file.mimetype,
          filePath: file.originalname, // Store original filename in filePath
          fileSize: file.size,
          extractedText: processingResult.text,
          processingStatus: "completed",
          documentType: category,
          aiSummary: null,
          aiKeyFindings: null,
        })
        .returning();

      res.status(201).json({
        success: true,
        document: {
          id: newDocument.id,
          title: newDocument.title,
          category: newDocument.category,
          fileType: newDocument.fileType,
          filePath: newDocument.filePath,
          fileSize: newDocument.fileSize,
          uploadedAt: newDocument.uploadedAt,
        },
        processing: {
          extractedTextLength: processingResult.text.length,
          extractionMethod: processingResult.extractionMethod,
          language: processingResult.language,
          pageCount: processingResult.pageCount,
        },
      });
    } catch (error) {
      console.error("[Trial Routes] Document upload error:", error);
      return createErrorResponse(
        res,
        500,
        "Failed to upload document",
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }
);

router.get("/documents/:id/analysis", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return createErrorResponse(
        res,
        401,
        "Authentication required",
        ErrorCodes.AUTH_REQUIRED
      );
    }

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return createErrorResponse(res, 400, "Invalid document ID", ErrorCodes.INVALID_ID);
    }

    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);

    if (!document) {
      return createErrorResponse(res, 404, "Document not found", ErrorCodes.NOT_FOUND);
    }

    res.json({
      id: document.id,
      title: document.title,
      category: document.category,
      extractedText: document.extractedText,
      aiSummary: document.aiSummary,
      aiKeyFindings: document.aiKeyFindings,
      documentType: document.documentType,
      processingStatus: document.processingStatus,
      uploadedAt: document.uploadedAt,
    });
  } catch (error) {
    console.error("[Trial Routes] Get document analysis error:", error);
    return createErrorResponse(
      res,
      500,
      "Failed to get document analysis",
      ErrorCodes.INTERNAL_ERROR
    );
  }
});

// ============================================================================
// Cache Management Endpoints
// ============================================================================

router.get("/cache/stats", async (_req: Request, res: Response) => {
  res.json({
    ...trialCache.stats(),
    timestamp: new Date().toISOString(),
  });
});

router.post("/cache/clear", async (req: Request, res: Response) => {
  const { pattern } = req.body;
  trialCache.invalidate(pattern);
  res.json({
    success: true,
    message: pattern ? `Cache cleared for pattern: ${pattern}` : "All cache cleared",
  });
});

export default router;
