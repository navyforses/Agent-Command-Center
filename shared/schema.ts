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

// Children table
export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  diagnosis: text("diagnosis"),
  diagnosisDate: date("diagnosis_date"),
  notes: text("notes"),
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
  queryId: integer("query_id").references(() => nexusResearchQueries.id),
  title: text("title").notNull(),
  summary: text("summary"),
  consensusLevel: varchar("consensus_level", { length: 10 }),
  confidenceScore: integer("confidence_score"),
  relevanceScore: integer("relevance_score"),
  sources: jsonb("sources"),
  hypothesesGenerated: text("hypotheses_generated").array(),
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

// Hypotheses table - generated research hypotheses
export const nexusHypotheses = pgTable("nexus_hypotheses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  hypothesisCode: varchar("hypothesis_code", { length: 20 }).unique(),
  statement: text("statement").notNull(),
  status: varchar("status", { length: 50 }).default("nascent"),
  confidenceScore: integer("confidence_score"),
  proposedBy: varchar("proposed_by", { length: 50 }),
  supportedBy: text("supported_by").array(),
  supportingEvidence: jsonb("supporting_evidence"),
  contradictingEvidence: jsonb("contradicting_evidence"),
  crossDisciplinaryBasis: jsonb("cross_disciplinary_basis"),
  testability: text("testability"),
  actionItems: jsonb("action_items"),
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
