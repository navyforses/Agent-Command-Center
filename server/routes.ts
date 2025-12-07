import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertChildSchema, 
  insertDocumentSchema,
  insertTherapySchema,
  insertTherapySessionSchema,
  insertAppointmentSchema,
  insertEmailSchema,
  insertConversationSchema,
  insertChatMessageSchema,
  insertTestimonialSchema,
} from "@shared/schema";
import { openai, AI_MODEL } from "./openai";
import { getConsensusResponse, getConsensusSearchResponse } from "./multiAI";
import { searchWeb, shouldTriggerSearch } from "./search";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { sendEmail } from "./resend";
import { 
  analyzeDocument, 
  executeAction, 
  processCommandCenterChat,
  processAndAnalyzeDocument,
  type DocumentAnalysisResult,
  type ActionResult,
  type SuggestedAction,
  type CommandCenterChatResult,
  type FullDocumentProcessingResult,
} from "./aiOrchestrator";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Children routes
  app.get("/api/children", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const children = await storage.getChildren(userId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  app.post("/api/children", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/children/:id", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/children/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/children/:id", isAuthenticated, async (req: any, res) => {
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

  // Documents routes
  app.get("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/documents/:id", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/documents/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/documents/:id", isAuthenticated, async (req: any, res) => {
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

  // Get documents for specific child
  app.get("/api/children/:childId/documents", isAuthenticated, async (req: any, res) => {
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
  });

  // Therapies routes
  app.get("/api/therapies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const therapies = await storage.getTherapies(userId);
      res.json(therapies);
    } catch (error) {
      console.error("Error fetching therapies:", error);
      res.status(500).json({ message: "Failed to fetch therapies" });
    }
  });

  app.post("/api/therapies", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/therapies/:id", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/therapies/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/therapies/:id", isAuthenticated, async (req: any, res) => {
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

  // Get therapies for specific child
  app.get("/api/children/:childId/therapies", isAuthenticated, async (req: any, res) => {
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
  });

  // Therapy Sessions routes
  app.get("/api/therapies/:therapyId/sessions", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/therapies/:therapyId/sessions", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/therapy-sessions/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/therapy-sessions/:id", isAuthenticated, async (req: any, res) => {
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

  // Appointments routes
  app.get("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appointments = await storage.getAppointments(userId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = insertAppointmentSchema.safeParse({ ...req.body, userId });
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid appointment data", errors: parseResult.error.errors });
      }
      const appointment = await storage.createAppointment(parseResult.data);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.get("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      const appointment = await storage.getAppointment(id, userId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  app.patch("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      const { userId: _, ...bodyWithoutUserId } = req.body;
      const parseResult = insertAppointmentSchema.partial().safeParse(bodyWithoutUserId);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid appointment data", errors: parseResult.error.errors });
      }
      const appointment = await storage.updateAppointment(id, userId, parseResult.data);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      const deleted = await storage.deleteAppointment(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json({ message: "Appointment deleted successfully" });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Emails routes
  app.get("/api/emails", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const emails = await storage.getEmails(userId);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  app.post("/api/emails", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/emails/:id", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/emails/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/emails/:id", isAuthenticated, async (req: any, res) => {
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

  // Conversation routes
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = insertConversationSchema.safeParse({ ...req.body, userId });
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid conversation data", errors: parseResult.error.errors });
      }
      const conversation = await storage.createConversation(parseResult.data);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      const conversation = await storage.getConversation(id, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      const { userId: _, ...bodyWithoutUserId } = req.body;
      const parseResult = insertConversationSchema.partial().safeParse(bodyWithoutUserId);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid conversation data", errors: parseResult.error.errors });
      }
      const conversation = await storage.updateConversation(id, userId, parseResult.data);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      const deleted = await storage.deleteConversation(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      const conversation = await storage.getConversation(id, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const messages = await storage.getChatMessagesByConversation(id, userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch conversation messages" });
    }
  });

  // Chat Messages routes
  app.get("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = insertChatMessageSchema.safeParse({ ...req.body, userId });
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid chat message data", errors: parseResult.error.errors });
      }
      const message = await storage.createChatMessage(parseResult.data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: "Failed to create chat message" });
    }
  });

  app.delete("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearChatMessages(userId);
      res.json({ message: "Chat messages cleared successfully" });
    } catch (error) {
      console.error("Error clearing chat messages:", error);
      res.status(500).json({ message: "Failed to clear chat messages" });
    }
  });

  // AI Chat endpoint - uses multi-AI consensus with OpenAI function calling for emails
  // First attempts OpenAI with function calling, then uses multi-AI consensus for regular responses
  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Get existing chat history
      const chatHistory = await storage.getChatMessages(userId);
      
      // Sort by createdAt to ensure chronological order
      chatHistory.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

      // Save the user's message
      const userMessage = await storage.createChatMessage({
        userId,
        role: "user",
        content,
      });

      // Build messages array for OpenAI function calling check
      const systemPrompt = `You are a helpful medical assistant for parents of children with Hypoxic-Ischemic Encephalopathy (HIE). 
Provide empathetic, accurate information about HIE, therapies, and medical care. Always recommend consulting healthcare providers for specific medical decisions.
Be supportive and understanding of the emotional challenges parents face.

You have the ability to send emails on behalf of the user. When a user asks you to send an email, draft an appropriate email and use the sendEmail function to send it.
If the user doesn't specify a recipient email address, ask them for it before sending.`;

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];

      // Add chat history
      for (const msg of chatHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      // Add the new user message
      messages.push({ role: "user", content });

      // Define tools for function calling
      const tools: any[] = [
        {
          type: "function",
          function: {
            name: "sendEmail",
            description: "Send an email to a specified recipient. Use this when the user asks you to send, draft and send, or compose and send an email.",
            parameters: {
              type: "object",
              properties: {
                to: {
                  type: "string",
                  description: "The recipient's email address"
                },
                subject: {
                  type: "string",
                  description: "The email subject line"
                },
                body: {
                  type: "string",
                  description: "The email body content"
                }
              },
              required: ["to", "subject", "body"]
            }
          }
        }
      ];

      // First, call OpenAI with function calling to check if this is an email request
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages,
        tools,
        tool_choice: "auto",
      });

      const responseMessage = completion.choices[0]?.message;
      
      // Check if AI wants to call a function (email sending)
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        
        if ('function' in toolCall && toolCall.function.name === "sendEmail") {
          const args = JSON.parse(toolCall.function.arguments);
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const isValidEmail = emailRegex.test(args.to?.trim() || "");
          const hasSubject = args.subject?.trim()?.length > 0;
          const hasBody = args.body?.trim()?.length > 0;

          let responseContent: string;
          
          if (!isValidEmail) {
            responseContent = `The email address "${args.to}" doesn't appear to be valid. Please provide a valid email address (like example@email.com) and I'll try again.`;
            
            const assistantMessage = await storage.createChatMessage({
              userId,
              role: "assistant",
              content: responseContent,
            });
            return res.json(assistantMessage);
          }

          if (!hasSubject || !hasBody) {
            responseContent = `I need both a subject and message body to send an email. Please provide the missing information and I'll try again.`;
            
            const assistantMessage = await storage.createChatMessage({
              userId,
              role: "assistant",
              content: responseContent,
            });
            return res.json(assistantMessage);
          }
          
          // Actually send the email
          const emailResult = await sendEmail({
            to: args.to.trim(),
            subject: args.subject.trim(),
            body: args.body.trim(),
          });

          // Log full error details server-side for debugging
          if (!emailResult.success) {
            console.error("Email send failed for user", userId, ":", emailResult.error);
          }

          // Save the email to the database with appropriate status
          await storage.createEmail({
            userId,
            recipient: args.to.trim(),
            subject: args.subject.trim(),
            body: args.body.trim(),
            status: emailResult.success ? "sent" : "failed",
            category: "general",
            sentAt: emailResult.success ? new Date() : null,
          });

          // Build response message based on result (sanitized - no raw SMTP errors)
          if (emailResult.success) {
            responseContent = `I've successfully sent the email to ${args.to}.\n\n**Subject:** ${args.subject}\n\n**Message:**\n${args.body}`;
          } else {
            responseContent = `I wasn't able to send the email right now due to a delivery issue. I've saved it in your Email Hub so you can try sending it again later.`;
          }

          // Save the AI response
          const assistantMessage = await storage.createChatMessage({
            userId,
            role: "assistant",
            content: responseContent,
          });

          return res.json(assistantMessage);
        }
      }

      // For non-function-call responses, use multi-AI consensus for better quality
      const consensusSystemPrompt = `You are a helpful medical assistant for parents of children with Hypoxic-Ischemic Encephalopathy (HIE). 
Provide empathetic, accurate information about HIE, therapies, and medical care. Always recommend consulting healthcare providers for specific medical decisions.
Be supportive and understanding of the emotional challenges parents face.`;

      // Format chat history for multi-AI consensus
      const formattedHistory: { role: "user" | "assistant"; content: string }[] = chatHistory
        .filter(msg => msg.role === "user" || msg.role === "assistant")
        .map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content }));

      // Check if this is a search query that should trigger deep web search
      const isSearchQuery = shouldTriggerSearch(content);
      
      let consensusResult;
      let searchSources: { title: string; url: string; snippet: string }[] = [];
      
      if (isSearchQuery) {
        console.log("Deep search triggered for query:", content);
        
        // Perform web search first
        const searchResponse = await searchWeb(content, 5);
        searchSources = searchResponse.results;
        
        console.log(`Tavily search returned ${searchSources.length} results`);
        
        if (searchSources.length > 0) {
          // Use search-enhanced consensus response
          const searchConsensusResult = await getConsensusSearchResponse(
            content,
            searchSources,
            formattedHistory
          );
          
          consensusResult = {
            content: searchConsensusResult.content,
            sources: searchConsensusResult.sources,
            processingTime: searchConsensusResult.processingTime,
          };
          
          console.log(`Multi-AI search consensus: ${consensusResult.sources.length} provider(s) responded in ${consensusResult.processingTime}ms`);
        } else {
          // Fallback to regular consensus if no search results
          consensusResult = await getConsensusResponse(consensusSystemPrompt, content, formattedHistory);
          console.log(`Multi-AI consensus (no search results): ${consensusResult.sources.length} provider(s) responded in ${consensusResult.processingTime}ms`);
        }
      } else {
        // Regular multi-AI consensus without search
        consensusResult = await getConsensusResponse(consensusSystemPrompt, content, formattedHistory);
        console.log(`Multi-AI consensus: ${consensusResult.sources.length} provider(s) responded (${consensusResult.sources.join(", ") || "none"}) in ${consensusResult.processingTime}ms`);
      }

      // Save the AI response with search sources if available
      const assistantMessage = await storage.createChatMessage({
        userId,
        role: "assistant",
        content: consensusResult.content,
        searchSources: searchSources.length > 0 ? searchSources : null,
        isSearchResult: isSearchQuery && searchSources.length > 0,
      });

      res.json(assistantMessage);
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Document Analysis endpoint - analyzes document with AI
  app.post("/api/documents/:id/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Get the document and verify ownership
      const document = await storage.getDocument(id, userId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Build prompt for analysis
      const analysisPrompt = `Analyze the following medical document for a parent of a child with Hypoxic-Ischemic Encephalopathy (HIE).

Document Title: ${document.title}
Category: ${document.category || "Not specified"}
File Type: ${document.fileType || "Unknown"}

Please provide:
1. A concise summary of what this document likely contains and its relevance to HIE care (2-3 sentences)
2. Key findings or important points that parents should pay attention to (as a list of 3-5 key points)

Format your response as JSON with the following structure:
{
  "summary": "Your summary here",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"]
}`;

      // Call OpenAI for analysis
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a medical document analysis assistant helping parents of children with HIE understand their medical documents. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const responseContent = completion.choices[0]?.message?.content || "{}";
      
      let analysisResult: { summary?: string; keyFindings?: string[] };
      try {
        analysisResult = JSON.parse(responseContent);
      } catch {
        analysisResult = {
          summary: "Unable to parse analysis results.",
          keyFindings: ["Please try analyzing the document again."],
        };
      }

      const aiSummary = analysisResult.summary || "No summary available.";
      const aiKeyFindings = Array.isArray(analysisResult.keyFindings) ? analysisResult.keyFindings : [];

      // Update the document with AI analysis
      const updatedDocument = await storage.updateDocument(id, userId, {
        aiSummary,
        aiKeyFindings,
      });

      res.json({
        id: document.id,
        aiSummary,
        aiKeyFindings,
        message: "Document analysis completed successfully",
      });
    } catch (error) {
      console.error("Error analyzing document:", error);
      res.status(500).json({ message: "Failed to analyze document" });
    }
  });

  // Object Storage routes
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.post("/api/objects/acl", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const objectStorageService = new ObjectStorageService();
    
    const { uploadURL, aclPolicy } = req.body;
    if (!uploadURL || typeof uploadURL !== 'string') {
      return res.status(400).json({ message: "uploadURL is required" });
    }
    
    if (!aclPolicy || typeof aclPolicy !== 'object') {
      return res.status(400).json({ message: "aclPolicy is required and must be an object" });
    }
    
    const { visibility } = aclPolicy;
    if (!visibility || (visibility !== 'public' && visibility !== 'private')) {
      return res.status(400).json({ 
        message: "aclPolicy.visibility is required and must be 'public' or 'private'" 
      });
    }
    
    try {
      const url = new URL(uploadURL);
      if (!url.hostname.includes('storage.googleapis.com') && !url.hostname.includes('replit')) {
        return res.status(403).json({ message: "Invalid storage URL" });
      }
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }
    
    try {
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: userId,
          visibility: visibility,
        }
      );
      
      if (!objectPath) {
        return res.status(500).json({ message: "Failed to set ACL policy: no object path returned" });
      }
      
      if (!objectPath.startsWith('/')) {
        return res.status(400).json({ 
          message: "Failed to set ACL policy: object path could not be normalized. Ensure the upload URL points to a valid private object." 
        });
      }
      
      res.json({ objectPath });
    } catch (error) {
      console.error("Error setting object ACL:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Object not found. The file may not have been uploaded yet or the URL is incorrect." });
      }
      res.status(500).json({ message: "Failed to set object ACL" });
    }
  });

  app.put("/api/documents/:id/file", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    
    const existingDoc = await storage.getDocument(id, userId);
    if (!existingDoc) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    const objectStorageService = new ObjectStorageService();
    const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
      req.body.uploadURL,
      {
        owner: userId,
        visibility: "private",
      }
    );
    
    const document = await storage.updateDocument(id, userId, {
      filePath: objectPath,
      fileType: req.body.fileType,
      fileSize: req.body.fileSize,
    });
    
    res.json(document);
  });

  // Testimonials routes - PUBLIC GET for landing page
  app.get("/api/testimonials", async (req, res) => {
    try {
      const testimonials = await storage.getApprovedTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // Get current user's testimonial (authenticated)
  app.get("/api/testimonials/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const testimonial = await storage.getUserTestimonial(userId);
      res.json(testimonial || null);
    } catch (error) {
      console.error("Error fetching user testimonial:", error);
      res.status(500).json({ message: "Failed to fetch testimonial" });
    }
  });

  // Create testimonial (authenticated)
  app.post("/api/testimonials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has a testimonial
      const existing = await storage.getUserTestimonial(userId);
      if (existing) {
        return res.status(400).json({ message: "You already have a testimonial. Please update it instead." });
      }
      
      const parseResult = insertTestimonialSchema.safeParse({ ...req.body, userId });
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid testimonial data", errors: parseResult.error.errors });
      }
      
      const testimonial = await storage.createTestimonial(parseResult.data);
      res.status(201).json(testimonial);
    } catch (error) {
      console.error("Error creating testimonial:", error);
      res.status(500).json({ message: "Failed to create testimonial" });
    }
  });

  // Update testimonial (authenticated - own only)
  app.patch("/api/testimonials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid testimonial ID" });
      }
      
      const { userId: _, isApproved: __, ...bodyWithoutSensitiveFields } = req.body;
      const parseResult = insertTestimonialSchema.partial().safeParse(bodyWithoutSensitiveFields);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid testimonial data", errors: parseResult.error.errors });
      }
      
      const testimonial = await storage.updateTestimonial(id, userId, parseResult.data);
      if (!testimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      res.json(testimonial);
    } catch (error) {
      console.error("Error updating testimonial:", error);
      res.status(500).json({ message: "Failed to update testimonial" });
    }
  });

  // Delete testimonial (authenticated - own only)
  app.delete("/api/testimonials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid testimonial ID" });
      }
      
      const deleted = await storage.deleteTestimonial(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      res.status(500).json({ message: "Failed to delete testimonial" });
    }
  });

  // AI Command Center Routes
  
  // Get assistant messages with action metadata
  app.get("/api/assistant/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching assistant messages:", error);
      res.status(500).json({ message: "Failed to fetch assistant messages" });
    }
  });

  // Enhanced AI chat with function calling for actions
  app.post("/api/assistant/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content, documentIds, conversationId: providedConversationId } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Auto-create conversation if none provided
      let activeConversationId = providedConversationId;
      if (!activeConversationId) {
        // Create a new conversation with title from first message (max 50 chars)
        const title = content.length > 50 ? content.substring(0, 50) + "..." : content;
        const newConversation = await storage.createConversation({
          userId,
          title,
          preview: null,
        });
        activeConversationId = newConversation.id;
      }

      // Get user context - use conversation-specific history
      const [chatHistory, documents, children] = await Promise.all([
        storage.getChatMessagesByConversation(activeConversationId, userId),
        storage.getDocuments(userId),
        storage.getChildren(userId),
      ]);

      // Sort chat history
      chatHistory.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

      // Save user message with conversationId
      const userMessage = await storage.createChatMessage({
        userId,
        role: "user",
        content,
        documentIds: documentIds || null,
        conversationId: activeConversationId,
      });

      // Format history for AI
      const formattedHistory = chatHistory
        .filter(msg => msg.role === "user" || msg.role === "assistant")
        .slice(-20)
        .map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content }));

      // Process with Command Center AI
      const result = await processCommandCenterChat(
        userId,
        content,
        formattedHistory,
        documents,
        children
      );

      // Save assistant response message FIRST to get its ID for parent reference
      const firstAction = result.suggestedActions?.[0];
      const assistantMessage = await storage.createChatMessage({
        userId,
        role: "assistant",
        content: result.content,
        documentIds: result.documentIds || null,
        actionType: firstAction?.actionType || null,
        actionData: firstAction?.actionData || null,
        actionStatus: result.suggestedActions?.length ? "pending" : null,
        conversationId: activeConversationId,
      });

      // Update conversation preview
      const preview = result.content.substring(0, 100) + (result.content.length > 100 ? '...' : '');
      await storage.updateConversation(activeConversationId, userId, { preview });

      // Store each suggested action as a separate pending action message with parentMessageId
      const pendingActionMessages = [];
      if (result.suggestedActions && result.suggestedActions.length > 0) {
        for (const action of result.suggestedActions) {
          const actionMessage = await storage.createChatMessage({
            userId,
            role: "assistant",
            content: `${action.description}${action.descriptionKa ? `\n${action.descriptionKa}` : ''}`,
            actionType: action.actionType,
            actionData: { ...action.actionData, parentMessageId: assistantMessage.id },
            actionStatus: "pending",
            conversationId: activeConversationId,
          });
          pendingActionMessages.push(actionMessage);
        }
      }

      res.json({
        message: assistantMessage,
        suggestedActions: result.suggestedActions || [],
        pendingActionMessages,
        conversationId: activeConversationId,
      });
    } catch (error) {
      console.error("Error in AI Command Center chat:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Upload and analyze document via AI Command Center
  app.post("/api/assistant/upload", isAuthenticated, async (req: any, res) => {
    let documentId: number | null = null;
    const userId = req.user.claims.sub;
    
    try {
      const { title, filePath, fileType, fileSize, content } = req.body;

      if (!title) {
        return res.status(400).json({ message: "Document title is required" });
      }

      // Create document record with processing status
      const document = await storage.createDocument({
        userId,
        title,
        filePath: filePath || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        processingStatus: "processing",
      });
      documentId = document.id;

      // Process and analyze document with AI (includes PDF/image text extraction)
      const processingResult = await processAndAnalyzeDocument(
        filePath || null,
        title,
        fileType || "unknown",
        content
      );
      
      const analysis = processingResult.analysis;
      const extractedText = processingResult.extraction.text || content || null;
      
      // Update document with analysis results
      const updatedDocument = await storage.updateDocument(document.id, userId, {
        category: analysis.category,
        documentType: analysis.documentType,
        aiSummary: analysis.summary,
        aiSummaryKa: analysis.summaryKa,
        aiKeyFindings: analysis.keyFindings,
        purpose: analysis.purpose,
        extractedText,
        processingStatus: processingResult.success ? "completed" : "failed",
      });

      // Create chat message about the upload
      const uploadMessage = await storage.createChatMessage({
        userId,
        role: "assistant",
        content: `I've analyzed your document "${title}".\n\n**Summary:** ${analysis.summary}\n\n**Category:** ${analysis.category}\n**Document Type:** ${analysis.documentType}${analysis.keyFindings.length > 0 ? `\n\n**Key Findings:**\n${analysis.keyFindings.map(f => `- ${f}`).join('\n')}` : ''}${analysis.suggestedActions?.length ? `\n\n**Suggested Actions:**\n${analysis.suggestedActions.map(a => `- ${a.description}`).join('\n')}` : ''}`,
        documentIds: [document.id],
        actionType: "analyze_document",
        actionStatus: "executed",
      });

      // Store suggested actions as pending action messages with parentMessageId
      // Note: DocumentAnalysisResult uses { type, data } for actions
      const pendingActionMessages = [];
      if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
        for (const suggestedAction of analysis.suggestedActions) {
          const actionMessage = await storage.createChatMessage({
            userId,
            role: "assistant",
            content: `${suggestedAction.description}${suggestedAction.descriptionKa ? `\n${suggestedAction.descriptionKa}` : ''}`,
            actionType: suggestedAction.type,
            actionData: { ...suggestedAction.data, parentMessageId: uploadMessage.id },
            actionStatus: "pending",
            documentIds: [document.id],
          });
          pendingActionMessages.push(actionMessage);
        }
      }

      res.json({
        document: updatedDocument,
        analysis,
        message: uploadMessage,
        suggestedActions: analysis.suggestedActions || [],
        pendingActionMessages,
      });
    } catch (error) {
      console.error("Error uploading document to AI:", error);
      
      // Update document status to failed if it was created
      if (documentId) {
        try {
          await storage.updateDocument(documentId, userId, {
            processingStatus: "failed",
          });
        } catch (updateError) {
          console.error("Error updating document status to failed:", updateError);
        }
      }
      
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  // Execute a suggested action from AI
  app.post("/api/assistant/execute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { actionType, actionData, messageId } = req.body;

      if (!actionType) {
        return res.status(400).json({ message: "Action type is required" });
      }

      const result = await executeAction(actionType, actionData, userId);

      // If messageId provided, update the original pending action message's status
      // and also update the parent assistant message's actionStatus
      if (messageId) {
        const pendingMessage = await storage.getChatMessage(messageId, userId);
        
        await storage.updateChatMessage(messageId, userId, {
          actionStatus: result.success ? "executed" : "pending",
        });

        // Update parent message's actionStatus if parentMessageId exists in actionData
        if (pendingMessage?.actionData && typeof pendingMessage.actionData === 'object') {
          const parentMessageId = (pendingMessage.actionData as Record<string, unknown>).parentMessageId;
          if (parentMessageId && typeof parentMessageId === 'number') {
            await storage.updateChatMessage(parentMessageId, userId, {
              actionStatus: "executed",
            });
          }
        }
      }

      // Create chat message about the action result
      if (result.success) {
        await storage.createChatMessage({
          userId,
          role: "assistant",
          content: `${result.message}\n\n${result.messageKa || ''}`,
          actionType: result.actionType,
          actionData: result.data,
          actionStatus: "executed",
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error executing AI action:", error);
      res.status(500).json({ message: "Failed to execute action" });
    }
  });

  // Cancel a pending action
  app.post("/api/assistant/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId } = req.body;

      if (!messageId) {
        return res.status(400).json({ message: "Message ID is required" });
      }

      // Get the original message to verify it exists and is pending
      const message = await storage.getChatMessage(messageId, userId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.actionStatus !== "pending") {
        return res.status(400).json({ message: "Action is not pending" });
      }

      // Update the action status to cancelled
      const updatedMessage = await storage.updateChatMessage(messageId, userId, {
        actionStatus: "cancelled",
      });

      // Update parent message's actionStatus if parentMessageId exists in actionData
      if (message.actionData && typeof message.actionData === 'object') {
        const parentMessageId = (message.actionData as Record<string, unknown>).parentMessageId;
        if (parentMessageId && typeof parentMessageId === 'number') {
          await storage.updateChatMessage(parentMessageId, userId, {
            actionStatus: "cancelled",
          });
        }
      }

      res.json({
        success: true,
        message: "Action cancelled",
        updatedMessage,
      });
    } catch (error) {
      console.error("Error cancelling AI action:", error);
      res.status(500).json({ message: "Failed to cancel action" });
    }
  });

  // Get documents with AI analysis for knowledge base
  app.get("/api/assistant/knowledge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getDocuments(userId);
      
      // Filter to only include analyzed documents
      const analyzedDocs = documents.filter(doc => 
        doc.processingStatus === "completed" && doc.aiSummary
      );

      res.json(analyzedDocs);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  return httpServer;
}
