import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
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
  insertNexusResearchQuerySchema,
  insertNexusHypothesisSchema,
  insertNexusActionItemSchema,
  insertAccumulatedKnowledgeSchema,
  updateUserPreferencesSchema,
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
import { runNexusResearch } from "./nexusOrchestrator";
import { extractTextFromPDF, extractTextFromImage } from "./documentProcessor";
import { generateReportPDF, generateCycleSummaryPDF } from "./pdfGenerator";
import { 
  searchOpenAlex, 
  searchSemanticScholar, 
  searchAcademicSources,
  searchOpenAlexCrossDisciplinary,
  searchSemanticScholarRecommendations,
  formatAcademicResultsForAI,
  type AcademicPaper,
  type UnifiedAcademicSearchResult,
} from "./academicSearch";

const diagnosisUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and image files are allowed."));
    }
  },
});

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

  // User Profile routes
  app.put("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, email } = req.body;

      const user = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // User Preferences routes
  app.get("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let preferences = await storage.getUserPreferences(userId);

      // If no preferences exist, create default ones
      if (!preferences) {
        preferences = await storage.createUserPreferences({
          userId,
          emailNotifications: true,
          appointmentReminders: true,
          clinicalTrialAlerts: true,
          dataSharing: false,
          language: "en",
          theme: "light",
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.put("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = updateUserPreferencesSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid preferences data",
          errors: parseResult.error.errors,
        });
      }

      const preferences = await storage.updateUserPreferences(userId, parseResult.data);

      if (!preferences) {
        return res.status(404).json({ message: "Failed to update preferences" });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Export user data
  app.get("/api/user/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Gather all user data
      const [user, preferences, children, documents, therapies, appointments, emails] = await Promise.all([
        storage.getUser(userId),
        storage.getUserPreferences(userId),
        storage.getChildren(userId),
        storage.getDocuments(userId),
        storage.getTherapies(userId),
        storage.getAppointments(userId),
        storage.getEmails(userId),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        user,
        preferences,
        children,
        documents: documents.map(d => ({
          ...d,
          // Exclude file paths for security
          filePath: undefined,
        })),
        therapies,
        appointments,
        emails,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="user-data-export-${new Date().toISOString().split("T")[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting user data:", error);
      res.status(500).json({ message: "Failed to export user data" });
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

  // Translation endpoint using Gemini AI (Replit AI Integrations)
  app.post("/api/translate", isAuthenticated, async (req: any, res) => {
    try {
      const { text, targetLanguage } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (text.trim().length === 0) {
        return res.status(400).json({ message: "Text cannot be empty" });
      }

      if (!targetLanguage || typeof targetLanguage !== 'string') {
        return res.status(400).json({ message: "Target language is required" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      
      const gemini = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const langName = targetLanguage === 'ka' ? 'Georgian' : targetLanguage;
      
      const prompt = `You are a professional medical translator. Translate the following medical text from English to ${langName}. 
      
Important guidelines:
- Preserve all medical terminology accurately
- Maintain the same structure and formatting as the original
- Keep proper nouns (names, hospital names, etc.) in their original form
- Use appropriate medical terminology in ${langName}
- Only output the translation, nothing else

Text to translate:
${text}`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const translatedText = response.text || "";
      
      if (!translatedText || translatedText.trim().length === 0) {
        return res.status(500).json({ message: "Translation returned empty result" });
      }
      
      res.json({ translatedText });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Failed to translate text" });
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

      // Auto-execute create_child actions for Form 100 documents, store others as pending
      const pendingActionMessages: Awaited<ReturnType<typeof storage.createChatMessage>>[] = [];
      const executedActions: ActionResult[] = [];
      
      // Helper to create pending action message
      const createPendingAction = async (action: typeof analysis.suggestedActions[0]) => {
        const actionMessage = await storage.createChatMessage({
          userId,
          role: "assistant",
          content: `${action.description}${action.descriptionKa ? `\n${action.descriptionKa}` : ''}`,
          actionType: action.type,
          actionData: { ...(action.data || {}), parentMessageId: uploadMessage.id },
          actionStatus: "pending",
          documentIds: [document.id],
        });
        pendingActionMessages.push(actionMessage);
      };
      
      if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
        for (const suggestedAction of analysis.suggestedActions) {
          // Auto-execute child creation from Form 100 documents
          if (suggestedAction.type === "create_child" && analysis.documentType === "form_100") {
            const childData = suggestedAction.data;
            
            // If missing required fields, fall back to pending action
            if (!childData || !childData.firstName || !childData.lastName) {
              await createPendingAction(suggestedAction);
              continue;
            }
            
            // Check for duplicate child with same name
            const existingChild = await storage.findChildByName(
              userId, 
              childData.firstName, 
              childData.lastName
            );
            
            if (existingChild) {
              // Child already exists - create info message
              await storage.createChatMessage({
                userId,
                role: "assistant",
                content: `Child profile for ${childData.firstName} ${childData.lastName} already exists.\n\nბავშვის პროფილი ${childData.firstName} ${childData.lastName}-სთვის უკვე არსებობს.`,
                actionType: "create_child",
                actionStatus: "skipped",
                documentIds: [document.id],
              });
              continue;
            }
            
            // Try to execute the create_child action
            try {
              const result = await executeAction("create_child", childData, userId);
              if (result.success) {
                executedActions.push(result);
                // Create executed action message
                await storage.createChatMessage({
                  userId,
                  role: "assistant",
                  content: `${result.message}${result.messageKa ? `\n\n${result.messageKa}` : ''}`,
                  actionType: "create_child",
                  actionData: result.data,
                  actionStatus: "executed",
                  documentIds: [document.id],
                });
              } else {
                // Action failed - fall back to pending action
                await createPendingAction(suggestedAction);
              }
            } catch (executeError) {
              console.error("Error auto-executing create_child:", executeError);
              // On error, fall back to pending action so user can retry manually
              await createPendingAction(suggestedAction);
            }
          } else {
            // Store other actions as pending
            await createPendingAction(suggestedAction);
          }
        }
      }

      res.json({
        document: updatedDocument,
        analysis,
        message: uploadMessage,
        suggestedActions: analysis.suggestedActions || [],
        pendingActionMessages,
        executedActions,
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

  // ============================================================================
  // NEXUS OMEGA - Multi-AI Research Platform Routes
  // ============================================================================

  // AI Status - Get all AI agents with their status
  app.get("/api/nexus/ai-status", isAuthenticated, async (req: any, res) => {
    try {
      const agents = await storage.getNexusAiAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching NEXUS AI agents:", error);
      res.status(500).json({ message: "Failed to fetch AI agents" });
    }
  });

  // Research Queries - Start new multi-AI research
  app.post("/api/nexus/query", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = insertNexusResearchQuerySchema.safeParse({ ...req.body, userId });
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid query data", errors: parseResult.error.errors });
      }
      const query = await storage.createNexusResearchQuery(parseResult.data);
      res.status(201).json(query);
    } catch (error) {
      console.error("Error creating NEXUS research query:", error);
      res.status(500).json({ message: "Failed to create research query" });
    }
  });

  // Run multi-AI research - orchestrates all AI agents and stores results
  app.post("/api/nexus/research", isAuthenticated, diagnosisUpload.single("diagnosis"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const queryText = req.body.queryText || "";
      const disciplines = req.body.disciplines ? JSON.parse(req.body.disciplines) : [];
      
      let diagnosisContext: string | undefined;
      
      if (req.file) {
        const file = req.file;
        if (file.mimetype === "application/pdf") {
          const result = await extractTextFromPDF(file.buffer);
          if (result.success) {
            diagnosisContext = result.text;
          }
        } else if (file.mimetype.startsWith("image/")) {
          const result = await extractTextFromImage(file.buffer, file.mimetype);
          if (result.success) {
            diagnosisContext = result.text;
          }
        }
      }
      
      if (!queryText.trim() && !diagnosisContext) {
        return res.status(400).json({ message: "queryText or diagnosis file is required" });
      }

      const parseResult = insertNexusResearchQuerySchema.safeParse({ 
        queryText: queryText.trim() || "Analyze diagnosis and recommend treatment",
        disciplines,
        userId,
        status: "pending",
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid query data", errors: parseResult.error.errors });
      }

      const query = await storage.createNexusResearchQuery(parseResult.data);

      const result = await runNexusResearch(
        query.id,
        queryText.trim() || "Analyze diagnosis and recommend treatment",
        disciplines,
        userId,
        diagnosisContext
      );

      res.status(201).json(result);
    } catch (error) {
      console.error("Error running NEXUS research:", error);
      res.status(500).json({ message: "Failed to run research query" });
    }
  });

  // Get user's research queries
  app.get("/api/nexus/queries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const queries = await storage.getNexusResearchQueries(userId);
      res.json(queries);
    } catch (error) {
      console.error("Error fetching NEXUS research queries:", error);
      res.status(500).json({ message: "Failed to fetch research queries" });
    }
  });

  // Get specific research query status and results
  app.get("/api/nexus/query/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid query ID" });
      }
      const query = await storage.getNexusResearchQuery(id, userId);
      if (!query) {
        return res.status(404).json({ message: "Research query not found" });
      }
      res.json(query);
    } catch (error) {
      console.error("Error fetching NEXUS research query:", error);
      res.status(500).json({ message: "Failed to fetch research query" });
    }
  });

  // Update research query status
  app.patch("/api/nexus/query/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid query ID" });
      }
      const { userId: _, ...bodyWithoutUserId } = req.body;
      const parseResult = insertNexusResearchQuerySchema.partial().safeParse(bodyWithoutUserId);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid query data", errors: parseResult.error.errors });
      }
      const query = await storage.updateNexusResearchQuery(id, userId, parseResult.data);
      if (!query) {
        return res.status(404).json({ message: "Research query not found" });
      }
      res.json(query);
    } catch (error) {
      console.error("Error updating NEXUS research query:", error);
      res.status(500).json({ message: "Failed to update research query" });
    }
  });

  // Findings - List all findings (optionally filter by queryId)
  app.get("/api/nexus/findings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const queryId = req.query.queryId ? parseInt(req.query.queryId as string, 10) : undefined;
      if (req.query.queryId && isNaN(queryId!)) {
        return res.status(400).json({ message: "Invalid query ID filter" });
      }
      const findings = await storage.getNexusFindings(userId, queryId);
      res.json(findings);
    } catch (error) {
      console.error("Error fetching NEXUS findings:", error);
      res.status(500).json({ message: "Failed to fetch findings" });
    }
  });

  // Get consensus findings only (high/unanimous)
  app.get("/api/nexus/findings/consensus", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const findings = await storage.getNexusConsensusFindingsOnly(userId);
      res.json(findings);
    } catch (error) {
      console.error("Error fetching NEXUS consensus findings:", error);
      res.status(500).json({ message: "Failed to fetch consensus findings" });
    }
  });

  // Get finding details with AI analyses
  app.get("/api/nexus/findings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid finding ID" });
      }
      const finding = await storage.getNexusFinding(id, userId);
      if (!finding) {
        return res.status(404).json({ message: "Finding not found" });
      }
      const aiAnalyses = await storage.getNexusAiAnalyses(id, userId);
      const disciplinaryAnalyses = await storage.getNexusDisciplinaryAnalyses(id, userId);
      res.json({ 
        ...finding, 
        aiAnalyses, 
        disciplinaryAnalyses 
      });
    } catch (error) {
      console.error("Error fetching NEXUS finding:", error);
      res.status(500).json({ message: "Failed to fetch finding" });
    }
  });

  // Hypotheses - List all hypotheses
  app.get("/api/nexus/hypotheses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hypotheses = await storage.getNexusHypotheses(userId);
      res.json(hypotheses);
    } catch (error) {
      console.error("Error fetching NEXUS hypotheses:", error);
      res.status(500).json({ message: "Failed to fetch hypotheses" });
    }
  });

  // Get specific hypothesis
  app.get("/api/nexus/hypotheses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid hypothesis ID" });
      }
      const hypothesis = await storage.getNexusHypothesis(id, userId);
      if (!hypothesis) {
        return res.status(404).json({ message: "Hypothesis not found" });
      }
      res.json(hypothesis);
    } catch (error) {
      console.error("Error fetching NEXUS hypothesis:", error);
      res.status(500).json({ message: "Failed to fetch hypothesis" });
    }
  });

  // Update hypothesis status
  app.patch("/api/nexus/hypotheses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid hypothesis ID" });
      }
      const parseResult = insertNexusHypothesisSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid hypothesis data", errors: parseResult.error.errors });
      }
      const hypothesis = await storage.updateNexusHypothesis(id, userId, parseResult.data);
      if (!hypothesis) {
        return res.status(404).json({ message: "Hypothesis not found" });
      }
      res.json(hypothesis);
    } catch (error) {
      console.error("Error updating NEXUS hypothesis:", error);
      res.status(500).json({ message: "Failed to update hypothesis" });
    }
  });

  // Debates - List all debates
  app.get("/api/nexus/debates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const debates = await storage.getNexusDebates(userId);
      res.json(debates);
    } catch (error) {
      console.error("Error fetching NEXUS debates:", error);
      res.status(500).json({ message: "Failed to fetch debates" });
    }
  });

  // Get specific debate
  app.get("/api/nexus/debates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid debate ID" });
      }
      const debate = await storage.getNexusDebate(id, userId);
      if (!debate) {
        return res.status(404).json({ message: "Debate not found" });
      }
      res.json(debate);
    } catch (error) {
      console.error("Error fetching NEXUS debate:", error);
      res.status(500).json({ message: "Failed to fetch debate" });
    }
  });

  // Action Items - List all action items
  app.get("/api/nexus/actions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const actions = await storage.getNexusActionItems(userId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching NEXUS action items:", error);
      res.status(500).json({ message: "Failed to fetch action items" });
    }
  });

  // Get specific action item
  app.get("/api/nexus/actions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid action ID" });
      }
      const action = await storage.getNexusActionItem(id, userId);
      if (!action) {
        return res.status(404).json({ message: "Action item not found" });
      }
      res.json(action);
    } catch (error) {
      console.error("Error fetching NEXUS action item:", error);
      res.status(500).json({ message: "Failed to fetch action item" });
    }
  });

  // Update action item status
  app.patch("/api/nexus/actions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid action ID" });
      }
      const parseResult = insertNexusActionItemSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid action data", errors: parseResult.error.errors });
      }
      const action = await storage.updateNexusActionItem(id, userId, parseResult.data);
      if (!action) {
        return res.status(404).json({ message: "Action item not found" });
      }
      res.json(action);
    } catch (error) {
      console.error("Error updating NEXUS action item:", error);
      res.status(500).json({ message: "Failed to update action item" });
    }
  });

  // Knowledge Graph - Get all nodes
  app.get("/api/nexus/knowledge/nodes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const nodes = await storage.getNexusKnowledgeNodes(userId);
      res.json(nodes);
    } catch (error) {
      console.error("Error fetching NEXUS knowledge nodes:", error);
      res.status(500).json({ message: "Failed to fetch knowledge nodes" });
    }
  });

  // Knowledge Graph - Get all edges
  app.get("/api/nexus/knowledge/edges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const edges = await storage.getNexusKnowledgeEdges(userId);
      res.json(edges);
    } catch (error) {
      console.error("Error fetching NEXUS knowledge edges:", error);
      res.status(500).json({ message: "Failed to fetch knowledge edges" });
    }
  });

  // ============================================================================
  // EVOLUTION CYCLE ROUTES - Autonomous 24-Hour Research Cycles
  // ============================================================================

  // Get all evolution cycles for user
  app.get("/api/evolution/cycles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cycles = await storage.getEvolutionCycles(userId);
      res.json(cycles);
    } catch (error) {
      console.error("Error fetching evolution cycles:", error);
      res.status(500).json({ message: "Failed to fetch evolution cycles" });
    }
  });

  // Get active evolution cycle
  app.get("/api/evolution/cycles/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cycle = await storage.getActiveEvolutionCycle(userId);
      res.json(cycle || null);
    } catch (error) {
      console.error("Error fetching active evolution cycle:", error);
      res.status(500).json({ message: "Failed to fetch active cycle" });
    }
  });

  // Get specific evolution cycle
  app.get("/api/evolution/cycles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }
      const cycle = await storage.getEvolutionCycle(id, userId);
      if (!cycle) {
        return res.status(404).json({ message: "Evolution cycle not found" });
      }
      res.json(cycle);
    } catch (error) {
      console.error("Error fetching evolution cycle:", error);
      res.status(500).json({ message: "Failed to fetch evolution cycle" });
    }
  });

  // Start new evolution cycle with file upload for child info extraction
  app.post("/api/evolution/cycles", isAuthenticated, diagnosisUpload.single("diagnosisFile"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endDate, childId } = req.body;
      const file = req.file;
      
      if (!endDate) {
        return res.status(400).json({ message: "Missing required field: endDate" });
      }

      if (!file && !childId) {
        return res.status(400).json({ message: "Please upload a diagnosis file or provide a child ID" });
      }

      let diagnosisContext = "";
      let extractedChildId: number | undefined = childId ? parseInt(childId, 10) : undefined;

      // If a file is uploaded, extract text and child information
      if (file) {
        let extractedText = "";
        
        // Extract text from file
        if (file.mimetype === "application/pdf") {
          const result = await extractTextFromPDF(file.buffer);
          if (!result.success) {
            return res.status(400).json({ message: result.error || "Failed to extract text from PDF" });
          }
          extractedText = result.text;
        } else if (file.mimetype.startsWith("image/")) {
          const result = await extractTextFromImage(file.buffer, file.mimetype);
          if (!result.success) {
            return res.status(400).json({ message: result.error || "Failed to extract text from image" });
          }
          extractedText = result.text;
        }
        
        if (!extractedText || extractedText.trim().length === 0) {
          return res.status(400).json({ message: "Could not extract text from the uploaded file" });
        }

        // Use AI to extract child information and diagnosis context (bilingual)
        const extractionPrompt = `Analyze this medical document and extract the following information in JSON format. Provide both English and Georgian (ქართული) translations:
{
  "childName": "Name of the child/patient (if found, otherwise null)",
  "dateOfBirth": "Date of birth if mentioned (YYYY-MM-DD format, otherwise null)",
  "diagnosis": "Main diagnosis or condition (in English)",
  "diagnosisKa": "Main diagnosis or condition (in Georgian/ქართული)",
  "diagnosisSummary": "A comprehensive summary of the diagnosis, condition details, symptoms, and any relevant medical history in English. This should be detailed enough for AI research purposes.",
  "diagnosisSummaryKa": "იგივე შეჯამება ქართულად - დიაგნოზის, მდგომარეობის დეტალების, სიმპტომების და შესაბამისი სამედიცინო ისტორიის ყოვლისმომცველი შეჯამება."
}

Document text:
${extractedText.substring(0, 8000)}`;

        try {
          const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
              { role: "system", content: "You are a medical document analyzer. Extract patient information accurately from medical documents. Return only valid JSON." },
              { role: "user", content: extractionPrompt }
            ],
            response_format: { type: "json_object" },
          });

          const extracted = JSON.parse(completion.choices[0].message.content || "{}");
          
          diagnosisContext = extracted.diagnosisSummary || extracted.diagnosis || extractedText.substring(0, 2000);
          
          // Create or find child if name was extracted
          if (extracted.childName && !extractedChildId) {
            // Check if child already exists
            const existingChildren = await storage.getChildren(userId);
            const nameParts = extracted.childName.split(' ');
            const extractedFirstName = nameParts[0] || "Child";
            const extractedLastName = nameParts.slice(1).join(' ') || "(from document)";
            const existingChild = existingChildren.find(
              c => `${c.firstName} ${c.lastName}`.toLowerCase() === extracted.childName.toLowerCase()
            );
            
            if (existingChild) {
              extractedChildId = existingChild.id;
            } else {
              // Create new child with bilingual notes/diagnosis
              const newChild = await storage.createChild({
                userId,
                firstName: extractedFirstName,
                lastName: extractedLastName,
                dateOfBirth: extracted.dateOfBirth || null,
                diagnosis: extracted.diagnosis || null,
                diagnosisKa: extracted.diagnosisKa || null,
                notes: `Created from uploaded document. ${extracted.diagnosisSummary || ""}`,
                notesKa: `შეიქმნა ატვირთული დოკუმენტიდან. ${extracted.diagnosisSummaryKa || ""}`,
              });
              extractedChildId = newChild.id;
            }
          }
        } catch (aiError) {
          console.error("AI extraction error:", aiError);
          // Use raw text as fallback
          diagnosisContext = extractedText.substring(0, 2000);
        }
      }

      // If still no child, create a placeholder
      if (!extractedChildId) {
        const newChild = await storage.createChild({
          userId,
          firstName: "Child",
          lastName: "(from document)",
          dateOfBirth: null,
          diagnosis: diagnosisContext.substring(0, 500),
          diagnosisKa: null,
          notes: "Created automatically from uploaded document",
          notesKa: "ავტომატურად შეიქმნა ატვირთული დოკუმენტიდან",
        });
        extractedChildId = newChild.id;
      }

      const { startEvolutionCycle } = await import("./evolutionCycleEngine");
      const cycle = await startEvolutionCycle(
        userId,
        extractedChildId!,
        new Date(endDate),
        null,
        diagnosisContext || "Analyze the uploaded medical document and research relevant treatments."
      );
      
      res.status(201).json(cycle);
    } catch (error) {
      console.error("Error starting evolution cycle:", error);
      res.status(500).json({ message: "Failed to start evolution cycle" });
    }
  });

  // Update evolution cycle (pause/resume/cancel)
  app.patch("/api/evolution/cycles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }
      const { status } = req.body;
      if (!status || !["active", "paused", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const cycle = await storage.updateEvolutionCycle(id, userId, { status });
      if (!cycle) {
        return res.status(404).json({ message: "Evolution cycle not found" });
      }
      res.json(cycle);
    } catch (error) {
      console.error("Error updating evolution cycle:", error);
      res.status(500).json({ message: "Failed to update evolution cycle" });
    }
  });

  // Get daily runs for a cycle
  app.get("/api/evolution/cycles/:cycleId/runs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cycleId = parseInt(req.params.cycleId, 10);
      if (isNaN(cycleId)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }
      const cycle = await storage.getEvolutionCycle(cycleId, userId);
      if (!cycle) {
        return res.status(404).json({ message: "Evolution cycle not found" });
      }
      const runs = await storage.getEvolutionDailyRuns(cycleId);
      res.json(runs);
    } catch (error) {
      console.error("Error fetching daily runs:", error);
      res.status(500).json({ message: "Failed to fetch daily runs" });
    }
  });

  // Get all evolution reports for user
  app.get("/api/evolution/reports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getEvolutionReports(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching evolution reports:", error);
      res.status(500).json({ message: "Failed to fetch evolution reports" });
    }
  });

  // Get specific evolution report
  app.get("/api/evolution/reports/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      const report = await storage.getEvolutionReport(id, userId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching evolution report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  // Download report as PDF (bilingual support)
  app.get("/api/evolution/reports/:id/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      const language = (req.query.lang as "en" | "ka") || "en";
      const includeInsights = req.query.insights === "true";
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      const report = await storage.getEvolutionReport(id, userId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      let insights: any[] = [];
      if (includeInsights && report.dailyRunId) {
        insights = await storage.getEvolutionInsights(report.dailyRunId);
      }

      const pdfBuffer = await generateReportPDF(report, insights, {
        language,
        includeInsights,
      });

      const dateStr = report.reportDate.replace(/-/g, "");
      const filename = language === "ka" 
        ? `HIE_Report_${dateStr}_KA.pdf`
        : `HIE_Report_${dateStr}_EN.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Download cycle summary as PDF
  app.get("/api/evolution/cycles/:id/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cycleId = parseInt(req.params.id, 10);
      const language = (req.query.lang as "en" | "ka") || "en";
      
      if (isNaN(cycleId)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }
      
      const cycle = await storage.getEvolutionCycle(cycleId, userId);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }

      const dailyRuns = await storage.getEvolutionDailyRuns(cycleId);
      const reports: any[] = [];
      const allInsights: any[] = [];

      for (const run of dailyRuns) {
        const report = await storage.getEvolutionReportByDailyRun(run.id);
        if (report) {
          reports.push(report);
        }
        const insights = await storage.getEvolutionInsights(run.id);
        allInsights.push(...insights);
      }

      const pdfBuffer = await generateCycleSummaryPDF(cycleId, reports, allInsights, {
        language,
      });

      const filename = language === "ka" 
        ? `HIE_Cycle_${cycleId}_Summary_KA.pdf`
        : `HIE_Cycle_${cycleId}_Summary_EN.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating cycle PDF:", error);
      res.status(500).json({ message: "Failed to generate cycle PDF" });
    }
  });

  // Get messages for a specific report (chat history)
  app.get("/api/evolution/reports/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      const report = await storage.getEvolutionReport(id, userId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      const messages = await storage.getEvolutionReportMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching report messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send message to report chat and get AI response
  app.post("/api/evolution/reports/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = parseInt(req.params.id, 10);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }

      const report = await storage.getEvolutionReport(reportId, userId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const userMessage = await storage.createEvolutionReportMessage({
        reportId,
        userId,
        role: "user",
        content,
      });

      const existingMessages = await storage.getEvolutionReportMessages(reportId);
      const conversationHistory = existingMessages
        .filter(m => m.id !== userMessage.id)
        .slice(-10)
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const reportContext = `
## Report: ${report.titleEn}
Date: ${report.reportDate}

## Executive Summary
${report.summaryEn}

## Key Findings
${(report.keyFindingsEn || []).map((f, i) => `${i + 1}. ${f}`).join("\n")}

## Full Report Content
${report.contentEn}
`;

      const systemPrompt = `You are an expert medical research assistant specializing in analyzing Evolution Cycle research reports about Hypoxic-Ischemic Encephalopathy (HIE) and related pediatric neurological conditions.

You have access to the following daily research report. Answer questions about its contents accurately and helpfully. If asked about something not in the report, acknowledge the limitation.

${reportContext}

Respond in a clear, accessible manner suitable for parents and caregivers while maintaining medical accuracy. When relevant, reference specific sections or findings from the report.`;

      const { processReportChat } = await import("./evolutionCycleEngine");
      const aiResponse = await processReportChat(systemPrompt, conversationHistory, content);

      const assistantMessage = await storage.createEvolutionReportMessage({
        reportId,
        userId,
        role: "assistant",
        content: aiResponse.contentEn,
        contentKa: aiResponse.contentKa,
      });

      res.status(201).json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Error processing report chat:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Trigger evolution tick (for scheduler or manual triggering)
  app.post("/api/evolution/tick", isAuthenticated, async (req: any, res) => {
    try {
      const { triggerManualTick } = await import("./evolutionScheduler");
      const result = await triggerManualTick();
      res.json(result);
    } catch (error) {
      console.error("Error running evolution tick:", error);
      res.status(500).json({ message: "Failed to run evolution tick" });
    }
  });

  // Manually generate report for a completed daily run
  app.post("/api/evolution/runs/:runId/generate-report", isAuthenticated, async (req: any, res) => {
    try {
      const runId = parseInt(req.params.runId);
      const userId = req.user.claims.sub;
      const regenerate = req.body?.regenerate === true;
      
      if (isNaN(runId)) {
        return res.status(400).json({ message: "Invalid run ID" });
      }
      
      // Get the run and verify it exists
      const run = await storage.getEvolutionDailyRun(runId);
      if (!run) {
        return res.status(404).json({ message: "Run not found" });
      }
      
      // Verify ownership via the cycle
      const cycle = await storage.getEvolutionCycle(run.cycleId, userId);
      if (!cycle) {
        return res.status(403).json({ message: "Not authorized to access this run" });
      }
      
      // Check run is completed
      if (run.status !== "completed") {
        return res.status(400).json({ message: "Cannot generate report - run is not completed" });
      }
      
      // Check if report already exists
      const existingReport = await storage.getEvolutionReportByDailyRun(runId);
      if (existingReport) {
        if (regenerate) {
          // Delete existing report to regenerate
          await storage.deleteEvolutionReport(existingReport.id);
          console.log(`[Routes] Deleted existing report ${existingReport.id} for regeneration`);
        } else {
          return res.status(409).json({ message: "Report already exists for this run", report: existingReport });
        }
      }
      
      const { generateDailyReport } = await import("./evolutionCycleEngine");
      const report = await generateDailyReport(runId);
      
      if (report) {
        res.json({ success: true, report, regenerated: regenerate && !!existingReport });
      } else {
        res.status(400).json({ message: "Failed to generate report - run may not have enough insights" });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Academic Research Routes - OpenAlex, Semantic Scholar, Cross-Disciplinary
  app.post("/api/academic/search", isAuthenticated, async (req: any, res) => {
    try {
      const { 
        query, 
        maxResults = 20, 
        yearFrom, 
        yearTo, 
        openAccessOnly = false,
        includeCrossDisciplinary = true,
        targetDisciplines,
      } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const result = await searchAcademicSources(query, {
        maxResults,
        yearFrom,
        yearTo,
        openAccessOnly,
        includeCrossDisciplinary,
        targetDisciplines,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching academic sources:", error);
      res.status(500).json({ message: "Failed to search academic sources" });
    }
  });

  app.post("/api/academic/openalex", isAuthenticated, async (req: any, res) => {
    try {
      const { 
        query, 
        maxResults = 25, 
        yearFrom, 
        yearTo, 
        openAccessOnly = false,
        sortBy = "relevance",
      } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const result = await searchOpenAlex(query, {
        maxResults,
        yearFrom,
        yearTo,
        openAccessOnly,
        sortBy,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching OpenAlex:", error);
      res.status(500).json({ message: "Failed to search OpenAlex" });
    }
  });

  app.post("/api/academic/semantic-scholar", isAuthenticated, async (req: any, res) => {
    try {
      const { 
        query, 
        maxResults = 25, 
        yearFrom, 
        yearTo, 
        openAccessOnly = false,
        fieldsOfStudy,
      } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const result = await searchSemanticScholar(query, {
        maxResults,
        yearFrom,
        yearTo,
        openAccessOnly,
        fieldsOfStudy,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching Semantic Scholar:", error);
      res.status(500).json({ message: "Failed to search Semantic Scholar" });
    }
  });

  app.post("/api/academic/cross-disciplinary", isAuthenticated, async (req: any, res) => {
    try {
      const { 
        medicalQuery, 
        targetDisciplines = ["physics", "engineering", "mathematics", "computer science", "materials science"],
        maxResultsPerDiscipline = 10,
      } = req.body;

      if (!medicalQuery || typeof medicalQuery !== "string") {
        return res.status(400).json({ message: "Medical query is required" });
      }

      const result = await searchOpenAlexCrossDisciplinary(
        medicalQuery,
        targetDisciplines,
        maxResultsPerDiscipline
      );

      res.json(result);
    } catch (error) {
      console.error("Error searching cross-disciplinary:", error);
      res.status(500).json({ message: "Failed to search cross-disciplinary sources" });
    }
  });

  app.post("/api/academic/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const { paperIds, maxResults = 20 } = req.body;

      if (!paperIds || !Array.isArray(paperIds) || paperIds.length === 0) {
        return res.status(400).json({ message: "Paper IDs array is required" });
      }

      const recommendations = await searchSemanticScholarRecommendations(paperIds, maxResults);

      res.json({ recommendations, count: recommendations.length });
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Failed to get paper recommendations" });
    }
  });

  // ============================================================================
  // ACCUMULATED KNOWLEDGE - Persistent insights that grow across evolution cycles
  // ============================================================================

  // Get all accumulated knowledge for user
  app.get("/api/evolution/accumulated-knowledge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const knowledge = await storage.getAccumulatedKnowledge(userId);
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching accumulated knowledge:", error);
      res.status(500).json({ message: "Failed to fetch accumulated knowledge" });
    }
  });

  // Get accumulated knowledge for specific child
  app.get("/api/evolution/accumulated-knowledge/child/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      if (isNaN(childId)) {
        return res.status(400).json({ message: "Invalid child ID" });
      }
      const knowledge = await storage.getAccumulatedKnowledgeByChild(userId, childId);
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching accumulated knowledge for child:", error);
      res.status(500).json({ message: "Failed to fetch accumulated knowledge for child" });
    }
  });

  // Get active accumulated knowledge (for use in cycle initialization)
  app.get("/api/evolution/accumulated-knowledge/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const knowledge = await storage.getActiveAccumulatedKnowledge(userId);
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching active accumulated knowledge:", error);
      res.status(500).json({ message: "Failed to fetch active accumulated knowledge" });
    }
  });

  // Get single accumulated knowledge item
  app.get("/api/evolution/accumulated-knowledge/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid knowledge ID" });
      }
      const knowledge = await storage.getAccumulatedKnowledgeItem(id, userId);
      if (!knowledge) {
        return res.status(404).json({ message: "Accumulated knowledge not found" });
      }
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching accumulated knowledge item:", error);
      res.status(500).json({ message: "Failed to fetch accumulated knowledge item" });
    }
  });

  // Create new accumulated knowledge
  app.post("/api/evolution/accumulated-knowledge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = insertAccumulatedKnowledgeSchema.safeParse({ ...req.body, userId });
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid knowledge data", errors: parseResult.error.errors });
      }
      const knowledge = await storage.createAccumulatedKnowledge(parseResult.data);
      res.status(201).json(knowledge);
    } catch (error) {
      console.error("Error creating accumulated knowledge:", error);
      res.status(500).json({ message: "Failed to create accumulated knowledge" });
    }
  });

  // Update accumulated knowledge
  app.patch("/api/evolution/accumulated-knowledge/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid knowledge ID" });
      }
      const { userId: _, ...bodyWithoutUserId } = req.body;
      const parseResult = insertAccumulatedKnowledgeSchema.partial().safeParse(bodyWithoutUserId);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid knowledge data", errors: parseResult.error.errors });
      }
      const knowledge = await storage.updateAccumulatedKnowledge(id, userId, parseResult.data);
      if (!knowledge) {
        return res.status(404).json({ message: "Accumulated knowledge not found" });
      }
      res.json(knowledge);
    } catch (error) {
      console.error("Error updating accumulated knowledge:", error);
      res.status(500).json({ message: "Failed to update accumulated knowledge" });
    }
  });

  return httpServer;
}
