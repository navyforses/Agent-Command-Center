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
  insertChatMessageSchema,
} from "@shared/schema";
import { openai, AI_MODEL } from "./openai";

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

  // AI Chat endpoint - sends message to OpenAI and stores conversation
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

      // Build messages array for OpenAI
      const systemPrompt = "You are a helpful medical assistant for parents of children with Hypoxic-Ischemic Encephalopathy (HIE). Provide empathetic, accurate information about HIE, therapies, and medical care. Always recommend consulting healthcare providers for specific medical decisions.";

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

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages,
      });

      const aiResponseContent = completion.choices[0]?.message?.content || "I apologize, but I was unable to generate a response. Please try again.";

      // Save the AI response
      const assistantMessage = await storage.createChatMessage({
        userId,
        role: "assistant",
        content: aiResponseContent,
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

  return httpServer;
}
