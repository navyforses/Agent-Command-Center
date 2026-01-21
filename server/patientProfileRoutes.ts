/**
 * Patient Profile API Routes
 * ==========================
 * პაციენტის პროფილის და მკვლევარის რეჟიმის API
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "./db";
import {
  patientProfiles,
  researchMonitors,
  researchFindings,
  documents,
} from "@shared/schema";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import {
  processForm100,
  generateSearchKeywords,
  type ParsedForm100,
} from "./services/form100Parser";

const router = Router();

// Multer configuration for Form 100 uploads
const form100Upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("მხოლოდ PDF, JPEG, PNG, WebP ფორმატები. გთხოვთ ატვირთოთ სწორი ფაილი."));
    }
  },
});

// ============================================================================
// Patient Profile Endpoints
// ============================================================================

/**
 * POST /api/patient-profile/upload-form100
 * ფორმა 100-ის ატვირთვა და დამუშავება
 */
router.post(
  "/patient-profile/upload-form100",
  form100Upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "ფაილი არ არის ატვირთული" });
      }

      console.log(`[Patient Profile] Processing Form 100: ${file.originalname}`);

      const result = await processForm100(
        userId,
        file.buffer,
        file.mimetype,
        file.originalname
      );

      if (!result.success) {
        return res.status(500).json({
          error: result.error || "დამუშავება ვერ მოხერხდა",
          warnings: result.warnings,
        });
      }

      res.json({
        success: true,
        profile: result.profile,
        confidence: result.parsedData?.confidence,
        warnings: result.warnings,
        documentId: result.documentId,
      });
    } catch (error) {
      console.error("[Patient Profile] Upload error:", error);
      res.status(500).json({ error: "სერვერის შეცდომა" });
    }
  }
);

/**
 * GET /api/patient-profile
 * მიმდინარე მომხმარებლის პროფილი
 */
router.get("/patient-profile", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const [profile] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      return res.json({ exists: false, profile: null });
    }

    // Also get research monitor status
    const [monitor] = await db
      .select()
      .from(researchMonitors)
      .where(eq(researchMonitors.userId, userId))
      .limit(1);

    res.json({
      exists: true,
      profile,
      researchMonitor: monitor || null,
    });
  } catch (error) {
    console.error("[Patient Profile] Get error:", error);
    res.status(500).json({ error: "პროფილის მიღება ვერ მოხერხდა" });
  }
});

/**
 * PUT /api/patient-profile
 * პროფილის ხელით შესწორება
 */
router.put("/patient-profile", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const updates = req.body;

    // Validate that profile exists
    const [existing] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "პროფილი არ მოიძებნა" });
    }

    // Allowed fields for update
    const allowedFields = [
      "fullName",
      "birthDate",
      "gender",
      "personalNumber",
      "primaryDiagnosis",
      "icd10Codes",
      "secondaryDiagnoses",
      "diagnosisDate",
      "attendingPhysician",
      "medicalInstitution",
      "disabilityStatus",
      "disabilityGroup",
      "medicalHistory",
      "currentMedications",
      "allergies",
    ];

    const sanitizedUpdates: any = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    sanitizedUpdates.updatedAt = new Date();

    const [updatedProfile] = await db
      .update(patientProfiles)
      .set(sanitizedUpdates)
      .where(eq(patientProfiles.userId, userId))
      .returning();

    res.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("[Patient Profile] Update error:", error);
    res.status(500).json({ error: "პროფილის განახლება ვერ მოხერხდა" });
  }
});

/**
 * DELETE /api/patient-profile
 * პროფილის წაშლა
 */
router.delete("/patient-profile", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    // Delete research monitor first (foreign key)
    await db
      .delete(researchMonitors)
      .where(eq(researchMonitors.userId, userId));

    // Delete profile
    const result = await db
      .delete(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "პროფილი არ მოიძებნა" });
    }

    res.json({ success: true, message: "პროფილი წაიშალა" });
  } catch (error) {
    console.error("[Patient Profile] Delete error:", error);
    res.status(500).json({ error: "პროფილის წაშლა ვერ მოხერხდა" });
  }
});

// ============================================================================
// Research Monitor Endpoints
// ============================================================================

/**
 * POST /api/research-monitor/enable
 * მკვლევარის რეჟიმის ჩართვა
 */
