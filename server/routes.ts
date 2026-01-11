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
import {
  searchClinicalTrials,
  getClinicalTrial,
  searchHIETrials,
} from "./services/clinicalTrialsApi";
import {
  searchPubMed,
  getArticle as getPubMedArticle,
  searchHIEResearch,
  getRelatedArticles,
} from "./services/pubmedApi";
import {
  searchDrugLabels,
  getDrugLabel,
  searchAdverseEvents,
  searchDrugRecalls,
  searchHIEMedications,
  getDrugInteractions,
} from "./services/openfdaApi";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

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

  // ============================================================================
  // PUBLIC ENDPOINTS - No authentication required (for Landing page)
  // ============================================================================

  // Get all public evolution reports (for landing page)
  app.get("/api/public/evolution/reports", async (req, res) => {
    try {
      const reports = await storage.getAllPublicReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching public reports:", error);
      res.status(500).json({ message: "Failed to fetch public reports" });
    }
  });

  // Get all public accumulated knowledge (for landing page)
  app.get("/api/public/evolution/knowledge", async (req, res) => {
    try {
      const knowledge = await storage.getAllPublicKnowledge();
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching public knowledge:", error);
      res.status(500).json({ message: "Failed to fetch public knowledge" });
    }
  });

  // ============================================================================
  // EXTERNAL MEDICAL DATA APIs - ClinicalTrials.gov, PubMed, OpenFDA
  // ============================================================================

  // ----- ClinicalTrials.gov API Routes -----

  // Search clinical trials
  app.get("/api/clinical-trials", isAuthenticated, async (req: any, res) => {
    try {
      const {
        condition,
        term,
        location,
        status,
        phase,
        pageSize,
        pageToken,
      } = req.query;

      const result = await searchClinicalTrials({
        condition: condition as string,
        term: term as string,
        location: location as string,
        status: status ? (status as string).split(',') : undefined,
        phase: phase ? (phase as string).split(',') : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
        pageToken: pageToken as string,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching clinical trials:", error);
      res.status(500).json({ message: "Failed to search clinical trials" });
    }
  });

  // Search HIE-specific clinical trials
  app.get("/api/clinical-trials/hie", isAuthenticated, async (req: any, res) => {
    try {
      const { childAge, location, status, pageSize } = req.query;

      const result = await searchHIETrials({
        childAge: childAge ? parseInt(childAge as string) : undefined,
        location: location as string,
        status: status ? (status as string).split(',') : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching HIE trials:", error);
      res.status(500).json({ message: "Failed to search HIE clinical trials" });
    }
  });

  // Get specific clinical trial by NCT ID
  app.get("/api/clinical-trials/:nctId", isAuthenticated, async (req: any, res) => {
    try {
      const { nctId } = req.params;

      if (!nctId || !nctId.startsWith('NCT')) {
        return res.status(400).json({ message: "Invalid NCT ID" });
      }

      const trial = await getClinicalTrial(nctId);

      if (!trial) {
        return res.status(404).json({ message: "Clinical trial not found" });
      }

      res.json(trial);
    } catch (error) {
      console.error("Error fetching clinical trial:", error);
      res.status(500).json({ message: "Failed to fetch clinical trial" });
    }
  });

  // ----- PubMed API Routes -----

  // Search PubMed articles
  app.get("/api/pubmed/search", isAuthenticated, async (req: any, res) => {
    try {
      const {
        term,
        maxResults,
        start,
        sort,
        dateFrom,
        dateTo,
      } = req.query;

      if (!term) {
        return res.status(400).json({ message: "Search term is required" });
      }

      const result = await searchPubMed({
        term: term as string,
        maxResults: maxResults ? parseInt(maxResults as string) : 20,
        start: start ? parseInt(start as string) : 0,
        sort: sort as 'relevance' | 'pub_date' | 'first_author' | 'journal',
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching PubMed:", error);
      res.status(500).json({ message: "Failed to search PubMed" });
    }
  });

  // Search HIE-specific research articles
  app.get("/api/pubmed/hie", isAuthenticated, async (req: any, res) => {
    try {
      const { topic, maxResults, recentOnly } = req.query;

      const result = await searchHIEResearch({
        specificTopic: topic as string,
        maxResults: maxResults ? parseInt(maxResults as string) : 20,
        recentOnly: recentOnly === 'true',
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching HIE research:", error);
      res.status(500).json({ message: "Failed to search HIE research articles" });
    }
  });

  // Get specific PubMed article by PMID
  app.get("/api/pubmed/article/:pmid", isAuthenticated, async (req: any, res) => {
    try {
      const { pmid } = req.params;

      if (!pmid || !/^\d+$/.test(pmid)) {
        return res.status(400).json({ message: "Invalid PMID" });
      }

      const article = await getPubMedArticle(pmid);

      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      res.json(article);
    } catch (error) {
      console.error("Error fetching PubMed article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Get related articles for a PMID
  app.get("/api/pubmed/article/:pmid/related", isAuthenticated, async (req: any, res) => {
    try {
      const { pmid } = req.params;
      const { maxResults } = req.query;

      if (!pmid || !/^\d+$/.test(pmid)) {
        return res.status(400).json({ message: "Invalid PMID" });
      }

      const result = await getRelatedArticles(
        pmid,
        maxResults ? parseInt(maxResults as string) : 10
      );

      res.json(result);
    } catch (error) {
      console.error("Error fetching related articles:", error);
      res.status(500).json({ message: "Failed to fetch related articles" });
    }
  });

  // ----- OpenFDA API Routes -----

  // Search drug labels
  app.get("/api/fda/drugs", isAuthenticated, async (req: any, res) => {
    try {
      const {
        query,
        brandName,
        genericName,
        manufacturer,
        route,
        limit,
        skip,
      } = req.query;

      const result = await searchDrugLabels({
        query: query as string,
        brandName: brandName as string,
        genericName: genericName as string,
        manufacturer: manufacturer as string,
        route: route as string,
        limit: limit ? parseInt(limit as string) : 20,
        skip: skip ? parseInt(skip as string) : 0,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching drug labels:", error);
      res.status(500).json({ message: "Failed to search drug labels" });
    }
  });

  // Search HIE-related medications
  app.get("/api/fda/drugs/hie", isAuthenticated, async (req: any, res) => {
    try {
      const { type, limit } = req.query;

      const result = await searchHIEMedications({
        medicationType: type as 'anticonvulsant' | 'neuroprotective' | 'analgesic' | 'all',
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching HIE medications:", error);
      res.status(500).json({ message: "Failed to search HIE medications" });
    }
  });

  // Get specific drug label by ID
  app.get("/api/fda/drugs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const drug = await getDrugLabel(id);

      if (!drug) {
        return res.status(404).json({ message: "Drug label not found" });
      }

      res.json(drug);
    } catch (error) {
      console.error("Error fetching drug label:", error);
      res.status(500).json({ message: "Failed to fetch drug label" });
    }
  });

  // Get drug interactions
  app.get("/api/fda/drugs/:name/interactions", isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.params;

      const result = await getDrugInteractions(name);

      res.json(result);
    } catch (error) {
      console.error("Error fetching drug interactions:", error);
      res.status(500).json({ message: "Failed to fetch drug interactions" });
    }
  });

  // Search drug adverse events
  app.get("/api/fda/adverse-events", isAuthenticated, async (req: any, res) => {
    try {
      const {
        drugName,
        reaction,
        serious,
        limit,
        skip,
      } = req.query;

      const result = await searchAdverseEvents({
        drugName: drugName as string,
        reaction: reaction as string,
        serious: serious === 'true' ? true : serious === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string) : 20,
        skip: skip ? parseInt(skip as string) : 0,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching adverse events:", error);
      res.status(500).json({ message: "Failed to search adverse events" });
    }
  });

  // Search drug recalls
  app.get("/api/fda/recalls", isAuthenticated, async (req: any, res) => {
    try {
      const {
        query,
        firm,
        recallClass,
        status,
        limit,
        skip,
      } = req.query;

      const result = await searchDrugRecalls({
        query: query as string,
        firm: firm as string,
        recallClass: recallClass as '1' | '2' | '3',
        status: status as 'Ongoing' | 'Completed' | 'Terminated',
        limit: limit ? parseInt(limit as string) : 20,
        skip: skip ? parseInt(skip as string) : 0,
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching drug recalls:", error);
      res.status(500).json({ message: "Failed to search drug recalls" });
    }
  });

  // ============================================================================
  // PROMETHEUS-MIND PHASE 2 API ROUTES
  // ============================================================================

  // Get Prometheus status for a child
  app.get("/api/prometheus/status/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);

      if (isNaN(childId)) {
        return res.status(400).json({ message: "Invalid child ID" });
      }

      // Verify child belongs to user
      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.json({
          initialized: false,
          message: "Prometheus not initialized for this child"
        });
      }

      res.json({
        initialized: true,
        prometheusId: prometheusState.id,
        status: prometheusState.status,
        totalKnowledgeNodes: prometheusState.totalKnowledgeNodes,
        totalMemoryItems: prometheusState.totalMemoryItems,
        avgConfidence: prometheusState.avgConfidence,
        lastConsolidationAt: prometheusState.lastConsolidationAt
      });
    } catch (error) {
      console.error("Error fetching Prometheus status:", error);
      res.status(500).json({ message: "Failed to fetch Prometheus status" });
    }
  });

  // Semantic search across knowledge
  app.post("/api/prometheus/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { childId, query: searchQuery, options } = req.body;

      if (!childId || !searchQuery) {
        return res.status(400).json({ message: "childId and query are required" });
      }

      // Verify child belongs to user
      const child = await storage.getChild(parseInt(childId, 10), userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, parseInt(childId, 10))
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized for this child" });
      }

      const { semanticSearch } = await import("./prometheus/phase2");
      const results = await semanticSearch(prometheusState.id, searchQuery, options || {});

      res.json({ results });
    } catch (error) {
      console.error("Error in semantic search:", error);
      res.status(500).json({ message: "Failed to perform semantic search" });
    }
  });

  // Get predictions for a child
  app.get("/api/prometheus/predictions/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const { status } = req.query;

      // Verify child belongs to user
      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const {
        getPendingPredictions,
        getValidatedPredictions,
        getPredictionStats
      } = await import("./prometheus/phase2");

      let predictions;
      if (status === "pending") {
        predictions = await getPendingPredictions(prometheusState.id);
      } else if (status === "validated") {
        predictions = await getValidatedPredictions(prometheusState.id);
      } else {
        predictions = [
          ...(await getPendingPredictions(prometheusState.id)),
          ...(await getValidatedPredictions(prometheusState.id))
        ];
      }

      const stats = await getPredictionStats(prometheusState.id);

      res.json({ predictions, stats });
    } catch (error) {
      console.error("Error fetching predictions:", error);
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });

  // Validate a prediction
  app.post("/api/prometheus/predictions/:predictionId/validate", isAuthenticated, async (req: any, res) => {
    try {
      const predictionId = parseInt(req.params.predictionId, 10);
      const { actualOutcome, wasCorrect, deviationScore, notes } = req.body;

      if (!actualOutcome || typeof wasCorrect !== "boolean") {
        return res.status(400).json({
          message: "actualOutcome and wasCorrect are required"
        });
      }

      const { validatePrediction } = await import("./prometheus/phase2");

      const result = await validatePrediction(predictionId, {
        actualOutcome,
        wasCorrect,
        deviationScore,
        notes
      });

      res.json(result);
    } catch (error) {
      console.error("Error validating prediction:", error);
      res.status(500).json({ message: "Failed to validate prediction" });
    }
  });

  // Get cross-child insights
  app.get("/api/prometheus/insights", isAuthenticated, async (req: any, res) => {
    try {
      const { childId } = req.query;

      const { generateCrossChildInsights, findRelevantInsightsForChild } =
        await import("./prometheus/phase2");

      if (childId) {
        const prometheusState = await db.query.prometheusState.findFirst({
          where: eq(schema.prometheusState.childId, parseInt(childId as string, 10))
        });

        if (prometheusState) {
          const insights = await findRelevantInsightsForChild(prometheusState.id, 10);
          return res.json({ insights, personalized: true });
        }
      }

      // General insights (not personalized)
      const insights = await generateCrossChildInsights(3);
      res.json({ insights, personalized: false });
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  // Verify a knowledge node
  app.post("/api/prometheus/verify/:nodeId", isAuthenticated, async (req: any, res) => {
    try {
      const nodeId = parseInt(req.params.nodeId, 10);

      const node = await db.query.prometheusKnowledgeNodes.findFirst({
        where: eq(schema.prometheusKnowledgeNodes.id, nodeId)
      });

      if (!node) {
        return res.status(404).json({ message: "Knowledge node not found" });
      }

      const { runFullVerification } = await import("./prometheus/phase2");
      const result = await runFullVerification(node.prometheusId, nodeId);

      res.json(result);
    } catch (error) {
      console.error("Error verifying node:", error);
      res.status(500).json({ message: "Failed to verify knowledge node" });
    }
  });

  // Run Phase 2 maintenance
  app.post("/api/prometheus/maintenance/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);

      // Verify child belongs to user
      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { runPhase2Maintenance } = await import("./prometheus/phase2");
      const result = await runPhase2Maintenance(prometheusState.id);

      res.json(result);
    } catch (error) {
      console.error("Error running Phase 2 maintenance:", error);
      res.status(500).json({ message: "Failed to run maintenance" });
    }
  });

  // ============================================================================
  // PROMETHEUS Vector DB Routes
  // ============================================================================

  // Get Pinecone stats
  app.get("/api/prometheus/vectordb/stats", isAuthenticated, async (req: any, res) => {
    try {
      const { getPineconeStats } = await import("./prometheus/phase2");
      const stats = await getPineconeStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting Pinecone stats:", error);
      res.status(500).json({ message: "Failed to get Pinecone stats" });
    }
  });

  // Sync to Pinecone
  app.post("/api/prometheus/vectordb/sync/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { fullSyncToPinecone } = await import("./prometheus/phase2");
      const result = await fullSyncToPinecone(prometheusState.id);

      res.json(result);
    } catch (error) {
      console.error("Error syncing to Pinecone:", error);
      res.status(500).json({ message: "Failed to sync to Pinecone" });
    }
  });

  // Hybrid semantic search
  app.post("/api/prometheus/vectordb/search/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const { query, topK, searchMemories, searchNodes, minScore } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { hybridSemanticSearch } = await import("./prometheus/phase2");
      const results = await hybridSemanticSearch(prometheusState.id, query, {
        topK: topK || 10,
        searchMemories: searchMemories !== false,
        searchNodes: searchNodes !== false,
        minScore: minScore || 0.7
      });

      res.json(results);
    } catch (error) {
      console.error("Error performing hybrid search:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // ============================================================================
  // PROMETHEUS Notification Routes
  // ============================================================================

  // Get user notifications
  app.get("/api/prometheus/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { unreadOnly, limit } = req.query;

      const { getUserNotifications } = await import("./prometheus/phase2");
      const notifications = await getUserNotifications(userId, {
        unreadOnly: unreadOnly === "true",
        limit: limit ? parseInt(limit as string, 10) : 50
      });

      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Get notifications for specific child
  app.get("/api/prometheus/notifications/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const { unreadOnly, limit } = req.query;

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { getNotifications } = await import("./prometheus/phase2");
      const notifications = await getNotifications(prometheusState.id, {
        unreadOnly: unreadOnly === "true",
        limit: limit ? parseInt(limit as string, 10) : 50
      });

      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/prometheus/notifications/:notificationId/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.notificationId, 10);

      const { markNotificationRead } = await import("./prometheus/phase2");
      const notification = await markNotificationRead(notificationId, userId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/prometheus/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { prometheusId } = req.body;

      const { markAllNotificationsRead } = await import("./prometheus/phase2");
      const count = await markAllNotificationsRead(
        prometheusId ? parseInt(prometheusId, 10) : undefined,
        userId
      );

      res.json({ marked: count });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/prometheus/notifications/:notificationId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.notificationId, 10);

      const { deleteNotification } = await import("./prometheus/phase2");
      const deleted = await deleteNotification(notificationId, userId);

      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Generate notification digest
  app.get("/api/prometheus/notifications/digest/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const period = req.params.period as "daily" | "weekly";

      if (period !== "daily" && period !== "weekly") {
        return res.status(400).json({ message: "Period must be 'daily' or 'weekly'" });
      }

      const { generateDigest } = await import("./prometheus/phase2");
      const digest = await generateDigest(userId, period);

      res.json(digest);
    } catch (error) {
      console.error("Error generating digest:", error);
      res.status(500).json({ message: "Failed to generate digest" });
    }
  });

  // Check and notify important discoveries
  app.post("/api/prometheus/notifications/check/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { checkAndNotifyImportantDiscoveries } = await import("./prometheus/phase2");
      const notifications = await checkAndNotifyImportantDiscoveries(prometheusState.id);

      res.json(notifications);
    } catch (error) {
      console.error("Error checking for discoveries:", error);
      res.status(500).json({ message: "Failed to check for discoveries" });
    }
  });

  // ============================================================================
  // PROMETHEUS Knowledge Graph API
  // ============================================================================

  // Get full knowledge graph for visualization
  app.get("/api/prometheus/knowledge-graph/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      // Get all knowledge nodes
      const nodes = await db.query.prometheusKnowledgeNodes.findMany({
        where: eq(schema.prometheusKnowledgeNodes.prometheusId, prometheusState.id)
      });

      // Get all edges
      const edges = await db.query.prometheusKnowledgeEdges.findMany({
        where: eq(schema.prometheusKnowledgeEdges.prometheusId, prometheusState.id)
      });

      // Transform for visualization
      const graphNodes = nodes.map(node => ({
        id: node.id.toString(),
        label: node.label,
        type: node.nodeType,
        group: node.nodeType,
        certainty: node.certaintyLevel,
        confidence: node.confidence,
        description: node.description,
        metadata: node.metadata,
        size: Math.max(20, Math.min(50, (node.confidence ?? 0) * 50))
      }));

      const graphEdges = edges.map(edge => ({
        id: edge.id.toString(),
        source: (edge.sourceNodeId ?? 0).toString(),
        target: (edge.targetNodeId ?? 0).toString(),
        label: edge.relationType,
        strength: edge.strength ?? 0,
        width: Math.max(1, (edge.strength ?? 0) * 5)
      }));

      res.json({
        nodes: graphNodes,
        edges: graphEdges,
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          nodeTypes: Array.from(new Set(nodes.map(n => n.nodeType))),
          averageConfidence: nodes.length > 0
            ? nodes.reduce((sum, n) => sum + (n.confidence ?? 0), 0) / nodes.length
            : 0
        }
      });
    } catch (error) {
      console.error("Error getting knowledge graph:", error);
      res.status(500).json({ message: "Failed to get knowledge graph" });
    }
  });

  // Get node details with related nodes
  app.get("/api/prometheus/knowledge-graph/:childId/node/:nodeId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const nodeId = parseInt(req.params.nodeId, 10);

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      // Get the node
      const node = await db.query.prometheusKnowledgeNodes.findFirst({
        where: and(
          eq(schema.prometheusKnowledgeNodes.id, nodeId),
          eq(schema.prometheusKnowledgeNodes.prometheusId, prometheusState.id)
        )
      });

      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }

      // Get related edges
      const outgoingEdges = await db.query.prometheusKnowledgeEdges.findMany({
        where: and(
          eq(schema.prometheusKnowledgeEdges.sourceNodeId, nodeId),
          eq(schema.prometheusKnowledgeEdges.prometheusId, prometheusState.id)
        )
      });

      const incomingEdges = await db.query.prometheusKnowledgeEdges.findMany({
        where: and(
          eq(schema.prometheusKnowledgeEdges.targetNodeId, nodeId),
          eq(schema.prometheusKnowledgeEdges.prometheusId, prometheusState.id)
        )
      });

      // Get related node details
      const relatedNodeIds = new Set([
        ...outgoingEdges.map(e => e.targetNodeId).filter((id): id is number => id !== null),
        ...incomingEdges.map(e => e.sourceNodeId).filter((id): id is number => id !== null)
      ]);

      const relatedNodesArray = Array.from(relatedNodeIds);
      const relatedNodes = relatedNodesArray.length > 0
        ? await db.query.prometheusKnowledgeNodes.findMany({
            where: and(
              eq(schema.prometheusKnowledgeNodes.prometheusId, prometheusState.id),
              sql`${schema.prometheusKnowledgeNodes.id} IN (${relatedNodesArray.join(",")})`
            )
          })
        : [];

      // Get memories related to this concept
      const { findSimilarKnowledgeNodes } = await import("./prometheus/phase2");
      const relatedMemories = await db.query.prometheusMemory.findMany({
        where: and(
          eq(schema.prometheusMemory.prometheusId, prometheusState.id),
          sql`${schema.prometheusMemory.content} ILIKE ${'%' + node.label + '%'}`
        ),
        limit: 10
      });

      res.json({
        node,
        relationships: {
          outgoing: outgoingEdges.map(e => ({
            ...e,
            targetNode: relatedNodes.find(n => n.id === e.targetNodeId)
          })),
          incoming: incomingEdges.map(e => ({
            ...e,
            sourceNode: relatedNodes.find(n => n.id === e.sourceNodeId)
          }))
        },
        relatedMemories
      });
    } catch (error) {
      console.error("Error getting node details:", error);
      res.status(500).json({ message: "Failed to get node details" });
    }
  });

  // ============================================================================
  // PROMETHEUS Phase 3: Expert Verification API
  // ============================================================================

  // Register as expert
  app.post("/api/prometheus/experts/register", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { registerExpert } = await import("./prometheus/phase3");

      const expert = await registerExpert({
        userId,
        ...req.body,
      });

      res.json(expert);
    } catch (error) {
      console.error("Error registering expert:", error);
      res.status(500).json({ message: "Failed to register expert" });
    }
  });

  // Get expert profile
  app.get("/api/prometheus/experts/:expertId", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = parseInt(req.params.expertId, 10);
      const { getExpertProfile } = await import("./prometheus/phase3");

      const profile = await getExpertProfile(expertId);
      if (!profile) {
        return res.status(404).json({ message: "Expert not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error getting expert profile:", error);
      res.status(500).json({ message: "Failed to get expert profile" });
    }
  });

  // Get pending reviews for expert
  app.get("/api/prometheus/experts/:expertId/reviews/pending", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = parseInt(req.params.expertId, 10);
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const { getPendingReviewsForExpert } = await import("./prometheus/phase3");
      const reviews = await getPendingReviewsForExpert(expertId, limit);

      res.json(reviews);
    } catch (error) {
      console.error("Error getting pending reviews:", error);
      res.status(500).json({ message: "Failed to get pending reviews" });
    }
  });

  // Submit expert review
  app.post("/api/prometheus/experts/:expertId/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = parseInt(req.params.expertId, 10);
      const { targetType, targetId, verdict } = req.body;

      const { submitExpertReview } = await import("./prometheus/phase3");
      const review = await submitExpertReview(expertId, targetType, targetId, verdict);

      res.json(review);
    } catch (error) {
      console.error("Error submitting review:", error);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // Get review statistics for Prometheus
  app.get("/api/prometheus/:childId/review-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { getReviewStatistics } = await import("./prometheus/phase3");
      const stats = await getReviewStatistics(prometheusState.id);

      res.json(stats);
    } catch (error) {
      console.error("Error getting review stats:", error);
      res.status(500).json({ message: "Failed to get review statistics" });
    }
  });

  // ============================================================================
  // PROMETHEUS Phase 3: Community Knowledge API
  // ============================================================================

  // Search shared knowledge
  app.get("/api/prometheus/community/knowledge", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const params = {
        query: req.query.query as string,
        category: req.query.category as string,
        knowledgeType: req.query.knowledgeType as string,
        verificationStatus: req.query.verificationStatus as string,
        conditions: req.query.conditions ? (req.query.conditions as string).split(",") : undefined,
        sortBy: req.query.sortBy as "relevance" | "votes" | "recent" | "verified",
        limit: parseInt(req.query.limit as string, 10) || 20,
        offset: parseInt(req.query.offset as string, 10) || 0,
      };

      const { searchSharedKnowledge } = await import("./prometheus/phase3");
      const knowledge = await searchSharedKnowledge(params, userId);

      res.json(knowledge);
    } catch (error) {
      console.error("Error searching knowledge:", error);
      res.status(500).json({ message: "Failed to search knowledge" });
    }
  });

  // Get knowledge categories
  app.get("/api/prometheus/community/categories", async (req, res) => {
    try {
      const { getKnowledgeByCategory } = await import("./prometheus/phase3");
      const categories = await getKnowledgeByCategory();

      res.json(categories);
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  // Share knowledge to community
  app.post("/api/prometheus/:childId/share", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const { memoryId, nodeId, additionalContext } = req.body;

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { shareKnowledge } = await import("./prometheus/phase3");
      const shared = await shareKnowledge(prometheusState.id, userId, memoryId, nodeId, additionalContext);

      res.json(shared);
    } catch (error) {
      console.error("Error sharing knowledge:", error);
      res.status(500).json({ message: "Failed to share knowledge" });
    }
  });

  // Vote on shared knowledge
  app.post("/api/prometheus/community/knowledge/:knowledgeId/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const knowledgeId = parseInt(req.params.knowledgeId, 10);
      const { voteType, reason, comment } = req.body;

      const { voteOnKnowledge } = await import("./prometheus/phase3");
      const vote = await voteOnKnowledge(userId, knowledgeId, voteType, reason, comment);

      res.json(vote);
    } catch (error) {
      console.error("Error voting:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // Submit contribution
  app.post("/api/prometheus/community/contributions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const { submitContribution } = await import("./prometheus/phase3");
      const contribution = await submitContribution(userId, req.body);

      res.json(contribution);
    } catch (error) {
      console.error("Error submitting contribution:", error);
      res.status(500).json({ message: "Failed to submit contribution" });
    }
  });

  // Get community statistics
  app.get("/api/prometheus/community/stats", async (req, res) => {
    try {
      const { getCommunityStats } = await import("./prometheus/phase3");
      const stats = await getCommunityStats();

      res.json(stats);
    } catch (error) {
      console.error("Error getting community stats:", error);
      res.status(500).json({ message: "Failed to get community statistics" });
    }
  });

  // ============================================================================
  // PROMETHEUS Phase 3: Multi-language API
  // ============================================================================

  // Get translation for content
  app.get("/api/prometheus/translate/:sourceType/:sourceId/:language", isAuthenticated, async (req: any, res) => {
    try {
      const { sourceType, sourceId, language } = req.params;

      const { getTranslation } = await import("./prometheus/phase3");
      const translation = await getTranslation(sourceType, parseInt(sourceId, 10), language);

      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }

      res.json(translation);
    } catch (error) {
      console.error("Error getting translation:", error);
      res.status(500).json({ message: "Failed to get translation" });
    }
  });

  // Create translation
  app.post("/api/prometheus/translate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sourceType, sourceId, sourceLanguage, targetLanguage, text, context, medicalDomain } = req.body;

      const { createTranslation } = await import("./prometheus/phase3");
      const translation = await createTranslation({
        sourceType,
        sourceId,
        sourceLanguage,
        targetLanguage,
        text,
        context,
        medicalDomain,
      }, userId);

      res.json(translation);
    } catch (error) {
      console.error("Error creating translation:", error);
      res.status(500).json({ message: "Failed to create translation" });
    }
  });

  // Batch translate Prometheus content
  app.post("/api/prometheus/:childId/translate-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const { targetLanguage, sourceLanguage } = req.body;

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { translatePrometheusContent } = await import("./prometheus/phase3");
      const result = await translatePrometheusContent(prometheusState.id, targetLanguage, sourceLanguage);

      res.json(result);
    } catch (error) {
      console.error("Error batch translating:", error);
      res.status(500).json({ message: "Failed to batch translate" });
    }
  });

  // Search medical terms
  app.get("/api/prometheus/medical-terms", async (req, res) => {
    try {
      const query = req.query.query as string;
      const language = (req.query.language as string) || "en";

      const { searchMedicalTerms } = await import("./prometheus/phase3");
      const terms = searchMedicalTerms(query, language as any);

      res.json(terms);
    } catch (error) {
      console.error("Error searching medical terms:", error);
      res.status(500).json({ message: "Failed to search medical terms" });
    }
  });

  // Get translation statistics
  app.get("/api/prometheus/translation-stats", isAuthenticated, async (req, res) => {
    try {
      const { getTranslationStats } = await import("./prometheus/phase3");
      const stats = await getTranslationStats();

      res.json(stats);
    } catch (error) {
      console.error("Error getting translation stats:", error);
      res.status(500).json({ message: "Failed to get translation statistics" });
    }
  });

  // ============================================================================
  // PROMETHEUS Phase 3: Clinical Integration API
  // ============================================================================

  // Get user's clinical integrations
  app.get("/api/prometheus/clinical/integrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = req.query.childId ? parseInt(req.query.childId as string, 10) : undefined;

      const { getUserIntegrations } = await import("./prometheus/phase3");
      const integrations = await getUserIntegrations(userId, childId);

      res.json(integrations);
    } catch (error) {
      console.error("Error getting integrations:", error);
      res.status(500).json({ message: "Failed to get integrations" });
    }
  });

  // Create clinical integration
  app.post("/api/prometheus/clinical/integrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const { createIntegration } = await import("./prometheus/phase3");
      const integration = await createIntegration({
        userId,
        ...req.body,
      });

      res.json(integration);
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  // Give consent for integration
  app.post("/api/prometheus/clinical/integrations/:integrationId/consent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrationId = parseInt(req.params.integrationId, 10);

      const { giveConsent } = await import("./prometheus/phase3");
      const integration = await giveConsent(integrationId, userId);

      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      res.json(integration);
    } catch (error) {
      console.error("Error giving consent:", error);
      res.status(500).json({ message: "Failed to give consent" });
    }
  });

  // Revoke consent
  app.delete("/api/prometheus/clinical/integrations/:integrationId/consent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrationId = parseInt(req.params.integrationId, 10);

      const { revokeConsent } = await import("./prometheus/phase3");
      const success = await revokeConsent(integrationId, userId);

      if (!success) {
        return res.status(404).json({ message: "Integration not found" });
      }

      res.json({ message: "Consent revoked" });
    } catch (error) {
      console.error("Error revoking consent:", error);
      res.status(500).json({ message: "Failed to revoke consent" });
    }
  });

  // Trigger sync
  app.post("/api/prometheus/clinical/integrations/:integrationId/sync", isAuthenticated, async (req: any, res) => {
    try {
      const integrationId = parseInt(req.params.integrationId, 10);

      const { triggerSync } = await import("./prometheus/phase3");
      const importId = await triggerSync(integrationId);

      if (!importId) {
        return res.status(400).json({ message: "Cannot sync - integration not active or consent not given" });
      }

      res.json({ importId, message: "Sync triggered" });
    } catch (error) {
      console.error("Error triggering sync:", error);
      res.status(500).json({ message: "Failed to trigger sync" });
    }
  });

  // Import lab results manually
  app.post("/api/prometheus/:childId/clinical/lab-results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const { results } = req.body;

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { importLabResults } = await import("./prometheus/phase3");
      const result = await importLabResults(prometheusState.id, userId, results);

      res.json(result);
    } catch (error) {
      console.error("Error importing lab results:", error);
      res.status(500).json({ message: "Failed to import lab results" });
    }
  });

  // Import medications manually
  app.post("/api/prometheus/:childId/clinical/medications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const { medications } = req.body;

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { importMedications } = await import("./prometheus/phase3");
      const result = await importMedications(prometheusState.id, userId, medications);

      res.json(result);
    } catch (error) {
      console.error("Error importing medications:", error);
      res.status(500).json({ message: "Failed to import medications" });
    }
  });

  // Get import history
  app.get("/api/prometheus/:childId/clinical/imports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { getImportHistory } = await import("./prometheus/phase3");
      const history = await getImportHistory(prometheusState.id, limit);

      res.json(history);
    } catch (error) {
      console.error("Error getting import history:", error);
      res.status(500).json({ message: "Failed to get import history" });
    }
  });

  // Get import statistics
  app.get("/api/prometheus/:childId/clinical/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.childId, 10);

      const child = await storage.getChild(childId, userId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      const prometheusState = await db.query.prometheusState.findFirst({
        where: eq(schema.prometheusState.childId, childId)
      });

      if (!prometheusState) {
        return res.status(404).json({ message: "Prometheus not initialized" });
      }

      const { getImportStatistics } = await import("./prometheus/phase3");
      const stats = await getImportStatistics(prometheusState.id);

      res.json(stats);
    } catch (error) {
      console.error("Error getting import statistics:", error);
      res.status(500).json({ message: "Failed to get import statistics" });
    }
  });

  return httpServer;
}
