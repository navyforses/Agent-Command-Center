import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  serial,
  integer,
  date,
  boolean,
  jsonb,
  timestamp,
  index,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (MANDATORY for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (MANDATORY for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Language preference for translations
  languagePreference: varchar("language_preference", { length: 10 }).default("ka"),
  // Soft delete support
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User Preferences table
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).unique().notNull(),
  // Notification preferences
  emailNotifications: boolean("email_notifications").default(true),
  appointmentReminders: boolean("appointment_reminders").default(true),
  clinicalTrialAlerts: boolean("clinical_trial_alerts").default(true),
  // Privacy preferences
  dataSharing: boolean("data_sharing").default(false),
  // Language preference
  language: varchar("language").default("en"),
  // Theme preference
  theme: varchar("theme").default("light"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserPreferencesSchema = insertUserPreferencesSchema.partial();

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// Children table
export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  diagnosis: text("diagnosis"),
  diagnosisKa: text("diagnosis_ka"),
  diagnosisDate: date("diagnosis_date"),
  notes: text("notes"),
  notesKa: text("notes_ka"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
});

export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  childId: integer("child_id").references(() => children.id),
  title: varchar("title").notNull(),
  category: varchar("category"),
  filePath: varchar("file_path"),
  fileType: varchar("file_type"),
  fileSize: integer("file_size"),
  aiSummary: text("ai_summary"),
  aiSummaryKa: text("ai_summary_ka"),
  aiKeyFindings: text("ai_key_findings").array(),
  documentType: varchar("document_type"),
  processingStatus: varchar("processing_status").default("pending"),
  purpose: text("purpose"),
  extractedText: text("extracted_text"),
  conversationId: integer("conversation_id"),
  // Soft delete support
  deletedAt: timestamp("deleted_at"),
  // Timestamps
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_documents_user").on(table.userId),
  index("idx_documents_category").on(table.category),
  index("idx_documents_processing_status").on(table.processingStatus),
]);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export const documentTypeEnum = z.enum([
  "form_100",
  "diagnosis",
  "mri_report",
  "therapy_note",
  "research",
  "prescription",
  "lab_result",
  "other"
]);
export type DocumentType = z.infer<typeof documentTypeEnum>;

export const processingStatusEnum = z.enum([
  "pending",
  "processing",
  "completed",
  "failed"
]);
export type ProcessingStatus = z.infer<typeof processingStatusEnum>;

