/**
 * Therapy Routes - თერაპიების მართვის API
 * ========================================
 * CRUD operations for therapies and therapy sessions
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { insertTherapySchema, insertTherapySessionSchema } from "@shared/schema";

const router = Router();

// ============================================================================
// Therapies CRUD
// ============================================================================

// GET /api/therapies - List all therapies for user
router.get("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const therapies = await storage.getTherapies(userId);
    res.json(therapies);
  } catch (error) {
    console.error("Error fetching therapies:", error);
    res.status(500).json({ message: "Failed to fetch therapies" });
  }
});

// POST /api/therapies - Create a new therapy
router.post("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const parseResult = insertTherapySchema.safeParse({ ...req.body, userId });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid therapy data", errors: parseResult.error.errors });
    }
    const therapy = await storage.createTherapy(parseResult.data);
    res.status(201).json(therapy);
  } catch (error) {
    console.error("Error creating therapy:", error);
    res.status(500).json({ message: "Failed to create therapy" });
  }
});

// GET /api/therapies/:id - Get a specific therapy
router.get("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid therapy ID" });
    }
    const therapy = await storage.getTherapy(id, userId);
    if (!therapy) {
      return res.status(404).json({ message: "Therapy not found" });
    }
    res.json(therapy);
  } catch (error) {
    console.error("Error fetching therapy:", error);
    res.status(500).json({ message: "Failed to fetch therapy" });
  }
});

// PATCH /api/therapies/:id - Update a therapy
router.patch("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid therapy ID" });
    }
    const { userId: _, ...bodyWithoutUserId } = req.body;
    const parseResult = insertTherapySchema.partial().safeParse(bodyWithoutUserId);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid therapy data", errors: parseResult.error.errors });
    }
    const therapy = await storage.updateTherapy(id, userId, parseResult.data);
    if (!therapy) {
      return res.status(404).json({ message: "Therapy not found" });
    }
    res.json(therapy);
  } catch (error) {
    console.error("Error updating therapy:", error);
    res.status(500).json({ message: "Failed to update therapy" });
  }
});

// DELETE /api/therapies/:id - Delete a therapy
router.delete("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid therapy ID" });
    }
    const deleted = await storage.deleteTherapy(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Therapy not found" });
    }
    res.json({ message: "Therapy deleted successfully" });
  } catch (error) {
    console.error("Error deleting therapy:", error);
    res.status(500).json({ message: "Failed to delete therapy" });
  }
});

// ============================================================================
// Therapy Sessions
// ============================================================================

// GET /api/therapies/:therapyId/sessions - List sessions for a therapy
router.get("/:therapyId/sessions", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const therapyId = parseInt(req.params.therapyId, 10);
    if (isNaN(therapyId)) {
      return res.status(400).json({ message: "Invalid therapy ID" });
    }
    const sessions = await storage.getTherapySessions(therapyId, userId);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching therapy sessions:", error);
    res.status(500).json({ message: "Failed to fetch therapy sessions" });
  }
});

// POST /api/therapies/:therapyId/sessions - Create a new session
router.post("/:therapyId/sessions", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const therapyId = parseInt(req.params.therapyId, 10);
    if (isNaN(therapyId)) {
      return res.status(400).json({ message: "Invalid therapy ID" });
    }
    const { therapyId: __, ...bodyWithoutTherapyId } = req.body;
    const parseResult = insertTherapySessionSchema.safeParse({ ...bodyWithoutTherapyId, therapyId });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid therapy session data", errors: parseResult.error.errors });
    }
    const session = await storage.createTherapySession(parseResult.data, userId);
    if (!session) {
      return res.status(404).json({ message: "Therapy not found" });
    }
    res.status(201).json(session);
  } catch (error) {
    console.error("Error creating therapy session:", error);
    res.status(500).json({ message: "Failed to create therapy session" });
  }
});

export default router;

// Child therapies route - mounted separately
export const childTherapiesHandler = async (req: any, res: any) => {
  try {
    const userId = req.user.claims.sub;
    const childId = parseInt(req.params.childId, 10);
    if (isNaN(childId)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }
    const therapies = await storage.getTherapiesByChild(childId, userId);
    res.json(therapies);
  } catch (error) {
    console.error("Error fetching therapies for child:", error);
    res.status(500).json({ message: "Failed to fetch therapies for child" });
  }
};

// Therapy session update/delete routes - mounted separately at /api/therapy-sessions
export const therapySessionRoutes = Router();

therapySessionRoutes.patch("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid therapy session ID" });
    }
    const { userId: _, therapyId: __, ...bodyWithoutSensitiveFields } = req.body;
    const parseResult = insertTherapySessionSchema.partial().safeParse(bodyWithoutSensitiveFields);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid therapy session data", errors: parseResult.error.errors });
    }
    const session = await storage.updateTherapySession(id, userId, parseResult.data);
    if (!session) {
      return res.status(404).json({ message: "Therapy session not found" });
    }
    res.json(session);
  } catch (error) {
    console.error("Error updating therapy session:", error);
    res.status(500).json({ message: "Failed to update therapy session" });
  }
});

therapySessionRoutes.delete("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid therapy session ID" });
    }
    const deleted = await storage.deleteTherapySession(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Therapy session not found" });
    }
    res.json({ message: "Therapy session deleted successfully" });
  } catch (error) {
    console.error("Error deleting therapy session:", error);
    res.status(500).json({ message: "Failed to delete therapy session" });
  }
});