router.post("/research-monitor/enable", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    // Get patient profile
    const [profile] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      return res.status(400).json({
        error: "ჯერ შექმენით პაციენტის პროფილი ფორმა 100-ის ატვირთვით",
      });
    }

    // Generate keywords from profile
    const aiExtractedData = profile.aiExtractedData as ParsedForm100 | null;
    let keywords: string[] = [];

    if (aiExtractedData) {
      keywords = generateSearchKeywords(aiExtractedData);
    } else if (profile.primaryDiagnosis) {
      keywords = [profile.primaryDiagnosis];
      if (profile.icd10Codes) {
        keywords.push(...profile.icd10Codes);
      }
    }

    // Check if monitor already exists
    const [existing] = await db
      .select()
      .from(researchMonitors)
      .where(eq(researchMonitors.userId, userId))
      .limit(1);

    let monitor;

    if (existing) {
      // Update existing monitor
      [monitor] = await db
        .update(researchMonitors)
        .set({
          isActive: true,
          searchKeywords: keywords,
          conditions: profile.icd10Codes || [],
          patientProfileId: profile.id,
        })
        .where(eq(researchMonitors.userId, userId))
        .returning();
    } else {
      // Create new monitor
      [monitor] = await db
        .insert(researchMonitors)
        .values({
          userId,
          patientProfileId: profile.id,
          isActive: true,
          searchKeywords: keywords,
          conditions: profile.icd10Codes || [],
          monitorClinicalTrials: true,
          monitorPubmed: true,
          monitorDrugs: true,
          monitorNews: true,
          emailNotifications: true,
          notificationFrequency: "daily",
        })
        .returning();
    }

    res.json({
      success: true,
      monitor,
      generatedKeywords: keywords,
    });
  } catch (error) {
    console.error("[Research Monitor] Enable error:", error);
    res.status(500).json({ error: "მკვლევარის რეჟიმის ჩართვა ვერ მოხერხდა" });
  }
});

/**
 * PUT /api/research-monitor/settings
 * პარამეტრების განახლება
 */
router.put("/research-monitor/settings", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const {
      searchKeywords,
      conditions,
      monitorClinicalTrials,
      monitorPubmed,
      monitorDrugs,
      monitorNews,
      emailNotifications,
      notificationFrequency,
    } = req.body;

    const updates: any = {};

    if (searchKeywords !== undefined) updates.searchKeywords = searchKeywords;
    if (conditions !== undefined) updates.conditions = conditions;
    if (monitorClinicalTrials !== undefined) updates.monitorClinicalTrials = monitorClinicalTrials;
    if (monitorPubmed !== undefined) updates.monitorPubmed = monitorPubmed;
    if (monitorDrugs !== undefined) updates.monitorDrugs = monitorDrugs;
    if (monitorNews !== undefined) updates.monitorNews = monitorNews;
    if (emailNotifications !== undefined) updates.emailNotifications = emailNotifications;
    if (notificationFrequency !== undefined) updates.notificationFrequency = notificationFrequency;

    const [monitor] = await db
      .update(researchMonitors)
      .set(updates)
      .where(eq(researchMonitors.userId, userId))
      .returning();

    if (!monitor) {
      return res.status(404).json({ error: "მკვლევარის რეჟიმი არ არის ჩართული" });
    }

    res.json({ success: true, monitor });
  } catch (error) {
    console.error("[Research Monitor] Settings error:", error);
    res.status(500).json({ error: "პარამეტრების განახლება ვერ მოხერხდა" });
  }
});

/**
 * POST /api/research-monitor/disable
 * მკვლევარის რეჟიმის გამორთვა
 */
router.post("/research-monitor/disable", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const [monitor] = await db
      .update(researchMonitors)
      .set({ isActive: false })
      .where(eq(researchMonitors.userId, userId))
      .returning();

    if (!monitor) {
      return res.status(404).json({ error: "მკვლევარის რეჟიმი არ მოიძებნა" });
    }

    res.json({ success: true, message: "მკვლევარის რეჟიმი გამოირთო" });
  } catch (error) {
    console.error("[Research Monitor] Disable error:", error);
    res.status(500).json({ error: "მკვლევარის რეჟიმის გამორთვა ვერ მოხერხდა" });
  }
});

/**
 * GET /api/research-monitor/findings
 * აღმოჩენების სია
 */
