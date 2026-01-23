/**
 * Research Alert Routes
 * ======================
 * P2 Feature: Research monitoring and alert notifications
 * Allows users to monitor for new research and receive notifications
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { insertResearchMonitorSchema } from "@shared/schema";
import {
  scanForNewResearch,
  markFindingAsRead,
  saveFindingToBookmarks,
  dismissFinding,
  getUnreadFindingsCount,
} from "../services/researchAlertService";
import { z } from "zod";

const router = Router();

// ============================================================================
// Research Monitors
// ============================================================================

/**
 * GET /api/research-alerts/monitors
 * List all research monitors for user
 */
router.get("/monitors", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const monitors = await storage.getResearchMonitors(userId);
    res.json(monitors);
  } catch (error) {
    console.error("Error fetching monitors:", error);
    res.status(500).json({ message: "Failed to fetch research monitors" });
  }
});

/**
 * GET /api/research-alerts/monitors/:id
 * Get a specific research monitor
 */
router.get("/monitors/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid monitor ID" });
    }

    const monitor = await storage.getResearchMonitor(id, userId);
    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    res.json(monitor);
  } catch (error) {
    console.error("Error fetching monitor:", error);
    res.status(500).json({ message: "Failed to fetch monitor" });
  }
});

/**
 * POST /api/research-alerts/monitors
 * Create a new research monitor
 */
router.post("/monitors", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const parseResult = insertResearchMonitorSchema.safeParse({
      ...req.body,
      userId,
    });

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid monitor data",
        errors: parseResult.error.errors,
      });
    }

    const monitor = await storage.createResearchMonitor(parseResult.data);
    res.status(201).json(monitor);
  } catch (error) {
    console.error("Error creating monitor:", error);
    res.status(500).json({ message: "Failed to create monitor" });
  }
});

/**
 * PATCH /api/research-alerts/monitors/:id
 * Update a research monitor
 */
router.patch("/monitors/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid monitor ID" });
    }

    const { userId: _, ...bodyWithoutUserId } = req.body;
    const parseResult = insertResearchMonitorSchema.partial().safeParse(bodyWithoutUserId);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid monitor data",
        errors: parseResult.error.errors,
      });
    }

    const monitor = await storage.updateResearchMonitor(id, userId, parseResult.data);
    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    res.json(monitor);
  } catch (error) {
    console.error("Error updating monitor:", error);
    res.status(500).json({ message: "Failed to update monitor" });
  }
});

/**
 * DELETE /api/research-alerts/monitors/:id
 * Delete a research monitor
 */
router.delete("/monitors/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid monitor ID" });
    }

    const deleted = await storage.deleteResearchMonitor(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    res.json({ message: "Monitor deleted successfully" });
  } catch (error) {
    console.error("Error deleting monitor:", error);
    res.status(500).json({ message: "Failed to delete monitor" });
  }
});

/**
 * POST /api/research-alerts/monitors/:id/scan
 * Manually trigger a scan for a monitor
 */
router.post("/monitors/:id/scan", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid monitor ID" });
    }

    const monitor = await storage.getResearchMonitor(id, userId);
    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    const result = await scanForNewResearch(monitor);

    // Update last scan time
    await storage.updateResearchMonitor(id, userId, {
      lastScanAt: new Date(),
    } as any);

    res.json({
      success: result.success,
      findingsCount: result.findingsCount,
      newFindings: result.newFindings,
      error: result.error,
    });
  } catch (error) {
    console.error("Error scanning for research:", error);
    res.status(500).json({ message: "Failed to scan for research" });
  }
});

// ============================================================================
// Research Findings
// ============================================================================

/**
 * GET /api/research-alerts/findings
 * List all findings for user (optionally filtered by monitor)
 */
router.get("/findings", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const monitorId = req.query.monitorId ? parseInt(req.query.monitorId, 10) : undefined;

    const findings = await storage.getResearchFindings(userId, monitorId);
    res.json(findings);
  } catch (error) {
    console.error("Error fetching findings:", error);
    res.status(500).json({ message: "Failed to fetch findings" });
  }
});

/**
 * GET /api/research-alerts/findings/unread
 * Get unread findings count
 */
router.get("/findings/unread", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const count = await getUnreadFindingsCount(userId);
    const findings = await storage.getUnreadResearchFindings(userId);

    res.json({
      count,
      findings: findings.slice(0, 10), // Return first 10 unread
    });
  } catch (error) {
    console.error("Error fetching unread findings:", error);
    res.status(500).json({ message: "Failed to fetch unread findings" });
  }
});

/**
 * GET /api/research-alerts/findings/:id
 * Get a specific finding
 */
router.get("/findings/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid finding ID" });
    }

    const finding = await storage.getResearchFinding(id, userId);
    if (!finding) {
      return res.status(404).json({ message: "Finding not found" });
    }

    res.json(finding);
  } catch (error) {
    console.error("Error fetching finding:", error);
    res.status(500).json({ message: "Failed to fetch finding" });
  }
});

/**
 * PATCH /api/research-alerts/findings/:id/read
 * Mark a finding as read
 */
router.patch("/findings/:id/read", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid finding ID" });
    }

    const success = await markFindingAsRead(id, userId);
    if (!success) {
      return res.status(404).json({ message: "Finding not found" });
    }

    res.json({ message: "Finding marked as read" });
  } catch (error) {
    console.error("Error marking finding as read:", error);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

/**
 * PATCH /api/research-alerts/findings/:id/save
 * Save/unsave a finding to bookmarks
 */
router.patch("/findings/:id/save", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    const { saved } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid finding ID" });
    }

    const success = await saveFindingToBookmarks(id, userId, saved !== false);
    if (!success) {
      return res.status(404).json({ message: "Finding not found" });
    }

    res.json({ message: saved !== false ? "Finding saved" : "Finding unsaved" });
  } catch (error) {
    console.error("Error saving finding:", error);
    res.status(500).json({ message: "Failed to save finding" });
  }
});

/**
 * PATCH /api/research-alerts/findings/:id/dismiss
 * Dismiss a finding
 */
router.patch("/findings/:id/dismiss", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid finding ID" });
    }

    const success = await dismissFinding(id, userId);
    if (!success) {
      return res.status(404).json({ message: "Finding not found" });
    }

    res.json({ message: "Finding dismissed" });
  } catch (error) {
    console.error("Error dismissing finding:", error);
    res.status(500).json({ message: "Failed to dismiss finding" });
  }
});

/**
 * POST /api/research-alerts/findings/mark-all-read
 * Mark all findings as read
 */
router.post("/findings/mark-all-read", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const unreadFindings = await storage.getUnreadResearchFindings(userId);

    for (const finding of unreadFindings) {
      await markFindingAsRead(finding.id, userId);
    }

    res.json({
      message: "All findings marked as read",
      count: unreadFindings.length,
    });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

export default router;
