/**
 * Children Routes - ბავშვების მართვის API
 * ========================================
 * CRUD operations for child patient records
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { insertChildSchema } from "@shared/schema";

const router = Router();

// GET /api/children - List all children for user
router.get("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const children = await storage.getChildren(userId);
    res.json(children);
  } catch (error) {
    console.error("Error fetching children:", error);
    res.status(500).json({ message: "Failed to fetch children" });
  }
});

// POST /api/children - Create a new child
router.post("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const parseResult = insertChildSchema.safeParse({ ...req.body, userId });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid child data", errors: parseResult.error.errors });
    }
    const child = await storage.createChild(parseResult.data);
    res.status(201).json(child);
  } catch (error) {
    console.error("Error creating child:", error);
    res.status(500).json({ message: "Failed to create child" });
  }
});

// GET /api/children/:id - Get a specific child
router.get("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }
    const child = await storage.getChild(id, userId);
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }
    res.json(child);
  } catch (error) {
    console.error("Error fetching child:", error);
    res.status(500).json({ message: "Failed to fetch child" });
  }
});

// PATCH /api/children/:id - Update a child
router.patch("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }
    const { userId: _, ...bodyWithoutUserId } = req.body;
    const parseResult = insertChildSchema.partial().safeParse(bodyWithoutUserId);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid child data", errors: parseResult.error.errors });
    }
    const child = await storage.updateChild(id, userId, parseResult.data);
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }
    res.json(child);
  } catch (error) {
    console.error("Error updating child:", error);
    res.status(500).json({ message: "Failed to update child" });
  }
});

// DELETE /api/children/:id - Delete a child
router.delete("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }
    const deleted = await storage.deleteChild(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Child not found" });
    }
    res.json({ message: "Child deleted successfully" });
  } catch (error) {
    console.error("Error deleting child:", error);
    res.status(500).json({ message: "Failed to delete child" });
  }
});

export default router;
