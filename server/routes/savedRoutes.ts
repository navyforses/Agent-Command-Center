/**
 * Saved Routes - Bookmarks/Saved Items
 * =====================================
 * Manage saved/bookmarked items (trials, articles, drugs)
 */

import { Router, Response } from "express";
import { storage } from "../storage";
import { AuthenticatedRequest, getUserId } from "../types";
import { sendError } from "../middleware/errorHandler";
import { z } from "zod";

const router = Router();

// Validation schemas
const saveItemSchema = z.object({
  itemType: z.enum(["clinical_trial", "research_article", "drug_info", "question"]),
  itemId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateSavedItemSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/saved
 * Get all saved items for user
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const { type, page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const savedItems = await storage.getSavedItems(userId, {
      type: type as string | undefined,
      page: pageNum,
      limit: limitNum,
    });

    const total = await storage.getSavedItemsCount(userId, type as string | undefined);

    return res.json({
      items: savedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching saved items:", error);
    return sendError.internal(res, "Failed to fetch saved items");
  }
});

/**
 * POST /api/saved
 * Save/bookmark an item
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const parseResult = saveItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError.badRequest(res, "Invalid item data", parseResult.error.errors);
    }

    // Check if already saved
    const existing = await storage.getSavedItemByItemId(userId, parseResult.data.itemId);
    if (existing) {
      return sendError.conflict(res, "Item already saved");
    }

    const savedItem = await storage.createSavedItem({
      userId,
      ...parseResult.data,
    });

    return res.status(201).json(savedItem);
  } catch (error) {
    console.error("Error saving item:", error);
    return sendError.internal(res, "Failed to save item");
  }
});

/**
 * GET /api/saved/:id
 * Get specific saved item
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError.badRequest(res, "Invalid item ID");
    }

    const savedItem = await storage.getSavedItem(id, userId);
    if (!savedItem) {
      return sendError.notFound(res, "Saved item");
    }

    return res.json(savedItem);
  } catch (error) {
    console.error("Error fetching saved item:", error);
    return sendError.internal(res, "Failed to fetch saved item");
  }
});

/**
 * PATCH /api/saved/:id
 * Update saved item (notes, tags)
 */
router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError.badRequest(res, "Invalid item ID");
    }

    const parseResult = updateSavedItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError.badRequest(res, "Invalid update data", parseResult.error.errors);
    }

    const savedItem = await storage.updateSavedItem(id, userId, parseResult.data);
    if (!savedItem) {
      return sendError.notFound(res, "Saved item");
    }

    return res.json(savedItem);
  } catch (error) {
    console.error("Error updating saved item:", error);
    return sendError.internal(res, "Failed to update saved item");
  }
});

/**
 * DELETE /api/saved/:id
 * Remove saved item
 */
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError.badRequest(res, "Invalid item ID");
    }

    const deleted = await storage.deleteSavedItem(id, userId);
    if (!deleted) {
      return sendError.notFound(res, "Saved item");
    }

    return res.json({ message: "Item removed from saved" });
  } catch (error) {
    console.error("Error deleting saved item:", error);
    return sendError.internal(res, "Failed to remove saved item");
  }
});

/**
 * GET /api/saved/check/:itemId
 * Check if an item is saved
 */
router.get("/check/:itemId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const { itemId } = req.params;
    const savedItem = await storage.getSavedItemByItemId(userId, itemId);

    return res.json({
      isSaved: !!savedItem,
      savedItemId: savedItem?.id || null,
    });
  } catch (error) {
    console.error("Error checking saved status:", error);
    return sendError.internal(res, "Failed to check saved status");
  }
});

/**
 * POST /api/saved/toggle
 * Toggle save status for an item
 */
router.post("/toggle", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const parseResult = saveItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError.badRequest(res, "Invalid item data", parseResult.error.errors);
    }

    // Check if already saved
    const existing = await storage.getSavedItemByItemId(userId, parseResult.data.itemId);

    if (existing) {
      // Unsave
      await storage.deleteSavedItem(existing.id, userId);
      return res.json({
        isSaved: false,
        message: "Item removed from saved",
      });
    } else {
      // Save
      const savedItem = await storage.createSavedItem({
        userId,
        ...parseResult.data,
      });
      return res.json({
        isSaved: true,
        savedItem,
        message: "Item saved",
      });
    }
  } catch (error) {
    console.error("Error toggling saved status:", error);
    return sendError.internal(res, "Failed to toggle saved status");
  }
});

/**
 * GET /api/saved/tags
 * Get all unique tags used by user
 */
router.get("/tags/all", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const tags = await storage.getUserSavedTags(userId);

    return res.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return sendError.internal(res, "Failed to fetch tags");
  }
});

export default router;
