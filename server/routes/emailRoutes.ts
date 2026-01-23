/**
 * Email Routes - ელ.ფოსტის მართვის API
 * =====================================
 * CRUD operations for email drafts and sending
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { insertEmailSchema } from "@shared/schema";
import { sendEmail } from "../resend";

const router = Router();

// GET /api/emails - List all emails for user
router.get("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const emails = await storage.getEmails(userId);
    res.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ message: "Failed to fetch emails" });
  }
});

// POST /api/emails - Create a new email (draft or send)
router.post("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const parseResult = insertEmailSchema.safeParse({ ...req.body, userId });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid email data", errors: parseResult.error.errors });
    }

    // If status is 'sent', actually send the email via Resend
    if (parseResult.data.status === 'sent' && parseResult.data.recipient && parseResult.data.subject && parseResult.data.body) {
      const sendResult = await sendEmail({
        to: parseResult.data.recipient,
        subject: parseResult.data.subject,
        body: parseResult.data.body,
      });

      if (!sendResult.success) {
        return res.status(500).json({ message: sendResult.error || "Failed to send email" });
      }

      // Update sentAt timestamp
      parseResult.data.sentAt = new Date();
    }

    const email = await storage.createEmail(parseResult.data);
    res.status(201).json(email);
  } catch (error) {
    console.error("Error creating email:", error);
    res.status(500).json({ message: "Failed to create email" });
  }
});

// GET /api/emails/:id - Get a specific email
router.get("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid email ID" });
    }
    const email = await storage.getEmail(id, userId);
    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }
    res.json(email);
  } catch (error) {
    console.error("Error fetching email:", error);
    res.status(500).json({ message: "Failed to fetch email" });
  }
});

// PATCH /api/emails/:id - Update an email
router.patch("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid email ID" });
    }
    const { userId: _, ...bodyWithoutUserId } = req.body;
    const parseResult = insertEmailSchema.partial().safeParse(bodyWithoutUserId);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid email data", errors: parseResult.error.errors });
    }
    const email = await storage.updateEmail(id, userId, parseResult.data);
    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }
    res.json(email);
  } catch (error) {
    console.error("Error updating email:", error);
    res.status(500).json({ message: "Failed to update email" });
  }
});

// DELETE /api/emails/:id - Delete an email
router.delete("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid email ID" });
    }
    const deleted = await storage.deleteEmail(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Email not found" });
    }
    res.json({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting email:", error);
    res.status(500).json({ message: "Failed to delete email" });
  }
});

export default router;
