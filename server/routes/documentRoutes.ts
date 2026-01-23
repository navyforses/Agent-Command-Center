/**
 * Document Routes - დოკუმენტების მართვის API
 * ==========================================
 * CRUD operations for medical documents
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { insertDocumentSchema } from "@shared/schema";

const router = Router();

// GET /api/documents - List all documents for user
router.get("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const documents = await storage.getDocuments(userId);
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// POST /api/documents - Create a new document
router.post("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const parseResult = insertDocumentSchema.safeParse({ ...req.body, userId });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid document data", errors: parseResult.error.errors });
    }
    const document = await storage.createDocument(parseResult.data);
    res.status(201).json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ message: "Failed to create document" });
  }
});

// GET /api/documents/:id - Get a specific document
router.get("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    const document = await storage.getDocument(id, userId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ message: "Failed to fetch document" });
  }
});

// PATCH /api/documents/:id - Update a document
router.patch("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    const { userId: _, ...bodyWithoutUserId } = req.body;
    const parseResult = insertDocumentSchema.partial().safeParse(bodyWithoutUserId);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid document data", errors: parseResult.error.errors });
    }
    const document = await storage.updateDocument(id, userId, parseResult.data);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ message: "Failed to update document" });
  }
});

// DELETE /api/documents/:id - Delete a document
router.delete("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    const deleted = await storage.deleteDocument(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ message: "Failed to delete document" });
  }
});

export default router;

// Child documents route - mounted separately
export const childDocumentsHandler = async (req: any, res: any) => {
  try {
    const userId = req.user.claims.sub;
    const childId = parseInt(req.params.childId, 10);
    if (isNaN(childId)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }
    const documents = await storage.getDocumentsByChild(childId, userId);
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents for child:", error);
    res.status(500).json({ message: "Failed to fetch documents for child" });
  }
};