router.get("/research-monitor/findings", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const {
      type,
      isRead,
      isSaved,
      page = "1",
      limit = "20",
    } = req.query;

    // Get user's monitor
    const [monitor] = await db
      .select()
      .from(researchMonitors)
      .where(eq(researchMonitors.userId, userId))
      .limit(1);

    if (!monitor) {
      return res.json({ findings: [], total: 0 });
    }

    // Build query conditions
    const conditions: any[] = [eq(researchFindings.monitorId, monitor.id)];

    if (type && type !== "all") {
      conditions.push(eq(researchFindings.findingType, String(type)));
    }

    if (isRead === "true") {
      conditions.push(eq(researchFindings.isRead, true));
    } else if (isRead === "false") {
      conditions.push(eq(researchFindings.isRead, false));
    }

    if (isSaved === "true") {
      conditions.push(eq(researchFindings.isSaved, true));
    }

    // Don't show dismissed
    conditions.push(eq(researchFindings.isDismissed, false));

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const offset = (pageNum - 1) * limitNum;

    const findings = await db
      .select()
      .from(researchFindings)
      .where(and(...conditions))
      .orderBy(desc(researchFindings.foundAt))
      .limit(limitNum)
      .offset(offset);

    // Get unread count
    const unreadCount = await db
      .select()
      .from(researchFindings)
      .where(
        and(
          eq(researchFindings.monitorId, monitor.id),
          eq(researchFindings.isRead, false),
          eq(researchFindings.isDismissed, false)
        )
      );

    res.json({
      findings,
      total: findings.length,
      unreadCount: unreadCount.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("[Research Monitor] Findings error:", error);
    res.status(500).json({ error: "აღმოჩენების მიღება ვერ მოხერხდა" });
  }
});

/**
 * POST /api/research-monitor/findings/:id/read
 * წაკითხულად მონიშვნა
 */
router.post("/research-monitor/findings/:id/read", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const { id } = req.params;

    await db
      .update(researchFindings)
      .set({ isRead: true })
      .where(eq(researchFindings.id, parseInt(id)));

    res.json({ success: true });
  } catch (error) {
    console.error("[Research Monitor] Mark read error:", error);
    res.status(500).json({ error: "მონიშვნა ვერ მოხერხდა" });
  }
});

/**
 * POST /api/research-monitor/findings/:id/save
 * შენახვა
 */
router.post("/research-monitor/findings/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const { id } = req.params;

    await db
      .update(researchFindings)
      .set({ isSaved: true, isRead: true })
      .where(eq(researchFindings.id, parseInt(id)));

    res.json({ success: true });
  } catch (error) {
    console.error("[Research Monitor] Save error:", error);
    res.status(500).json({ error: "შენახვა ვერ მოხერხდა" });
  }
});

/**
 * POST /api/research-monitor/findings/:id/dismiss
 * უარყოფა
 */
router.post("/research-monitor/findings/:id/dismiss", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const { id } = req.params;

    await db
      .update(researchFindings)
      .set({ isDismissed: true })
      .where(eq(researchFindings.id, parseInt(id)));

    res.json({ success: true });
  } catch (error) {
    console.error("[Research Monitor] Dismiss error:", error);
    res.status(500).json({ error: "უარყოფა ვერ მოხერხდა" });
  }
});

/**
 * POST /api/research-monitor/scan-now
 * მყისიერი სკანირება
 */
router.post("/research-monitor/scan-now", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
    }

    const [monitor] = await db
      .select()
      .from(researchMonitors)
      .where(eq(researchMonitors.userId, userId))
      .limit(1);

    if (!monitor || !monitor.isActive) {
      return res.status(400).json({ error: "მკვლევარის რეჟიმი არ არის ჩართული" });
    }

    // Check rate limit (1 scan per hour)
    if (monitor.lastScanAt) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (monitor.lastScanAt > hourAgo) {
        const nextScanTime = new Date(monitor.lastScanAt.getTime() + 60 * 60 * 1000);
        return res.status(429).json({
          error: "სკანირება შესაძლებელია საათში ერთხელ",
          nextScanAt: nextScanTime.toISOString(),
        });
      }
    }

    // Update last scan time
    await db
      .update(researchMonitors)
      .set({ lastScanAt: new Date() })
      .where(eq(researchMonitors.id, monitor.id));

    // TODO: Trigger actual scan in background
    // For now, return success and the scan will happen in background job
    res.json({
      success: true,
      message: "სკანირება დაიწყო. შედეგები მალე გამოჩნდება.",
    });
  } catch (error) {
    console.error("[Research Monitor] Scan error:", error);
    res.status(500).json({ error: "სკანირება ვერ მოხერხდა" });
  }
});

export default router;
