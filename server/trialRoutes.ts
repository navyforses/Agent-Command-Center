/**
 * Trial Navigator API Routes
 * ==========================
 * REST API for clinical trial search, translations, and management
 */

import { Router, Request, Response } from "express";
import * as trialAggregator from "./services/trialAggregator";
import * as trialTranslator from "./services/trialTranslator";
import { db } from "./db";
import {
  clinicalTrials,
  userSavedTrials,
  trialSearchHistory,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

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
    } = req.query;

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

    const userId = (req as any).user?.id;
    if (userId && q) {
      await db.insert(trialSearchHistory).values({
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
      });
    }

    res.json(result);
  } catch (error) {
    console.error("[Trial Routes] Search error:", error);
    res.status(500).json({ error: "Failed to search trials" });
  }
});

router.get("/trials/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { language = "ka" } = req.query;

    const trial = await trialAggregator.getTrialById(
      parseInt(id),
      String(language)
    );

    if (!trial) {
      return res.status(404).json({ error: "Trial not found" });
    }

    if (String(language) !== "en" && !trial.translation) {
      const translation = await trialTranslator.translateTrial(
        parseInt(id),
        String(language)
      );
      if (translation) {
        (trial as any).translation = translation;
      }
    }

    res.json(trial);
  } catch (error) {
    console.error("[Trial Routes] Get trial error:", error);
    res.status(500).json({ error: "Failed to get trial" });
  }
});

router.get("/trials/nct/:nctNumber", async (req: Request, res: Response) => {
  try {
    const { nctNumber } = req.params;
    const { language = "ka" } = req.query;

    const trial = await trialAggregator.getTrialByNCT(
      nctNumber,
      String(language)
    );

    if (!trial) {
      return res.status(404).json({ error: "Trial not found" });
    }

    res.json(trial);
  } catch (error) {
    console.error("[Trial Routes] Get trial by NCT error:", error);
    res.status(500).json({ error: "Failed to get trial" });
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
      return res.status(401).json({ error: "Authentication required" });
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

    res.json(saved);
  } catch (error) {
    console.error("[Trial Routes] Get saved trials error:", error);
    res.status(500).json({ error: "Failed to get saved trials" });
  }
});

router.post("/trials/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const { notes, notificationEnabled = true } = req.body;

    const existing = await db
      .select()
      .from(userSavedTrials)
      .where(
        and(
          eq(userSavedTrials.userId, userId),
          eq(userSavedTrials.trialId, parseInt(id))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Trial already saved" });
    }

    const [saved] = await db
      .insert(userSavedTrials)
      .values({
        userId,
        trialId: parseInt(id),
        notes,
        notificationEnabled,
      })
      .returning();

    res.json(saved);
  } catch (error) {
    console.error("[Trial Routes] Save trial error:", error);
    res.status(500).json({ error: "Failed to save trial" });
  }
});

router.delete("/trials/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;

    await db
      .delete(userSavedTrials)
      .where(
        and(
          eq(userSavedTrials.userId, userId),
          eq(userSavedTrials.trialId, parseInt(id))
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error("[Trial Routes] Unsave trial error:", error);
    res.status(500).json({ error: "Failed to unsave trial" });
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
      return res.status(400).json({ error: "Text is required" });
    }

    const translated = await trialTranslator.translateText(
      text,
      language,
      context
    );

    res.json({ original: text, translated, language });
  } catch (error) {
    console.error("[Trial Routes] Translate text error:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

export default router;
