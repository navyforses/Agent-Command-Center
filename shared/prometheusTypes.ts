/**
 * PROMETHEUS-MIND Type Definitions
 * ================================
 * Living Cognitive Entity - A self-evolving AI research system
 *
 * Created by the Council of Minds (2125):
 * - Dr. Aria Zhang-Nakamura (Chief Cognitive Architect)
 * - Prof. Solomon Okonkwo (Chief Knowledge Philosopher)
 * - Dr. Elena Volkov-Petrov (Chief Memory Systems Architect)
 * - Dr. Kenji Matsumoto (Chief Self-Evolution Engineer)
 * - Dr. Amara Osei (Chief Integration Architect)
 * - Dr. Yuki Tanaka-Chen (Chief Medical Domain Expert)
 */

import { z } from "zod";

// ============================================================================
// KNOWLEDGE CERTAINTY LEVELS (Prof. Solomon Okonkwo)
// ============================================================================

export const KnowledgeCertaintyLevel = z.enum([
  "unknown",      // Level 0: "არ ვიცი რომ არ ვიცი"
  "aware",        // Level 1: "ვიცი რომ არ ვიცი"
  "hypothesis",   // Level 2: "ვფიქრობ რომ..."
  "belief",       // Level 3: "მტკიცებულებები მიუთითებს..."
  "knowledge",    // Level 4: "მრავალჯერ დადასტურდა"
  "truth"         // Level 5: "ფუნდამენტური პრინციპი"
]);
export type KnowledgeCertaintyLevel = z.infer<typeof KnowledgeCertaintyLevel>;

// ============================================================================
// MEMORY TYPES (Dr. Elena Volkov-Petrov)
// ============================================================================

export const MemoryType = z.enum([
  "working",      // მიმდინარე კონტექსტი (RAM)
  "episodic",     // კონკრეტული გამოცდილებები
  "semantic",     // ზოგადი ფაქტები და კონცეფციები
  "procedural",   // როგორ გავაკეთო - უნარები
  "meta"          // ცოდნა ცოდნის შესახებ
]);
export type MemoryType = z.infer<typeof MemoryType>;

export const MemoryPriority = z.enum([
  "critical",     // არასოდეს დაივიწყო
  "high",         // მნიშვნელოვანი
  "medium",       // საშუალო
  "low",          // დაბალი პრიორიტეტი
  "ephemeral"     // დროებითი, შეიძლება წაიშალოს
]);
export type MemoryPriority = z.infer<typeof MemoryPriority>;

export const MemoryItemSchema = z.object({
  id: z.string(),
  type: MemoryType,
  priority: MemoryPriority,
  content: z.string(),
  contentEmbedding: z.array(z.number()).optional(),
  certaintyLevel: KnowledgeCertaintyLevel,
  confidence: z.number().min(0).max(100),
  accessCount: z.number().default(0),
  lastAccessedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().optional(),
  sourceIds: z.array(z.string()).optional(),
  linkedMemoryIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});
export type MemoryItem = z.infer<typeof MemoryItemSchema>;

// ============================================================================
// ERROR TYPES (Dr. Kenji Matsumoto)
// ============================================================================

export const ErrorType = z.enum([
  "factual",       // არასწორი ინფორმაცია
  "inference",     // არასწორი დასკვნა
  "context",       // კონტექსტის გაუგებრობა
  "temporal",      // მოძველებული ინფორმაცია
  "confidence",    // გადაჭარბებული/დაკნინებული confidence
  "integration"    // ცოდნის ფრაგმენტები არ აწყობს
]);
export type ErrorType = z.infer<typeof ErrorType>;

export const ErrorSeverity = z.enum([
  "critical",      // სისტემის დამაზიანებელი
  "major",         // მნიშვნელოვანი პრობლემა
  "minor",         // მცირე პრობლემა
  "cosmetic"       // კოსმეტიკური
]);
export type ErrorSeverity = z.infer<typeof ErrorSeverity>;

export const ErrorRecordSchema = z.object({
  id: z.string(),
  type: ErrorType,
  severity: ErrorSeverity,
  description: z.string(),
  prediction: z.string().optional(),
  actualOutcome: z.string().optional(),
  rootCause: z.string().optional(),
  correction: z.string().optional(),
  preventionStrategy: z.string().optional(),
  affectedMemoryIds: z.array(z.string()).optional(),
  affectedKnowledgeIds: z.array(z.string()).optional(),
  resolved: z.boolean().default(false),
  resolvedAt: z.date().optional(),
  createdAt: z.date(),
  metadata: z.record(z.any()).optional()
});
export type ErrorRecord = z.infer<typeof ErrorRecordSchema>;

