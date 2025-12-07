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
  insertTestimonialSchema,
} from "@shared/schema";
import { openai, AI_MODEL } from "./openai";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { sendEmail } from "./resend";

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
  // Supports function calling for sending emails
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
      const systemPrompt = `You are a helpful medical assistant for parents of children with Hypoxic-Ischemic Encephalopathy (HIE). 
Provide empathetic, accurate information about HIE, therapies, and medical care. Always recommend consulting healthcare providers for specific medical decisions.

You have the ability to send emails on behalf of the user. When a user asks you to send an email, draft an appropriate email and use the sendEmail function to send it.
If the user doesn't specify a recipient email address, ask them for it before sending.
After sending an email, confirm to the user that it was sent successfully.`;

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

      // Call OpenAI with function calling
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages,
        tools,
        tool_choice: "auto",
      });

      const responseMessage = completion.choices[0]?.message;
      
      // Check if AI wants to call a function
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        
        if (toolCall.function.name === "sendEmail") {
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

      // Regular response (no function call)
      const aiResponseContent = responseMessage?.content || "I apologize, but I was unable to generate a response. Please try again.";

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

  return httpServer;
}
