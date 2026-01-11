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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

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