// ============================================================================
// KNOWLEDGE GRAPH TYPES (Prof. Solomon Okonkwo)
// ============================================================================

export const KnowledgeNodeType = z.enum([
  "concept",       // ზოგადი კონცეფცია
  "fact",          // კონკრეტული ფაქტი
  "entity",        // არსება (მედიკამენტი, თერაპია, etc.)
  "mechanism",     // ბიოლოგიური მექანიზმი
  "treatment",     // მკურნალობის მეთოდი
  "symptom",       // სიმპტომი
  "diagnosis",     // დიაგნოზი
  "research",      // კვლევა
  "hypothesis",    // ჰიპოთეზა
  "principle"      // ფუნდამენტური პრინციპი
]);
export type KnowledgeNodeType = z.infer<typeof KnowledgeNodeType>;

export const KnowledgeRelationType = z.enum([
  "causes",        // იწვევს
  "treats",        // მკურნალობს
  "prevents",      // თავიდან აცილებს
  "correlates",    // კორელირებს
  "contradicts",   // ეწინააღმდეგება
  "supports",      // ამყარებს
  "part_of",       // ნაწილია
  "instance_of",   // ინსტანცია
  "similar_to",    // მსგავსია
  "leads_to",      // მივყავართ
  "requires",      // მოითხოვს
  "inhibits",      // აფერხებს
  "activates",     // ააქტიურებს
  "modulates"      // მოდულირებს
]);
export type KnowledgeRelationType = z.infer<typeof KnowledgeRelationType>;