// Therapies table
export const therapies = pgTable("therapies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  childId: integer("child_id").references(() => children.id),
  type: varchar("type"),
  therapistName: varchar("therapist_name"),
  frequency: varchar("frequency"),
  goals: text("goals").array(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  startDate: date("start_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTherapySchema = createInsertSchema(therapies).omit({
  id: true,
  createdAt: true,
});

export type InsertTherapy = z.infer<typeof insertTherapySchema>;
export type Therapy = typeof therapies.$inferSelect;

// Therapy sessions table
export const therapySessions = pgTable("therapy_sessions", {
  id: serial("id").primaryKey(),
  therapyId: integer("therapy_id").references(() => therapies.id),
  sessionDate: date("session_date"),
  duration: integer("duration"),
  notes: text("notes"),
  progressRating: integer("progress_rating"),
  aiInsights: text("ai_insights"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTherapySessionSchema = createInsertSchema(therapySessions).omit({
  id: true,
  createdAt: true,
});

export type InsertTherapySession = z.infer<typeof insertTherapySessionSchema>;
export type TherapySession = typeof therapySessions.$inferSelect;

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  childId: integer("child_id").references(() => children.id),
  title: varchar("title").notNull(),
  description: text("description"),
  location: varchar("location"),
  appointmentDate: timestamp("appointment_date").notNull(),
  endDate: timestamp("end_date"),
  reminderSent: boolean("reminder_sent").default(false),
  status: varchar("status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Emails table
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  subject: varchar("subject"),
  recipient: varchar("recipient"),
  body: text("body"),
  status: varchar("status"),
  category: varchar("category"),
  aiDraftContent: text("ai_draft_content"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

// Conversations table for chat history
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: varchar("title").notNull(),
  preview: text("preview"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  role: varchar("role"),
  content: text("content").notNull(),
  searchSources: jsonb("search_sources"),
  isSearchResult: boolean("is_search_result").default(false),
  documentIds: integer("document_ids").array(),
  attachments: jsonb("attachments"),
  actionType: varchar("action_type"),
  actionData: jsonb("action_data"),
  actionStatus: varchar("action_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const searchSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});

export const actionTypeEnum = z.enum([
  "create_child",
  "add_therapy",
  "schedule_appointment",
  "draft_email",
  "analyze_document"
]);
export type ActionType = z.infer<typeof actionTypeEnum>;

export const actionStatusEnum = z.enum([
  "pending",
  "confirmed",
  "executed",
  "cancelled"
]);
export type ActionStatus = z.infer<typeof actionStatusEnum>;

export const attachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  filePath: z.string(),
  thumbnailPath: z.string().optional(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const insertChatMessageSchema = createInsertSchema(chatMessages, {
  searchSources: z.array(searchSourceSchema).nullable().optional(),
  actionData: z.record(z.any()).nullable().optional(),
  attachments: z.array(attachmentSchema).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type SearchSource = z.infer<typeof searchSourceSchema>;

// Testimonials table for public reviews
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  authorName: varchar("author_name").notNull(),
  authorRole: varchar("author_role"),
  authorRoleKa: varchar("author_role_ka"),
  content: text("content").notNull(),
  contentKa: text("content_ka"),
  rating: integer("rating").notNull(),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
  isApproved: true,
});

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

// ============================================================================
// NEXUS OMEGA - Multi-AI Research Platform Tables
// ============================================================================

// AI Agents table - defines the AI systems in the NEXUS collective
export const nexusAiAgents = pgTable("nexus_ai_agents", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }),
  description: text("description"),
  strengths: text("strengths").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNexusAiAgentSchema = createInsertSchema(nexusAiAgents).omit({
  createdAt: true,
});

export type InsertNexusAiAgent = z.infer<typeof insertNexusAiAgentSchema>;
export type NexusAiAgent = typeof nexusAiAgents.$inferSelect;

// AI status enum for tracking agent states
export const nexusAiStatusEnum = z.enum([
  "ready",
  "searching",
  "analyzing",
  "error",
  "offline"
]);
export type NexusAiStatus = z.infer<typeof nexusAiStatusEnum>;

// Research Queries table - stores multi-AI research queries
export const nexusResearchQueries = pgTable("nexus_research_queries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  queryText: text("query_text").notNull(),
  disciplines: text("disciplines").array(),
  researchFocus: text("research_focus").array(),
  aiAgents: text("ai_agents").array(),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertNexusResearchQuerySchema = createInsertSchema(nexusResearchQueries).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertNexusResearchQuery = z.infer<typeof insertNexusResearchQuerySchema>;
export type NexusResearchQuery = typeof nexusResearchQueries.$inferSelect;

// Research query status enum
export const nexusQueryStatusEnum = z.enum([
  "pending",
  "searching",
  "analyzing",
  "consensus",
  "completed",
  "failed"
]);
export type NexusQueryStatus = z.infer<typeof nexusQueryStatusEnum>;

// Findings table - stores research findings from multi-AI analysis
export const nexusFindings = pgTable("nexus_findings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  queryId: integer("query_id").references(() => nexusResearchQueries.id),
  evolutionCycleId: integer("evolution_cycle_id").references(() => evolutionCycles.id),
  title: text("title").notNull(),
  titleKa: text("title_ka"),
  summary: text("summary"),
  summaryKa: text("summary_ka"),
  consensusLevel: varchar("consensus_level", { length: 10 }),
  confidenceScore: integer("confidence_score"),
  relevanceScore: integer("relevance_score"),
  sources: jsonb("sources"),
  hypothesesGenerated: text("hypotheses_generated").array(),
  hypothesesGeneratedKa: text("hypotheses_generated_ka").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNexusFindingSchema = createInsertSchema(nexusFindings, {
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    doi: z.string().optional(),
    snippet: z.string().optional(),
  })).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertNexusFinding = z.infer<typeof insertNexusFindingSchema>;
export type NexusFinding = typeof nexusFindings.$inferSelect;

// AI Analyses table - individual AI perspectives on findings
export const nexusAiAnalyses = pgTable("nexus_ai_analyses", {
  id: serial("id").primaryKey(),
  findingId: integer("finding_id").references(() => nexusFindings.id),
  aiAgentId: varchar("ai_agent_id", { length: 50 }).references(() => nexusAiAgents.id),
  perspective: text("perspective"),
  confidence: integer("confidence"),
  keyPoints: text("key_points").array(),
  concerns: text("concerns").array(),
  uniqueInsights: text("unique_insights").array(),
  rawResponse: jsonb("raw_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNexusAiAnalysisSchema = createInsertSchema(nexusAiAnalyses, {
  rawResponse: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertNexusAiAnalysis = z.infer<typeof insertNexusAiAnalysisSchema>;
export type NexusAiAnalysis = typeof nexusAiAnalyses.$inferSelect;

// Disciplinary Analyses table - scientific discipline perspectives
export const nexusDisciplinaryAnalyses = pgTable("nexus_disciplinary_analyses", {
  id: serial("id").primaryKey(),
  findingId: integer("finding_id").references(() => nexusFindings.id),
  discipline: varchar("discipline", { length: 100 }).notNull(),
  analysis: text("analysis"),
  crossConnections: jsonb("cross_connections"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNexusDisciplinaryAnalysisSchema = createInsertSchema(nexusDisciplinaryAnalyses, {
  crossConnections: z.array(z.object({
    toDiscipline: z.string(),
    connection: z.string(),
    strength: z.number().optional(),
  })).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertNexusDisciplinaryAnalysis = z.infer<typeof insertNexusDisciplinaryAnalysisSchema>;
export type NexusDisciplinaryAnalysis = typeof nexusDisciplinaryAnalyses.$inferSelect;

// Knowledge Nodes table - concepts in the knowledge graph
export const nexusKnowledgeNodes = pgTable("nexus_knowledge_nodes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  label: text("label").notNull(),
  nodeType: varchar("node_type", { length: 50 }),
  relevanceScore: integer("relevance_score"),
  evidenceLevel: integer("evidence_level"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nexusNodeTypeEnum = z.enum([
  "concept",
  "therapy",
  "mechanism",
  "pathway",
  "trial",
  "hypothesis"
]);
export type NexusNodeType = z.infer<typeof nexusNodeTypeEnum>;

export const insertNexusKnowledgeNodeSchema = createInsertSchema(nexusKnowledgeNodes, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertNexusKnowledgeNode = z.infer<typeof insertNexusKnowledgeNodeSchema>;
export type NexusKnowledgeNode = typeof nexusKnowledgeNodes.$inferSelect;

// Knowledge Edges table - relationships in the knowledge graph
export const nexusKnowledgeEdges = pgTable("nexus_knowledge_edges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sourceId: integer("source_id").references(() => nexusKnowledgeNodes.id),
  targetId: integer("target_id").references(() => nexusKnowledgeNodes.id),
  relationship: varchar("relationship", { length: 100 }),
  strength: real("strength"),
  discoveredBy: text("discovered_by").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNexusKnowledgeEdgeSchema = createInsertSchema(nexusKnowledgeEdges).omit({
  id: true,
  createdAt: true,
});

export type InsertNexusKnowledgeEdge = z.infer<typeof insertNexusKnowledgeEdgeSchema>;
export type NexusKnowledgeEdge = typeof nexusKnowledgeEdges.$inferSelect;

// Hypotheses table - generated research hypotheses (unified: NEXUS + Evolution)
export const nexusHypotheses = pgTable("nexus_hypotheses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  hypothesisCode: varchar("hypothesis_code", { length: 20 }).unique(),
  statement: text("statement").notNull(),
  statementKa: text("statement_ka"),
  status: varchar("status", { length: 50 }).default("nascent"),
  confidenceScore: integer("confidence_score"),
  proposedBy: varchar("proposed_by", { length: 50 }),
  supportedBy: text("supported_by").array(),
  supportingEvidence: jsonb("supporting_evidence"),
  contradictingEvidence: jsonb("contradicting_evidence"),
  crossDisciplinaryBasis: jsonb("cross_disciplinary_basis"),
  testability: text("testability"),
  actionItems: jsonb("action_items"),
  origin: varchar("origin", { length: 20 }).default("nexus"),
  evolutionInsightId: integer("evolution_insight_id").references(() => evolutionInsights.id),
  evolutionCycleId: integer("evolution_cycle_id").references(() => evolutionCycles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nexusHypothesisStatusEnum = z.enum([
  "nascent",
  "developing",
  "strong",
  "validated",
  "refuted",
  "superseded"
]);
export type NexusHypothesisStatus = z.infer<typeof nexusHypothesisStatusEnum>;

export const nexusHypothesisOriginEnum = z.enum([
  "nexus",
  "evolution",
  "merged"
]);
export type NexusHypothesisOrigin = z.infer<typeof nexusHypothesisOriginEnum>;

export const insertNexusHypothesisSchema = createInsertSchema(nexusHypotheses, {
  supportingEvidence: z.array(z.object({
    source: z.string(),
    description: z.string(),
    strength: z.number().optional(),
  })).nullable().optional(),
  contradictingEvidence: z.array(z.object({
    source: z.string(),
    description: z.string(),
    strength: z.number().optional(),
  })).nullable().optional(),
  crossDisciplinaryBasis: z.array(z.object({
    fromDiscipline: z.string(),
    toDiscipline: z.string(),
    analogy: z.string(),
  })).nullable().optional(),
  actionItems: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    priority: z.string().optional(),
  })).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNexusHypothesis = z.infer<typeof insertNexusHypothesisSchema>;
export type NexusHypothesis = typeof nexusHypotheses.$inferSelect;

// Debates table - unresolved questions between AI perspectives
export const nexusDebates = pgTable("nexus_debates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  question: text("question").notNull(),
  positionA: jsonb("position_a"),
  positionB: jsonb("position_b"),
  resolutionNeeded: text("resolution_needed"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  status: varchar("status", { length: 50 }).default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nexusDebatePriorityEnum = z.enum([
  "high",
  "medium",
  "low"
]);
export type NexusDebatePriority = z.infer<typeof nexusDebatePriorityEnum>;

export const insertNexusDebateSchema = createInsertSchema(nexusDebates, {
  positionA: z.object({
    statement: z.string(),
    supportingAIs: z.array(z.string()),
    evidence: z.array(z.string()),
  }).nullable().optional(),
  positionB: z.object({
    statement: z.string(),
    supportingAIs: z.array(z.string()),
    evidence: z.array(z.string()),
  }).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertNexusDebate = z.infer<typeof insertNexusDebateSchema>;
export type NexusDebate = typeof nexusDebates.$inferSelect;

// Nexus Action Items table - research-related action items
export const nexusActionItems = pgTable("nexus_action_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: integer("source_id"),
  status: varchar("status", { length: 50 }).default("pending"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const nexusActionSourceTypeEnum = z.enum([
  "finding",
  "hypothesis",
  "debate"
]);
export type NexusActionSourceType = z.infer<typeof nexusActionSourceTypeEnum>;

export const insertNexusActionItemSchema = createInsertSchema(nexusActionItems).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertNexusActionItem = z.infer<typeof insertNexusActionItemSchema>;
export type NexusActionItem = typeof nexusActionItems.$inferSelect;

// ============================================================================
// NEXUS OMEGA EVOLUTION CYCLE - Autonomous 24-Hour Research Cycles
// ============================================================================

// Evolution Cycles - main cycle tracking (runs from start to end date)
export const evolutionCycles = pgTable("evolution_cycles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  childId: integer("child_id").references(() => children.id),
  status: varchar("status", { length: 50 }).default("active"), // active, paused, completed
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  triggerDocumentId: integer("trigger_document_id").references(() => documents.id),
  diagnosisContext: text("diagnosis_context"), // Extracted diagnosis for cycle context
  createdAt: timestamp("created_at").defaultNow(),
});

export const evolutionCycleStatusEnum = z.enum([
  "active",
  "paused",
  "completed",
  "cancelled"
]);
export type EvolutionCycleStatus = z.infer<typeof evolutionCycleStatusEnum>;

export const insertEvolutionCycleSchema = createInsertSchema(evolutionCycles).omit({
  id: true,
  createdAt: true,
});

export type InsertEvolutionCycle = z.infer<typeof insertEvolutionCycleSchema>;
export type EvolutionCycle = typeof evolutionCycles.$inferSelect;

// Evolution Daily Runs - each 24-hour cycle
export const evolutionDailyRuns = pgTable("evolution_daily_runs", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").references(() => evolutionCycles.id),
  runDate: date("run_date").notNull(),
  currentPhase: varchar("current_phase", { length: 50 }), // observe, learn, connect, theorize, validate, adapt
  phaseStartedAt: timestamp("phase_started_at"),
  status: varchar("status", { length: 50 }).default("running"), // scheduled, running, completed, failed
  phasesCompleted: text("phases_completed").array(), // Track which phases finished
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const evolutionPhaseEnum = z.enum([
  "observe",    // 8 hours - Monitor PubMed, ClinicalTrials.gov, medical news
  "learn",      // 4 hours - Extract and structure information
  "connect",    // 4 hours - Link to child's diagnosis
  "theorize",   // 4 hours - Generate hypotheses with Swarm Intelligence
  "synthesize", // 2 hours - 5 AIs debate and synthesize hypotheses together
  "validate",   // 2 hours - Compare predictions with evidence
  "adapt"       // 2 hours - Adjust model
]);
export type EvolutionPhase = z.infer<typeof evolutionPhaseEnum>;

export const evolutionRunStatusEnum = z.enum([
  "scheduled",
  "running",
  "completed",
  "failed"
]);
export type EvolutionRunStatus = z.infer<typeof evolutionRunStatusEnum>;

export const insertEvolutionDailyRunSchema = createInsertSchema(evolutionDailyRuns).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertEvolutionDailyRun = z.infer<typeof insertEvolutionDailyRunSchema>;
export type EvolutionDailyRun = typeof evolutionDailyRuns.$inferSelect;

// Evolution Insights - findings discovered per phase
export const evolutionInsights = pgTable("evolution_insights", {
  id: serial("id").primaryKey(),
  dailyRunId: integer("daily_run_id").references(() => evolutionDailyRuns.id),
  phase: varchar("phase", { length: 50 }).notNull(),
  insightType: varchar("insight_type", { length: 50 }), // observation, learning, connection, hypothesis, prediction, validation, adaptation
  contentEn: text("content_en"),
  contentKa: text("content_ka"),
  sources: jsonb("sources"), // Array of source references
  metadata: jsonb("metadata"), // Phase-specific metadata
  confidence: integer("confidence"), // Confidence score 0-100
  relevanceScore: integer("relevance_score"), // Relevance to child's diagnosis
  createdAt: timestamp("created_at").defaultNow(),
});

export const evolutionInsightTypeEnum = z.enum([
  "observation",    // From OBSERVE phase
  "learning",       // From LEARN phase  
  "connection",     // From CONNECT phase
  "hypothesis",     // From THEORIZE phase
  "prediction",     // From THEORIZE phase
  "synthesis",      // From SYNTHESIZE phase - AI debate results
  "validation",     // From VALIDATE phase
  "adaptation"      // From ADAPT phase
]);
export type EvolutionInsightType = z.infer<typeof evolutionInsightTypeEnum>;

export const insertEvolutionInsightSchema = createInsertSchema(evolutionInsights, {
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    doi: z.string().optional(),
    snippet: z.string().optional(),
    source: z.string().optional(),
  })).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertEvolutionInsight = z.infer<typeof insertEvolutionInsightSchema>;
export type EvolutionInsight = typeof evolutionInsights.$inferSelect;

// Evolution Reports - daily bilingual academic reports with chat support
export const evolutionReports = pgTable("evolution_reports", {
  id: serial("id").primaryKey(),
  dailyRunId: integer("daily_run_id").references(() => evolutionDailyRuns.id),
  reportDate: date("report_date").notNull(),
  titleEn: varchar("title_en", { length: 500 }),
  titleKa: varchar("title_ka", { length: 500 }),
  summaryEn: text("summary_en"),
  summaryKa: text("summary_ka"),
  contentEn: text("content_en"), // Full report content in English
  contentKa: text("content_ka"), // Full report content in Georgian
  keyFindingsEn: text("key_findings_en").array(),
  keyFindingsKa: text("key_findings_ka").array(),
  hypothesesGenerated: jsonb("hypotheses_generated"), // Array of hypotheses from the day
  sourcesCompiled: jsonb("sources_compiled"), // All sources from the day
  filePath: varchar("file_path", { length: 500 }), // PDF path in object storage
  conversationId: integer("conversation_id").references(() => conversations.id), // For report-specific chat
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEvolutionReportSchema = createInsertSchema(evolutionReports, {
  hypothesesGenerated: z.array(z.object({
    hypothesis: z.string(),
    confidence: z.number(),
    evidence: z.array(z.string()),
    disciplines: z.array(z.string()).optional(),
  })).nullable().optional(),
  sourcesCompiled: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    doi: z.string().optional(),
    snippet: z.string().optional(),
    source: z.string().optional(),
  })).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertEvolutionReport = z.infer<typeof insertEvolutionReportSchema>;
export type EvolutionReport = typeof evolutionReports.$inferSelect;

// Evolution Report Conversations - track chat interactions about specific reports
export const evolutionReportMessages = pgTable("evolution_report_messages", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => evolutionReports.id),
  userId: varchar("user_id").references(() => users.id),
  role: varchar("role", { length: 20 }), // user, assistant
  content: text("content").notNull(),
  contentKa: text("content_ka"), // Georgian translation of response
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEvolutionReportMessageSchema = createInsertSchema(evolutionReportMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertEvolutionReportMessage = z.infer<typeof insertEvolutionReportMessageSchema>;
export type EvolutionReportMessage = typeof evolutionReportMessages.$inferSelect;

// ============================================================================
// ACCUMULATED KNOWLEDGE - Persistent insights that grow across cycles
// ============================================================================

// Accumulated Knowledge - stores insights that carry forward between evolution cycles
export const accumulatedKnowledge = pgTable("accumulated_knowledge", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  childId: integer("child_id").references(() => children.id),
  knowledgeType: varchar("knowledge_type", { length: 50 }).notNull(), // hypothesis, discovery, treatment_insight, mechanism, pattern
  titleEn: text("title_en").notNull(),
  titleKa: text("title_ka"),
  contentEn: text("content_en").notNull(),
  contentKa: text("content_ka"),
  confidence: integer("confidence").default(50), // 0-100 confidence score
  validationCount: integer("validation_count").default(0), // How many cycles have validated this
  contradictionCount: integer("contradiction_count").default(0), // How many cycles have contradicted this
  status: varchar("status", { length: 50 }).default("active"), // active, superseded, refuted, validated
  sources: jsonb("sources"), // Array of source references
  contributingCycleIds: integer("contributing_cycle_ids").array(), // Which cycles contributed to this knowledge
  originCycleId: integer("origin_cycle_id").references(() => evolutionCycles.id), // The cycle that first discovered this
  originInsightId: integer("origin_insight_id").references(() => evolutionInsights.id), // The specific insight it came from
  relatedKnowledgeIds: integer("related_knowledge_ids").array(), // Links to related accumulated knowledge
  metadata: jsonb("metadata"), // Additional data like tags, categories, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accumulatedKnowledgeTypeEnum = z.enum([
  "hypothesis",        // A proposed theory about treatment or mechanism
  "discovery",         // A confirmed finding from research
  "treatment_insight", // Insight about specific treatment approaches
  "mechanism",         // Understanding of biological/medical mechanisms
  "pattern",           // Identified patterns across research
  "connection",        // Cross-disciplinary connections
  "prediction"         // Validated predictions about outcomes
]);
export type AccumulatedKnowledgeType = z.infer<typeof accumulatedKnowledgeTypeEnum>;

export const accumulatedKnowledgeStatusEnum = z.enum([
  "active",      // Currently considered valid
  "superseded",  // Replaced by newer knowledge
  "refuted",     // Contradicted by evidence
  "validated",   // Confirmed by multiple sources/cycles
  "emerging"     // New, not yet validated
]);
export type AccumulatedKnowledgeStatus = z.infer<typeof accumulatedKnowledgeStatusEnum>;

export const insertAccumulatedKnowledgeSchema = createInsertSchema(accumulatedKnowledge, {
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    doi: z.string().optional(),
    snippet: z.string().optional(),
    source: z.string().optional(),
    cycleId: z.number().optional(),
  })).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccumulatedKnowledge = z.infer<typeof insertAccumulatedKnowledgeSchema>;
export type AccumulatedKnowledge = typeof accumulatedKnowledge.$inferSelect;

// ============================================================================
// PROMETHEUS-MIND - Living Cognitive Entity System
// ============================================================================
// Created by the Council of Minds (2125)
// A self-evolving AI research system that never forgets and learns from mistakes

// Prometheus State - Main system state tracking
export const prometheusState = pgTable("prometheus_state", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  childId: integer("child_id").references(() => children.id),
  status: varchar("status", { length: 50 }).default("initializing"), // initializing, active, consolidating, sleeping, error
  currentPhase: varchar("current_phase", { length: 100 }),
  totalKnowledgeNodes: integer("total_knowledge_nodes").default(0),
  totalMemoryItems: integer("total_memory_items").default(0),
  totalLearningEvents: integer("total_learning_events").default(0),
  avgConfidence: real("avg_confidence").default(50),
  predictionAccuracy: real("prediction_accuracy").default(0),
  errorRate: real("error_rate").default(0),
  lastConsolidationAt: timestamp("last_consolidation_at"),
  lastErrorAt: timestamp("last_error_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const prometheusStatusEnum = z.enum([
  "initializing",
  "active",
  "consolidating",
  "sleeping",
  "error"
]);
export type PrometheusStatus = z.infer<typeof prometheusStatusEnum>;

export const insertPrometheusStateSchema = createInsertSchema(prometheusState, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusState = z.infer<typeof insertPrometheusStateSchema>;
export type PrometheusState = typeof prometheusState.$inferSelect;

// Prometheus Memory - Multi-layer memory system
export const prometheusMemory = pgTable("prometheus_memory", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  memoryType: varchar("memory_type", { length: 50 }).notNull(), // working, episodic, semantic, procedural, meta
  priority: varchar("priority", { length: 20 }).default("medium"), // critical, high, medium, low, ephemeral
  content: text("content").notNull(),
  contentKa: text("content_ka"),
  embedding: jsonb("embedding"), // Vector embedding for semantic search
  certaintyLevel: varchar("certainty_level", { length: 20 }).default("hypothesis"), // unknown, aware, hypothesis, belief, knowledge, truth
  confidence: integer("confidence").default(50),
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  expiresAt: timestamp("expires_at"),
  sourceIds: text("source_ids").array(),
  linkedMemoryIds: integer("linked_memory_ids").array(),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_prometheus_memory_type").on(table.memoryType),
  index("idx_prometheus_memory_priority").on(table.priority),
  index("idx_prometheus_memory_prometheus_id").on(table.prometheusId),
]);

export const memoryTypeEnum = z.enum([
  "working",
  "episodic",
  "semantic",
  "procedural",
  "meta"
]);
export type MemoryType = z.infer<typeof memoryTypeEnum>;

export const memoryPriorityEnum = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "ephemeral"
]);
export type MemoryPriority = z.infer<typeof memoryPriorityEnum>;

export const certaintLevelEnum = z.enum([
  "unknown",
  "aware",
  "hypothesis",
  "belief",
  "knowledge",
  "truth"
]);
export type CertaintyLevel = z.infer<typeof certaintLevelEnum>;

export const insertPrometheusMemorySchema = createInsertSchema(prometheusMemory, {
  embedding: z.array(z.number()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusMemory = z.infer<typeof insertPrometheusMemorySchema>;
export type PrometheusMemory = typeof prometheusMemory.$inferSelect;

// Prometheus Knowledge Nodes - Concepts in the knowledge graph
export const prometheusKnowledgeNodes = pgTable("prometheus_knowledge_nodes", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  nodeType: varchar("node_type", { length: 50 }).notNull(), // concept, fact, entity, mechanism, treatment, symptom, diagnosis, research, hypothesis, principle
  label: text("label").notNull(),
  labelKa: text("label_ka"),
  description: text("description"),
  descriptionKa: text("description_ka"),
  certaintyLevel: varchar("certainty_level", { length: 20 }).default("hypothesis"),
  confidence: integer("confidence").default(50),
  evidenceCount: integer("evidence_count").default(0),
  validationCount: integer("validation_count").default(0),
  contradictionCount: integer("contradiction_count").default(0),
  lastValidatedAt: timestamp("last_validated_at"),
  sourceIds: text("source_ids").array(),
  embedding: jsonb("embedding"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_prometheus_nodes_type").on(table.nodeType),
  index("idx_prometheus_nodes_prometheus_id").on(table.prometheusId),
  index("idx_prometheus_nodes_certainty").on(table.certaintyLevel),
]);

export const knowledgeNodeTypeEnum = z.enum([
  "concept",
  "fact",
  "entity",
  "mechanism",
  "treatment",
  "symptom",
  "diagnosis",
  "research",
  "hypothesis",
  "principle"
]);
export type KnowledgeNodeType = z.infer<typeof knowledgeNodeTypeEnum>;

export const insertPrometheusKnowledgeNodeSchema = createInsertSchema(prometheusKnowledgeNodes, {
  embedding: z.array(z.number()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusKnowledgeNode = z.infer<typeof insertPrometheusKnowledgeNodeSchema>;
export type PrometheusKnowledgeNode = typeof prometheusKnowledgeNodes.$inferSelect;

// Prometheus Knowledge Edges - Relationships between nodes
export const prometheusKnowledgeEdges = pgTable("prometheus_knowledge_edges", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  sourceNodeId: integer("source_node_id").references(() => prometheusKnowledgeNodes.id),
  targetNodeId: integer("target_node_id").references(() => prometheusKnowledgeNodes.id),
  relationType: varchar("relation_type", { length: 50 }).notNull(), // causes, treats, prevents, correlates, contradicts, supports, etc.
  strength: real("strength").default(0.5), // 0-1
  confidence: integer("confidence").default(50),
  bidirectional: boolean("bidirectional").default(false),
  evidence: text("evidence").array(),
  discoveredBy: varchar("discovered_by", { length: 100 }), // Which AI or process discovered this
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_prometheus_edges_source").on(table.sourceNodeId),
  index("idx_prometheus_edges_target").on(table.targetNodeId),
  index("idx_prometheus_edges_relation").on(table.relationType),
]);

export const knowledgeRelationTypeEnum = z.enum([
  "causes",
  "treats",
  "prevents",
  "correlates",
  "contradicts",
  "supports",
  "part_of",
  "instance_of",
  "similar_to",
  "leads_to",
  "requires",
  "inhibits",
  "activates",
  "modulates"
]);
export type KnowledgeRelationType = z.infer<typeof knowledgeRelationTypeEnum>;

export const insertPrometheusKnowledgeEdgeSchema = createInsertSchema(prometheusKnowledgeEdges, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusKnowledgeEdge = z.infer<typeof insertPrometheusKnowledgeEdgeSchema>;
export type PrometheusKnowledgeEdge = typeof prometheusKnowledgeEdges.$inferSelect;

// Prometheus Errors - Error tracking for self-correction
export const prometheusErrors = pgTable("prometheus_errors", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  errorType: varchar("error_type", { length: 50 }).notNull(), // factual, inference, context, temporal, confidence, integration
  severity: varchar("severity", { length: 20 }).default("minor"), // critical, major, minor, cosmetic
  description: text("description").notNull(),
  prediction: text("prediction"),
  actualOutcome: text("actual_outcome"),
  rootCause: text("root_cause"),
  correction: text("correction"),
  preventionStrategy: text("prevention_strategy"),
  affectedMemoryIds: integer("affected_memory_ids").array(),
  affectedNodeIds: integer("affected_node_ids").array(),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_prometheus_errors_type").on(table.errorType),
  index("idx_prometheus_errors_resolved").on(table.resolved),
]);

export const errorTypeEnum = z.enum([
  "factual",
  "inference",
  "context",
  "temporal",
  "confidence",
  "integration"
]);
export type ErrorType = z.infer<typeof errorTypeEnum>;

export const errorSeverityEnum = z.enum([
  "critical",
  "major",
  "minor",
  "cosmetic"
]);
export type ErrorSeverity = z.infer<typeof errorSeverityEnum>;

export const insertPrometheusErrorSchema = createInsertSchema(prometheusErrors, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusError = z.infer<typeof insertPrometheusErrorSchema>;
export type PrometheusError = typeof prometheusErrors.$inferSelect;

// Prometheus Learning Events - Track all learning moments
export const prometheusLearningEvents = pgTable("prometheus_learning_events", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  eventType: varchar("event_type", { length: 50 }).notNull(), // prediction_success, prediction_failure, new_information, contradiction, validation, error_correction, knowledge_synthesis, pattern_recognition
  description: text("description").notNull(),
  impact: real("impact").default(0), // -1 to 1
  affectedNodeIds: integer("affected_node_ids").array(),
  affectedMemoryIds: integer("affected_memory_ids").array(),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  lessonsLearned: text("lessons_learned").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_prometheus_learning_type").on(table.eventType),
  index("idx_prometheus_learning_impact").on(table.impact),
]);

export const learningEventTypeEnum = z.enum([
  "prediction_success",
  "prediction_failure",
  "new_information",
  "contradiction",
  "validation",
  "error_correction",
  "knowledge_synthesis",
  "pattern_recognition"
]);
export type LearningEventType = z.infer<typeof learningEventTypeEnum>;

export const insertPrometheusLearningEventSchema = createInsertSchema(prometheusLearningEvents, {
  beforeState: z.record(z.any()).nullable().optional(),
  afterState: z.record(z.any()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusLearningEvent = z.infer<typeof insertPrometheusLearningEventSchema>;
export type PrometheusLearningEvent = typeof prometheusLearningEvents.$inferSelect;

// Prometheus Consolidation Cycles - Dream cycle tracking
export const prometheusConsolidationCycles = pgTable("prometheus_consolidation_cycles", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  phase: varchar("phase", { length: 50 }).notNull(), // collection, evaluation, integration, compression, reorganization, pruning
  status: varchar("status", { length: 20 }).default("pending"), // pending, running, completed, failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  memoriesProcessed: integer("memories_processed").default(0),
  memoriesConsolidated: integer("memories_consolidated").default(0),
  memoriesPruned: integer("memories_pruned").default(0),
  nodesCreated: integer("nodes_created").default(0),
  nodesUpdated: integer("nodes_updated").default(0),
  edgesCreated: integer("edges_created").default(0),
  errors: text("errors").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const consolidationPhaseEnum = z.enum([
  "collection",
  "evaluation",
  "integration",
  "compression",
  "reorganization",
  "pruning"
]);
export type ConsolidationPhase = z.infer<typeof consolidationPhaseEnum>;

export const insertPrometheusConsolidationCycleSchema = createInsertSchema(prometheusConsolidationCycles, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusConsolidationCycle = z.infer<typeof insertPrometheusConsolidationCycleSchema>;
export type PrometheusConsolidationCycle = typeof prometheusConsolidationCycles.$inferSelect;

// Prometheus Verifications - Truth verification results
export const prometheusVerifications = pgTable("prometheus_verifications", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  targetNodeId: integer("target_node_id").references(() => prometheusKnowledgeNodes.id),
  method: varchar("method", { length: 50 }).notNull(), // source_triangulation, temporal_consistency, predictive_power, falsifiability_check, coherence_test
  passed: boolean("passed").notNull(),
  confidence: integer("confidence").default(50),
  evidence: text("evidence").array(),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  verifiedAt: timestamp("verified_at").defaultNow(),
});

export const verificationMethodEnum = z.enum([
  "source_triangulation",
  "temporal_consistency",
  "predictive_power",
  "falsifiability_check",
  "coherence_test"
]);
export type VerificationMethod = z.infer<typeof verificationMethodEnum>;

export const insertPrometheusVerificationSchema = createInsertSchema(prometheusVerifications, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  verifiedAt: true,
});

export type InsertPrometheusVerification = z.infer<typeof insertPrometheusVerificationSchema>;
export type PrometheusVerification = typeof prometheusVerifications.$inferSelect;

// Prometheus Expert Debates - AI council debates
export const prometheusExpertDebates = pgTable("prometheus_expert_debates", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  topic: text("topic").notNull(),
  topicKa: text("topic_ka"),
  participants: text("participants").array(), // AI expert IDs
  positions: jsonb("positions"), // Array of positions with expertId, position, confidence, evidence
  consensus: text("consensus"),
  consensusKa: text("consensus_ka"),
  consensusConfidence: integer("consensus_confidence"),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  relatedNodeIds: integer("related_node_ids").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusExpertDebateSchema = createInsertSchema(prometheusExpertDebates, {
  positions: z.array(z.object({
    expertId: z.string(),
    position: z.string(),
    confidence: z.number(),
    evidence: z.array(z.string())
  })).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusExpertDebate = z.infer<typeof insertPrometheusExpertDebateSchema>;
export type PrometheusExpertDebate = typeof prometheusExpertDebates.$inferSelect;

// Prometheus Notifications - Important discovery alerts
export const prometheusNotifications = pgTable("prometheus_notifications", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  userId: varchar("user_id", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // breakthrough_discovery, new_treatment_option, clinical_trial_match, prediction_validation, knowledge_milestone, verification_complete, system_alert, weekly_digest
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // critical, high, medium, low
  title: text("title").notNull(),
  titleKa: text("title_ka"),
  message: text("message").notNull(),
  messageKa: text("message_ka"),
  metadata: jsonb("metadata"),
  actionUrl: varchar("action_url", { length: 500 }),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationCategoryEnum = z.enum([
  "breakthrough_discovery",
  "new_treatment_option",
  "clinical_trial_match",
  "prediction_validation",
  "knowledge_milestone",
  "verification_complete",
  "system_alert",
  "weekly_digest"
]);
export type NotificationCategory = z.infer<typeof notificationCategoryEnum>;

export const notificationPriorityEnum = z.enum([
  "critical",
  "high",
  "medium",
  "low"
]);
export type NotificationPriority = z.infer<typeof notificationPriorityEnum>;

export const insertPrometheusNotificationSchema = createInsertSchema(prometheusNotifications, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertPrometheusNotification = z.infer<typeof insertPrometheusNotificationSchema>;
export type PrometheusNotification = typeof prometheusNotifications.$inferSelect;

// ============================================================================
// PROMETHEUS Phase 3: Collaborative Knowledge Tables
// ============================================================================

// Expert Credentials - Verified expert profiles
export const prometheusExpertCredentials = pgTable("prometheus_expert_credentials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  fullNameKa: varchar("full_name_ka", { length: 255 }),
  title: varchar("title", { length: 100 }), // Dr., Prof., etc.
  specialization: varchar("specialization", { length: 100 }).notNull(), // neurology, genetics, etc.
  institution: varchar("institution", { length: 255 }),
  institutionKa: varchar("institution_ka", { length: 255 }),
  country: varchar("country", { length: 100 }),
  credentials: jsonb("credentials"), // degrees, certifications
  verificationStatus: varchar("verification_status", { length: 50 }).default("pending"), // pending, verified, rejected
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 255 }),
  expertiseAreas: text("expertise_areas").array(), // HIE, seizures, etc.
  publicationsCount: integer("publications_count").default(0),
  reviewCount: integer("review_count").default(0),
  trustScore: real("trust_score").default(0.5), // 0-1 score based on review quality
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusExpertCredentialSchema = createInsertSchema(prometheusExpertCredentials, {
  credentials: z.record(z.any()).nullable().optional(),
  expertiseAreas: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusExpertCredential = z.infer<typeof insertPrometheusExpertCredentialSchema>;
export type PrometheusExpertCredential = typeof prometheusExpertCredentials.$inferSelect;

// Expert Reviews - Human expert verification of findings
export const prometheusExpertReviews = pgTable("prometheus_expert_reviews", {
  id: serial("id").primaryKey(),
  expertId: integer("expert_id").references(() => prometheusExpertCredentials.id),
  targetType: varchar("target_type", { length: 50 }).notNull(), // memory, knowledge_node, prediction, insight
  targetId: integer("target_id").notNull(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  reviewType: varchar("review_type", { length: 50 }).notNull(), // verification, correction, enhancement, rejection
  verdict: varchar("verdict", { length: 50 }).notNull(), // verified, partially_verified, needs_revision, rejected
  confidenceAdjustment: real("confidence_adjustment"), // -1 to +1 adjustment to apply
  originalContent: text("original_content"),
  suggestedContent: text("suggested_content"),
  suggestedContentKa: text("suggested_content_ka"),
  reasoning: text("reasoning").notNull(),
  reasoningKa: text("reasoning_ka"),
  evidenceLinks: text("evidence_links").array(),
  clinicalRelevance: varchar("clinical_relevance", { length: 50 }), // high, medium, low, none
  safetyImplications: varchar("safety_implications", { length: 50 }), // critical, important, minor, none
  isApplied: boolean("is_applied").default(false),
  appliedAt: timestamp("applied_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusExpertReviewSchema = createInsertSchema(prometheusExpertReviews, {
  evidenceLinks: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusExpertReview = z.infer<typeof insertPrometheusExpertReviewSchema>;
export type PrometheusExpertReview = typeof prometheusExpertReviews.$inferSelect;

// Shared Knowledge - Anonymized knowledge for community sharing
export const prometheusSharedKnowledge = pgTable("prometheus_shared_knowledge", {
  id: serial("id").primaryKey(),
  sourcePrometheusId: integer("source_prometheus_id").references(() => prometheusState.id),
  knowledgeType: varchar("knowledge_type", { length: 50 }).notNull(), // treatment_insight, research_finding, pattern, protocol
  category: varchar("category", { length: 100 }).notNull(), // HIE, seizures, therapy, etc.
  title: text("title").notNull(),
  titleKa: text("title_ka"),
  content: text("content").notNull(),
  contentKa: text("content_ka"),
  anonymizedContext: text("anonymized_context"), // Stripped of identifying info
  confidenceLevel: real("confidence_level").notNull(),
  verificationStatus: varchar("verification_status", { length: 50 }).default("unverified"), // unverified, community_verified, expert_verified
  expertVerificationCount: integer("expert_verification_count").default(0),
  communityVoteScore: integer("community_vote_score").default(0),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  viewCount: integer("view_count").default(0),
  citationCount: integer("citation_count").default(0),
  sourceReferences: text("source_references").array(),
  tags: text("tags").array(),
  applicableConditions: text("applicable_conditions").array(), // HIE, cerebral palsy, etc.
  ageRangeMin: integer("age_range_min"), // In months
  ageRangeMax: integer("age_range_max"),
  isPublic: boolean("is_public").default(false),
  publishedAt: timestamp("published_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusSharedKnowledgeSchema = createInsertSchema(prometheusSharedKnowledge, {
  sourceReferences: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  applicableConditions: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusSharedKnowledge = z.infer<typeof insertPrometheusSharedKnowledgeSchema>;
export type PrometheusSharedKnowledge = typeof prometheusSharedKnowledge.$inferSelect;

// Knowledge Contributions - User contributions to shared knowledge
export const prometheusKnowledgeContributions = pgTable("prometheus_knowledge_contributions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  sharedKnowledgeId: integer("shared_knowledge_id").references(() => prometheusSharedKnowledge.id),
  contributionType: varchar("contribution_type", { length: 50 }).notNull(), // original, enhancement, correction, translation
  content: text("content").notNull(),
  contentKa: text("content_ka"),
  language: varchar("language", { length: 10 }).default("en"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by").references(() => prometheusExpertCredentials.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusKnowledgeContributionSchema = createInsertSchema(prometheusKnowledgeContributions, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusKnowledgeContribution = z.infer<typeof insertPrometheusKnowledgeContributionSchema>;
export type PrometheusKnowledgeContribution = typeof prometheusKnowledgeContributions.$inferSelect;

// Knowledge Votes - Community voting on shared knowledge
export const prometheusKnowledgeVotes = pgTable("prometheus_knowledge_votes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  sharedKnowledgeId: integer("shared_knowledge_id").references(() => prometheusSharedKnowledge.id).notNull(),
  voteType: varchar("vote_type", { length: 20 }).notNull(), // upvote, downvote
  reason: varchar("reason", { length: 100 }), // helpful, accurate, outdated, incorrect
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusKnowledgeVoteSchema = createInsertSchema(prometheusKnowledgeVotes, {}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusKnowledgeVote = z.infer<typeof insertPrometheusKnowledgeVoteSchema>;
export type PrometheusKnowledgeVote = typeof prometheusKnowledgeVotes.$inferSelect;

// Translations - Multi-language support for knowledge
export const prometheusTranslations = pgTable("prometheus_translations", {
  id: serial("id").primaryKey(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // memory, knowledge_node, shared_knowledge, insight
  sourceId: integer("source_id").notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull().default("en"),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  originalText: text("original_text").notNull(),
  translatedText: text("translated_text").notNull(),
  translationMethod: varchar("translation_method", { length: 50 }).notNull(), // ai_auto, human, human_verified
  translatedBy: varchar("translated_by", { length: 255 }), // userId or "system"
  verifiedBy: varchar("verified_by", { length: 255 }),
  verifiedAt: timestamp("verified_at"),
  qualityScore: real("quality_score"), // 0-1 translation quality
  medicalTermsVerified: boolean("medical_terms_verified").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusTranslationSchema = createInsertSchema(prometheusTranslations, {
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusTranslation = z.infer<typeof insertPrometheusTranslationSchema>;
export type PrometheusTranslation = typeof prometheusTranslations.$inferSelect;

// Clinical Integrations - External clinical system integrations
export const prometheusClinicalIntegrations = pgTable("prometheus_clinical_integrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  childId: integer("child_id").references(() => children.id),
  integrationType: varchar("integration_type", { length: 50 }).notNull(), // ehr, lab_results, imaging, pharmacy
  providerName: varchar("provider_name", { length: 255 }).notNull(),
  providerType: varchar("provider_type", { length: 100 }), // hospital, clinic, lab, pharmacy
  connectionStatus: varchar("connection_status", { length: 50 }).default("pending"), // pending, active, paused, disconnected, error
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 50 }),
  syncFrequency: varchar("sync_frequency", { length: 50 }).default("daily"), // realtime, hourly, daily, weekly, manual
  dataTypes: text("data_types").array(), // medications, diagnoses, lab_results, etc.
  encryptionKey: text("encryption_key"), // For secure data transmission
  apiEndpoint: varchar("api_endpoint", { length: 500 }),
  credentials: jsonb("credentials"), // Encrypted credentials
  consentGiven: boolean("consent_given").default(false),
  consentGivenAt: timestamp("consent_given_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusClinicalIntegrationSchema = createInsertSchema(prometheusClinicalIntegrations, {
  dataTypes: z.array(z.string()).nullable().optional(),
  credentials: z.record(z.any()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusClinicalIntegration = z.infer<typeof insertPrometheusClinicalIntegrationSchema>;
export type PrometheusClinicalIntegration = typeof prometheusClinicalIntegrations.$inferSelect;

// Clinical Data Imports - Log of imported clinical data
export const prometheusClinicalDataImports = pgTable("prometheus_clinical_data_imports", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").references(() => prometheusClinicalIntegrations.id),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  importType: varchar("import_type", { length: 50 }).notNull(), // full, incremental, manual
  dataType: varchar("data_type", { length: 100 }).notNull(), // medication, lab_result, diagnosis, etc.
  recordCount: integer("record_count").default(0),
  processedCount: integer("processed_count").default(0),
  errorCount: integer("error_count").default(0),
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorLog: text("error_log"),
  memoriesCreated: integer("memories_created").default(0),
  knowledgeNodesCreated: integer("knowledge_nodes_created").default(0),
  insights: jsonb("insights"), // AI-generated insights from imported data
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusClinicalDataImportSchema = createInsertSchema(prometheusClinicalDataImports, {
  insights: z.record(z.any()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusClinicalDataImport = z.infer<typeof insertPrometheusClinicalDataImportSchema>;
export type PrometheusClinicalDataImport = typeof prometheusClinicalDataImports.$inferSelect;

// ============================================================================
// PROMETHEUS Phase 4: Full Autonomy Tables
// ============================================================================

// Research Priorities - Self-directed research agenda
export const prometheusResearchPriorities = pgTable("prometheus_research_priorities", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  topic: text("topic").notNull(),
  topicKa: text("topic_ka"),
  description: text("description"),
  descriptionKa: text("description_ka"),
  priorityScore: real("priority_score").notNull().default(0.5), // 0-1, auto-calculated
  urgency: varchar("urgency", { length: 20 }).default("medium"), // critical, high, medium, low
  relevanceToChild: real("relevance_to_child").default(0.5), // How relevant to this child's condition
  potentialImpact: varchar("potential_impact", { length: 50 }), // breakthrough, significant, moderate, minor
  researchType: varchar("research_type", { length: 50 }).notNull(), // treatment, mechanism, prevention, symptom_management, quality_of_life
  keywords: text("keywords").array(),
  relatedConditions: text("related_conditions").array(),
  suggestedSources: text("suggested_sources").array(), // pubmed, clinicaltrials, etc.
  estimatedResearchTime: integer("estimated_research_time"), // hours
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed, paused, archived
  completedAt: timestamp("completed_at"),
  findings: text("findings"),
  findingsKa: text("findings_ka"),
  linkedHypotheses: integer("linked_hypotheses").array(), // IDs of generated hypotheses
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusResearchPrioritySchema = createInsertSchema(prometheusResearchPriorities, {
  keywords: z.array(z.string()).nullable().optional(),
  relatedConditions: z.array(z.string()).nullable().optional(),
  suggestedSources: z.array(z.string()).nullable().optional(),
  linkedHypotheses: z.array(z.number()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusResearchPriority = z.infer<typeof insertPrometheusResearchPrioritySchema>;
export type PrometheusResearchPriority = typeof prometheusResearchPriorities.$inferSelect;

// Hypotheses - Auto-generated research hypotheses
export const prometheusHypotheses = pgTable("prometheus_hypotheses", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  title: text("title").notNull(),
  titleKa: text("title_ka"),
  hypothesis: text("hypothesis").notNull(),
  hypothesisKa: text("hypothesis_ka"),
  rationale: text("rationale").notNull(), // Why this hypothesis was generated
  rationaleKa: text("rationale_ka"),
  hypothesisType: varchar("hypothesis_type", { length: 50 }).notNull(), // treatment_effect, causal, correlational, mechanistic, predictive
  confidence: real("confidence").notNull().default(0.5),
  noveltyScore: real("novelty_score").default(0.5), // How new/unique is this hypothesis
  testability: varchar("testability", { length: 50 }), // easily_testable, requires_study, theoretical
  supportingEvidence: jsonb("supporting_evidence"), // Array of evidence items
  contradictingEvidence: jsonb("contradicting_evidence"),
  relatedMemories: integer("related_memories").array(),
  relatedNodes: integer("related_nodes").array(),
  status: varchar("status", { length: 50 }).default("generated"), // generated, under_review, validated, invalidated, testing
  validationStatus: varchar("validation_status", { length: 50 }), // pending, supported, partially_supported, refuted
  validationNotes: text("validation_notes"),
  expertReviewId: integer("expert_review_id"),
  parentHypothesisId: integer("parent_hypothesis_id"), // If refined from another hypothesis
  childHypotheses: integer("child_hypotheses").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusHypothesisSchema = createInsertSchema(prometheusHypotheses, {
  supportingEvidence: z.array(z.object({
    source: z.string(),
    content: z.string(),
    strength: z.number(),
  })).nullable().optional(),
  contradictingEvidence: z.array(z.object({
    source: z.string(),
    content: z.string(),
    strength: z.number(),
  })).nullable().optional(),
  relatedMemories: z.array(z.number()).nullable().optional(),
  relatedNodes: z.array(z.number()).nullable().optional(),
  childHypotheses: z.array(z.number()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusHypothesis = z.infer<typeof insertPrometheusHypothesisSchema>;
export type PrometheusHypothesis = typeof prometheusHypotheses.$inferSelect;

// Treatment Recommendations - AI-generated treatment suggestions
export const prometheusTreatmentRecommendations = pgTable("prometheus_treatment_recommendations", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  childId: integer("child_id").references(() => children.id),
  treatmentName: text("treatment_name").notNull(),
  treatmentNameKa: text("treatment_name_ka"),
  treatmentType: varchar("treatment_type", { length: 50 }).notNull(), // therapy, medication, intervention, lifestyle, supplement, device
  description: text("description").notNull(),
  descriptionKa: text("description_ka"),
  rationale: text("rationale").notNull(), // Why this is recommended
  rationaleKa: text("rationale_ka"),
  expectedBenefits: text("expected_benefits").array(),
  expectedBenefitsKa: text("expected_benefits_ka").array(),
  potentialRisks: text("potential_risks").array(),
  potentialRisksKa: text("potential_risks_ka").array(),
  confidenceScore: real("confidence_score").notNull().default(0.5),
  evidenceLevel: varchar("evidence_level", { length: 50 }), // strong, moderate, limited, theoretical, anecdotal
  evidenceSources: jsonb("evidence_sources"), // Array of sources with links
  applicabilityScore: real("applicability_score").default(0.5), // How applicable to this specific child
  urgency: varchar("urgency", { length: 20 }).default("medium"),
  timeframe: varchar("timeframe", { length: 50 }), // immediate, short_term, long_term, ongoing
  prerequisites: text("prerequisites").array(), // What needs to happen first
  contraindications: text("contraindications").array(),
  interactionWarnings: text("interaction_warnings").array(), // Drug/therapy interactions
  costEstimate: varchar("cost_estimate", { length: 50 }), // low, moderate, high, very_high
  availability: varchar("availability", { length: 50 }), // widely_available, specialized, experimental, research_only
  status: varchar("status", { length: 50 }).default("suggested"), // suggested, under_review, approved, rejected, implemented, completed
  reviewedBy: varchar("reviewed_by", { length: 255 }), // User or expert who reviewed
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  implementedAt: timestamp("implemented_at"),
  outcomeTrackingId: integer("outcome_tracking_id"),
  relatedHypotheses: integer("related_hypotheses").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusTreatmentRecommendationSchema = createInsertSchema(prometheusTreatmentRecommendations, {
  expectedBenefits: z.array(z.string()).nullable().optional(),
  expectedBenefitsKa: z.array(z.string()).nullable().optional(),
  potentialRisks: z.array(z.string()).nullable().optional(),
  potentialRisksKa: z.array(z.string()).nullable().optional(),
  evidenceSources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    type: z.string(),
    reliability: z.number(),
  })).nullable().optional(),
  prerequisites: z.array(z.string()).nullable().optional(),
  contraindications: z.array(z.string()).nullable().optional(),
  interactionWarnings: z.array(z.string()).nullable().optional(),
  relatedHypotheses: z.array(z.number()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusTreatmentRecommendation = z.infer<typeof insertPrometheusTreatmentRecommendationSchema>;
export type PrometheusTreatmentRecommendation = typeof prometheusTreatmentRecommendations.$inferSelect;

// Outcome Tracking - Track results of recommendations
export const prometheusOutcomeTracking = pgTable("prometheus_outcome_tracking", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  childId: integer("child_id").references(() => children.id),
  recommendationId: integer("recommendation_id").references(() => prometheusTreatmentRecommendations.id),
  trackingType: varchar("tracking_type", { length: 50 }).notNull(), // treatment, therapy, medication, milestone, symptom
  targetOutcome: text("target_outcome").notNull(),
  targetOutcomeKa: text("target_outcome_ka"),
  baselineValue: text("baseline_value"), // Starting point measurement
  targetValue: text("target_value"), // Goal to achieve
  currentValue: text("current_value"), // Latest measurement
  measurementUnit: varchar("measurement_unit", { length: 50 }),
  measurementMethod: varchar("measurement_method", { length: 100 }), // How outcome is measured
  frequency: varchar("frequency", { length: 50 }).default("weekly"), // daily, weekly, monthly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 50 }).default("active"), // active, paused, completed, discontinued
  overallProgress: varchar("overall_progress", { length: 50 }), // significant_improvement, moderate_improvement, minimal_change, decline
  progressScore: real("progress_score"), // -1 to 1 (negative = decline)
  sideEffects: text("side_effects").array(),
  adjustmentsMade: jsonb("adjustments_made"), // History of changes
  notes: text("notes"),
  notesKa: text("notes_ka"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrometheusOutcomeTrackingSchema = createInsertSchema(prometheusOutcomeTracking, {
  sideEffects: z.array(z.string()).nullable().optional(),
  adjustmentsMade: z.array(z.object({
    date: z.string(),
    change: z.string(),
    reason: z.string(),
  })).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrometheusOutcomeTracking = z.infer<typeof insertPrometheusOutcomeTrackingSchema>;
export type PrometheusOutcomeTracking = typeof prometheusOutcomeTracking.$inferSelect;

// Outcome Measurements - Individual measurement records
export const prometheusOutcomeMeasurements = pgTable("prometheus_outcome_measurements", {
  id: serial("id").primaryKey(),
  trackingId: integer("tracking_id").references(() => prometheusOutcomeTracking.id).notNull(),
  value: text("value").notNull(),
  numericValue: real("numeric_value"), // If applicable
  measurementDate: timestamp("measurement_date").notNull(),
  measuredBy: varchar("measured_by", { length: 255 }), // parent, therapist, doctor, self
  context: text("context"), // Any relevant context
  attachments: text("attachments").array(), // Links to files/images
  verified: boolean("verified").default(false),
  verifiedBy: varchar("verified_by", { length: 255 }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusOutcomeMeasurementSchema = createInsertSchema(prometheusOutcomeMeasurements, {
  attachments: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusOutcomeMeasurement = z.infer<typeof insertPrometheusOutcomeMeasurementSchema>;
export type PrometheusOutcomeMeasurement = typeof prometheusOutcomeMeasurements.$inferSelect;

// Feedback Loops - Learning from outcomes
export const prometheusFeedbackLoops = pgTable("prometheus_feedback_loops", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // outcome, hypothesis, recommendation, prediction
  sourceId: integer("source_id").notNull(),
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(), // validation, correction, reinforcement, contradiction
  originalPrediction: text("original_prediction"),
  actualOutcome: text("actual_outcome"),
  accuracy: real("accuracy"), // 0-1 how accurate was the prediction
  lesson: text("lesson").notNull(), // What was learned
  lessonKa: text("lesson_ka"),
  confidenceAdjustment: real("confidence_adjustment"), // How to adjust related confidence scores
  affectedMemories: integer("affected_memories").array(),
  affectedNodes: integer("affected_nodes").array(),
  affectedHypotheses: integer("affected_hypotheses").array(),
  actionTaken: varchar("action_taken", { length: 100 }), // updated_confidence, revised_hypothesis, new_insight, no_action
  appliedAt: timestamp("applied_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusFeedbackLoopSchema = createInsertSchema(prometheusFeedbackLoops, {
  affectedMemories: z.array(z.number()).nullable().optional(),
  affectedNodes: z.array(z.number()).nullable().optional(),
  affectedHypotheses: z.array(z.number()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusFeedbackLoop = z.infer<typeof insertPrometheusFeedbackLoopSchema>;
export type PrometheusFeedbackLoop = typeof prometheusFeedbackLoops.$inferSelect;

// Autonomous Actions Log - Track what Prometheus does autonomously
export const prometheusAutonomousActions = pgTable("prometheus_autonomous_actions", {
  id: serial("id").primaryKey(),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  actionType: varchar("action_type", { length: 50 }).notNull(), // research_initiated, hypothesis_generated, recommendation_created, confidence_updated, alert_sent
  description: text("description").notNull(),
  descriptionKa: text("description_ka"),
  triggerReason: text("trigger_reason"), // What triggered this action
  inputData: jsonb("input_data"), // What data was used
  outputData: jsonb("output_data"), // What was produced
  confidence: real("confidence"),
  requiresReview: boolean("requires_review").default(false),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewOutcome: varchar("review_outcome", { length: 50 }), // approved, modified, rejected
  impactAssessment: varchar("impact_assessment", { length: 50 }), // high, medium, low
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusAutonomousActionSchema = createInsertSchema(prometheusAutonomousActions, {
  inputData: z.record(z.any()).nullable().optional(),
  outputData: z.record(z.any()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusAutonomousAction = z.infer<typeof insertPrometheusAutonomousActionSchema>;
export type PrometheusAutonomousAction = typeof prometheusAutonomousActions.$inferSelect;

// Phase 4: Predictions table for tracking and validating predictions
export const prometheusPredictions = pgTable("prometheus_predictions", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull().references(() => children.id),
  prometheusId: integer("prometheus_id").references(() => prometheusState.id),
  predictionType: varchar("prediction_type", { length: 50 }).notNull(), // treatment_outcome, symptom_progression, intervention_success
  prediction: jsonb("prediction").notNull(),
  predictionKa: jsonb("prediction_ka"),
  confidence: real("confidence").default(0.5),
  predictionDate: timestamp("prediction_date").notNull(), // When the prediction should be evaluated
  status: varchar("status", { length: 50 }).default("active"), // active, validated, invalidated
  actualOutcome: text("actual_outcome"),
  wasAccurate: boolean("was_accurate"),
  validatedAt: timestamp("validated_at"),
  relatedHypothesisId: integer("related_hypothesis_id").references(() => prometheusHypotheses.id),
  relatedRecommendationId: integer("related_recommendation_id").references(() => prometheusTreatmentRecommendations.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrometheusPredictionSchema = createInsertSchema(prometheusPredictions, {
  prediction: z.record(z.any()).optional(),
  predictionKa: z.record(z.any()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPrometheusPrediction = z.infer<typeof insertPrometheusPredictionSchema>;
export type PrometheusPrediction = typeof prometheusPredictions.$inferSelect;

// ============================================================================
// TRIAL NAVIGATOR - Clinical Trial Search Platform
// ============================================================================

// Supported Languages
export const languages = pgTable("languages", {
  code: varchar("code", { length: 10 }).primaryKey(), // 'ka', 'hy', 'az', 'en'
  nameNative: varchar("name_native", { length: 100 }).notNull(), // 'ქართული'
  nameEnglish: varchar("name_english", { length: 100 }).notNull(), // 'Georgian'
  direction: varchar("direction", { length: 3 }).default("ltr"), // 'ltr' or 'rtl'
  tier: integer("tier").default(2), // 1=pre-cached, 2=on-demand
  isActive: boolean("is_active").default(true),
  speakersMillions: real("speakers_millions"),
  diasporaMillions: real("diaspora_millions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  createdAt: true,
});
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type Language = typeof languages.$inferSelect;

// Clinical Trials (aggregated from multiple sources)
export const clinicalTrials = pgTable("clinical_trials", {
  id: serial("id").primaryKey(),
  // Primary identifiers
  nctNumber: varchar("nct_number", { length: 20 }).unique(), // NCT12345678
  eudraCTNumber: varchar("eudract_number", { length: 30 }), // 2023-001234-12
  whoId: varchar("who_id", { length: 50 }), // WHO ICTRP ID
  isrctnNumber: varchar("isrctn_number", { length: 30 }), // ISRCTN12345678
  
  // Core trial info
  titleEn: text("title_en").notNull(),
  briefSummaryEn: text("brief_summary_en"),
  detailedDescriptionEn: text("detailed_description_en"),
  
  // Status and phase
  status: varchar("status", { length: 50 }), // Recruiting, Active, Completed, etc.
  phase: varchar("phase", { length: 20 }), // Phase I, II, III, IV
  studyType: varchar("study_type", { length: 50 }), // Interventional, Observational
  
  // Eligibility
  eligibilityCriteriaEn: text("eligibility_criteria_en"),
  minAge: varchar("min_age", { length: 20 }),
  maxAge: varchar("max_age", { length: 20 }),
  gender: varchar("gender", { length: 20 }), // All, Male, Female
  healthyVolunteers: boolean("healthy_volunteers").default(false),
  
  // Conditions and interventions (JSON arrays)
  conditions: jsonb("conditions").$type<string[]>(), // ['HIE', 'Neonatal Encephalopathy']
  interventions: jsonb("interventions").$type<{type: string, name: string}[]>(),
  
  // Locations
  locations: jsonb("locations").$type<{
    facility: string;
    city: string;
    country: string;
    countryCode: string;
    status?: string;
  }[]>(),
  
  // Contacts
  contacts: jsonb("contacts").$type<{
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  }[]>(),
  
  // Sponsor
  sponsorName: varchar("sponsor_name", { length: 255 }),
  sponsorType: varchar("sponsor_type", { length: 50 }), // Industry, NIH, Other
  
  // Dates
  startDate: date("start_date"),
  completionDate: date("completion_date"),
  lastUpdateDate: timestamp("last_update_date"),
  
  // Aggregation metadata
  sources: jsonb("sources").$type<string[]>(), // ['clinicaltrials.gov', 'eu_ctr']
  relevanceScore: real("relevance_score"), // AI-calculated 0-100
  qualityScore: real("quality_score"), // Data completeness score
  
  // Soft delete support
  deletedAt: timestamp("deleted_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_trials_nct").on(table.nctNumber),
  index("idx_trials_status").on(table.status),
  index("idx_trials_phase").on(table.phase),
  index("idx_trials_conditions").using("gin", table.conditions),
]);

export const insertClinicalTrialSchema = createInsertSchema(clinicalTrials, {
  conditions: z.array(z.string()).nullable().optional(),
  interventions: z.array(z.object({ type: z.string(), name: z.string() })).nullable().optional(),
  locations: z.array(z.object({
    facility: z.string(),
    city: z.string(),
    country: z.string(),
    countryCode: z.string(),
    status: z.string().optional(),
  })).nullable().optional(),
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
  })).nullable().optional(),
  sources: z.array(z.string()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClinicalTrial = z.infer<typeof insertClinicalTrialSchema>;
export type ClinicalTrial = typeof clinicalTrials.$inferSelect;

// Trial Translations Cache
export const trialTranslations = pgTable("trial_translations", {
  id: serial("id").primaryKey(),
  trialId: integer("trial_id").references(() => clinicalTrials.id).notNull(),
  languageCode: varchar("language_code", { length: 10 }).references(() => languages.code).notNull(),
  
  // Translated fields
  titleTranslated: text("title_translated"),
  summaryTranslated: text("summary_translated"),
  eligibilityTranslated: text("eligibility_translated"),
  
  // AI-generated simplified summary (plain language)
  simplifiedSummary: text("simplified_summary"),
  
  // Translation metadata
  translationQuality: real("translation_quality"), // 0.00-1.00
  humanReviewed: boolean("human_reviewed").default(false),
  translatedAt: timestamp("translated_at").defaultNow(),
  translatedBy: varchar("translated_by", { length: 50 }).default("ai"), // 'ai', 'human', 'community'
}, (table) => [
  index("idx_translations_trial_lang").on(table.trialId, table.languageCode),
]);

export const insertTrialTranslationSchema = createInsertSchema(trialTranslations).omit({
  id: true,
  translatedAt: true,
});
export type InsertTrialTranslation = z.infer<typeof insertTrialTranslationSchema>;
export type TrialTranslation = typeof trialTranslations.$inferSelect;

// Medical Glossary (multilingual medical terms)
export const medicalGlossary = pgTable("medical_glossary", {
  id: serial("id").primaryKey(),
  termEnglish: varchar("term_english", { length: 255 }).notNull(),
  languageCode: varchar("language_code", { length: 10 }).references(() => languages.code).notNull(),
  termTranslated: varchar("term_translated", { length: 255 }).notNull(),
  definitionTranslated: text("definition_translated"),
  category: varchar("category", { length: 50 }), // 'disease', 'treatment', 'anatomy', 'procedure'
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_glossary_term_lang").on(table.termEnglish, table.languageCode),
]);

export const insertMedicalGlossarySchema = createInsertSchema(medicalGlossary).omit({
  id: true,
  createdAt: true,
});
export type InsertMedicalGlossary = z.infer<typeof insertMedicalGlossarySchema>;
export type MedicalGlossary = typeof medicalGlossary.$inferSelect;

// User Saved Trials
export const userSavedTrials = pgTable("user_saved_trials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trialId: integer("trial_id").references(() => clinicalTrials.id).notNull(),
  notes: text("notes"),
  notificationEnabled: boolean("notification_enabled").default(true),
  savedAt: timestamp("saved_at").defaultNow(),
}, (table) => [
  index("idx_saved_trials_user").on(table.userId),
]);

export const insertUserSavedTrialSchema = createInsertSchema(userSavedTrials).omit({
  id: true,
  savedAt: true,
});
export type InsertUserSavedTrial = z.infer<typeof insertUserSavedTrialSchema>;
export type UserSavedTrial = typeof userSavedTrials.$inferSelect;

// Trial Search History
export const trialSearchHistory = pgTable("trial_search_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  searchQuery: text("search_query").notNull(),
  filters: jsonb("filters").$type<{
    conditions?: string[];
    locations?: string[];
    phase?: string[];
    status?: string[];
    ageRange?: { min?: string; max?: string };
  }>(),
  resultsCount: integer("results_count"),
  languageCode: varchar("language_code", { length: 10 }).default("ka"),
  searchedAt: timestamp("searched_at").defaultNow(),
});

export const insertTrialSearchHistorySchema = createInsertSchema(trialSearchHistory, {
  filters: z.object({
    conditions: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    phase: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
    ageRange: z.object({ min: z.string().optional(), max: z.string().optional() }).optional(),
  }).nullable().optional(),
}).omit({
  id: true,
  searchedAt: true,
});
export type InsertTrialSearchHistory = z.infer<typeof insertTrialSearchHistorySchema>;
export type TrialSearchHistory = typeof trialSearchHistory.$inferSelect;

// Data Source Status (track registry sync status)
export const dataSourceStatus = pgTable("data_source_status", {
  id: serial("id").primaryKey(),
  sourceName: varchar("source_name", { length: 50 }).unique().notNull(), // 'clinicaltrials_gov', 'eu_ctr', etc.
  sourceDisplayName: varchar("source_display_name", { length: 100 }),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 20 }), // 'success', 'failed', 'partial'
  recordsCount: integer("records_count").default(0),
  errorMessage: text("error_message"),
  isActive: boolean("is_active").default(true),
  syncIntervalHours: integer("sync_interval_hours").default(24),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDataSourceStatusSchema = createInsertSchema(dataSourceStatus).omit({
  id: true,
  createdAt: true,
});
export type InsertDataSourceStatus = z.infer<typeof insertDataSourceStatusSchema>;
export type DataSourceStatus = typeof dataSourceStatus.$inferSelect;