export const KnowledgeNodeSchema = z.object({
  id: z.string(),
  type: KnowledgeNodeType,
  label: z.string(),
  labelKa: z.string().optional(),
  description: z.string().optional(),
  descriptionKa: z.string().optional(),
  certaintyLevel: KnowledgeCertaintyLevel,
  confidence: z.number().min(0).max(100),
  evidenceCount: z.number().default(0),
  validationCount: z.number().default(0),
  contradictionCount: z.number().default(0),
  lastValidatedAt: z.date().optional(),
  sourceIds: z.array(z.string()).optional(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;

export const KnowledgeEdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  relationType: KnowledgeRelationType,
  strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(100),
  bidirectional: z.boolean().default(false),
  evidence: z.array(z.string()).optional(),
  discoveredBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type KnowledgeEdge = z.infer<typeof KnowledgeEdgeSchema>;

// ============================================================================
// SELF-EVOLUTION TYPES (Dr. Kenji Matsumoto)
// ============================================================================

export const LearningEventType = z.enum([
  "prediction_success",    // პროგნოზი გამართლდა
  "prediction_failure",    // პროგნოზი ჩავარდა
  "new_information",       // ახალი ინფორმაცია
  "contradiction",         // წინააღმდეგობა აღმოჩენილი
  "validation",            // ვალიდაცია
  "error_correction",      // შეცდომის შესწორება
  "knowledge_synthesis",   // ცოდნის სინთეზი
  "pattern_recognition"    // პატერნის ამოცნობა
]);
export type LearningEventType = z.infer<typeof LearningEventType>;

export const LearningEventSchema = z.object({
  id: z.string(),
  type: LearningEventType,
  description: z.string(),
  impact: z.number().min(-1).max(1), // -1: უარყოფითი, 0: ნეიტრალური, 1: დადებითი
  affectedNodeIds: z.array(z.string()).optional(),
  affectedMemoryIds: z.array(z.string()).optional(),
  beforeState: z.record(z.any()).optional(),
  afterState: z.record(z.any()).optional(),
  lessonsLearned: z.array(z.string()).optional(),
  createdAt: z.date()
});
export type LearningEvent = z.infer<typeof LearningEventSchema>;

export const EvolutionMetricsSchema = z.object({
  totalNodes: z.number(),
  totalEdges: z.number(),
  totalMemories: z.number(),
  avgConfidence: z.number(),
  predictionAccuracy: z.number(),
  errorRate: z.number(),
  learningVelocity: z.number(),
  knowledgeGrowthRate: z.number(),
  validationSuccessRate: z.number(),
  lastUpdated: z.date()
});
export type EvolutionMetrics = z.infer<typeof EvolutionMetricsSchema>;

// ============================================================================
// CONSOLIDATION CYCLE (Dr. Elena Volkov-Petrov)
// ============================================================================

export const ConsolidationPhase = z.enum([
  "collection",      // დღის ინფორმაციის აგრეგაცია
  "evaluation",      // რა არის მნიშვნელოვანი?
  "integration",     // ახლის დაკავშირება არსებულთან
  "compression",     // დეტალების აბსტრაჰირება პრინციპებად
  "reorganization",  // ცოდნის გრაფის ოპტიმიზაცია
  "pruning"          // მოძველებული/არასწორის მოშორება
]);
export type ConsolidationPhase = z.infer<typeof ConsolidationPhase>;

export const ConsolidationCycleSchema = z.object({
  id: z.string(),
  phase: ConsolidationPhase,
  status: z.enum(["pending", "running", "completed", "failed"]),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  memoriesProcessed: z.number().default(0),
  memoriesConsolidated: z.number().default(0),
  memoriesPruned: z.number().default(0),
  nodesCreated: z.number().default(0),
  nodesUpdated: z.number().default(0),
  edgesCreated: z.number().default(0),
  errors: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});
export type ConsolidationCycle = z.infer<typeof ConsolidationCycleSchema>;

// ============================================================================
// TRUTH VERIFICATION PROTOCOL (Prof. Solomon Okonkwo)
// ============================================================================

export const VerificationMethod = z.enum([
  "source_triangulation",   // მინიმუმ 3 დამოუკიდებელი წყარო
  "temporal_consistency",   // დროის თანმიმდევრულობა
  "predictive_power",       // პროგნოზირების უნარი
  "falsifiability_check",   // ფალსიფიცირებადობა
  "coherence_test"          // თანხვედრა არსებულ ცოდნასთან
]);
export type VerificationMethod = z.infer<typeof VerificationMethod>;

export const VerificationResultSchema = z.object({
  id: z.string(),
  targetNodeId: z.string(),
  method: VerificationMethod,
  passed: z.boolean(),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()).optional(),
  notes: z.string().optional(),
  verifiedAt: z.date()
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// ============================================================================
// EXPERT COUNCIL (Dr. Yuki Tanaka-Chen)
// ============================================================================

export const ExpertPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string(),
  yearsExperience: z.number(),
  focus: z.array(z.string()),
  systemPrompt: z.string(),
  aiProvider: z.enum(["openai", "anthropic", "google", "grok", "perplexity"]),
  model: z.string(),
  isActive: z.boolean().default(true)
});
export type ExpertPersona = z.infer<typeof ExpertPersonaSchema>;

export const ExpertDebateSchema = z.object({
  id: z.string(),
  topic: z.string(),
  participants: z.array(z.string()),
  positions: z.array(z.object({
    expertId: z.string(),
    position: z.string(),
    confidence: z.number(),
    evidence: z.array(z.string())
  })),
  consensus: z.string().optional(),
  consensusConfidence: z.number().optional(),
  resolved: z.boolean().default(false),
  createdAt: z.date(),
  resolvedAt: z.date().optional()
});
export type ExpertDebate = z.infer<typeof ExpertDebateSchema>;

// ============================================================================
// PROMETHEUS CORE STATE
// ============================================================================

export const PrometheusStateSchema = z.object({
  id: z.string(),
  childId: z.number(),
  status: z.enum(["initializing", "active", "consolidating", "sleeping", "error"]),
  currentPhase: z.string().optional(),
  totalKnowledgeNodes: z.number().default(0),
  totalMemoryItems: z.number().default(0),
  totalLearningEvents: z.number().default(0),
  avgConfidence: z.number().default(50),
  lastConsolidationAt: z.date().optional(),
  lastErrorAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type PrometheusState = z.infer<typeof PrometheusStateSchema>;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PrometheusQueryResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  relevantMemories: MemoryItem[];
  confidence: number;
  certaintyLevel: KnowledgeCertaintyLevel;
  sources: string[];
}

export interface PrometheusSynthesisResult {
  synthesis: string;
  synthesisKa: string;
  hypotheses: Array<{
    statement: string;
    confidence: number;
    evidence: string[];
  }>;
  newNodes: KnowledgeNode[];
  newEdges: KnowledgeEdge[];
  learningEvents: LearningEvent[];
}

export interface PrometheusValidationResult {
  isValid: boolean;
  confidence: number;
  verifications: VerificationResult[];
  contradictions: string[];
  recommendations: string[];
}
