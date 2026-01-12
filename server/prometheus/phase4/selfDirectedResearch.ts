/**
 * PROMETHEUS Phase 4: Self-Directed Research
 *
 * Autonomous research prioritization system that identifies what topics
 * to research next based on child's condition, knowledge gaps, and emerging science.
 *
 * "ცოდნის ძიება არ ელოდება ბრძანებას - ის თვითონ იპოვის გზას"
 * "The pursuit of knowledge doesn't wait for commands - it finds its own way"
 */

import { db } from "../../db";
import {
  prometheusResearchPriorities,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusState,
  prometheusAutonomousActions,
  children,
  type InsertPrometheusResearchPriority,
  type PrometheusResearchPriority,
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte, ne, isNull, or, asc } from "drizzle-orm";
import { createNotification } from "../phase2/notificationSystem";
import OpenAI from "openai";

// ============================================================================
// Types
// ============================================================================

export interface ResearchGap {
  topic: string;
  description: string;
  importance: number;
  relatedNodes: number[];
  suggestedQueries: string[];
}

export interface ResearchPriorityInput {
  topic: string;
  topicKa?: string;
  description?: string;
  descriptionKa?: string;
  researchType: "treatment" | "mechanism" | "prevention" | "symptom_management" | "quality_of_life";
  keywords?: string[];
  relatedConditions?: string[];
  urgency?: "critical" | "high" | "medium" | "low";
}

export interface ResearchAgenda {
  priorities: PrometheusResearchPriority[];
  totalTopics: number;
  criticalCount: number;
  inProgressCount: number;
  completedThisWeek: number;
  knowledgeGaps: ResearchGap[];
}

// ============================================================================
// AI Client
// ============================================================================

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ============================================================================
// Research Gap Analysis
// ============================================================================

/**
 * Analyze knowledge base to identify research gaps
 */
export async function analyzeKnowledgeGaps(
  prometheusId: number
): Promise<ResearchGap[]> {
  const gaps: ResearchGap[] = [];

  // Get all knowledge nodes
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
  });

  // Get memories
  const memories = await db.query.prometheusMemory.findMany({
    where: eq(prometheusMemory.prometheusId, prometheusId),
  });

  // Identify low-confidence important topics
  const lowConfidenceNodes = nodes.filter(
    n => (n.confidence ?? 0) < 0.5 && n.nodeType === "fact"
  );

  for (const node of lowConfidenceNodes) {
    gaps.push({
      topic: node.label,
      description: `Low confidence (${((node.confidence ?? 0) * 100).toFixed(0)}%) on this factual knowledge`,
      importance: 1 - (node.confidence ?? 0),
      relatedNodes: [node.id],
      suggestedQueries: [
        `${node.label} latest research`,
        `${node.label} clinical evidence`,
        `${node.label} systematic review`,
      ],
    });
  }

  // Identify topics with few connections (isolated knowledge)
  const edges = await db.query.prometheusKnowledgeEdges.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
  });

  const connectionCounts = new Map<number, number>();
  for (const edge of edges) {
    if (edge.sourceNodeId) {
      connectionCounts.set(edge.sourceNodeId, (connectionCounts.get(edge.sourceNodeId) || 0) + 1);
    }
    if (edge.targetNodeId) {
      connectionCounts.set(edge.targetNodeId, (connectionCounts.get(edge.targetNodeId) || 0) + 1);
    }
  }

  const isolatedNodes = nodes.filter(n => (connectionCounts.get(n.id) || 0) < 2);

  for (const node of isolatedNodes.slice(0, 5)) {
    gaps.push({
      topic: `Connections for: ${node.label}`,
      description: "This knowledge is isolated - need to find how it relates to other knowledge",
      importance: 0.6,
      relatedNodes: [node.id],
      suggestedQueries: [
        `${node.label} relationship with HIE`,
        `${node.label} mechanism of action`,
        `${node.label} combined therapies`,
      ],
    });
  }

  // Identify stale knowledge (not updated recently)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const staleMemories = memories.filter(
    m => m.updatedAt && m.updatedAt < threeMonthsAgo && m.priority === "high"
  );

  for (const memory of staleMemories.slice(0, 5)) {
    gaps.push({
      topic: `Update: ${memory.content.substring(0, 50)}...`,
      description: "This high-priority knowledge hasn't been updated in 3+ months",
      importance: 0.7,
      relatedNodes: [],
      suggestedQueries: [
        `${memory.domain || "HIE"} latest 2024 research`,
        `${memory.domain || "HIE"} new treatments`,
      ],
    });
  }

  // Sort by importance
  gaps.sort((a, b) => b.importance - a.importance);

  return gaps.slice(0, 10);
}

/**
 * Use AI to suggest research priorities based on child's profile
 */
export async function generateResearchSuggestions(
  prometheusId: number
): Promise<ResearchPriorityInput[]> {
  const openai = getOpenAIClient();
  if (!openai) return [];

  // Get Prometheus state and child info
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId),
  });

  if (!prometheus?.childId) return [];

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId),
  });

  if (!child) return [];

  // Get recent high-priority memories
  const recentMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      eq(prometheusMemory.priority, "high")
    ),
    limit: 20,
    orderBy: [desc(prometheusMemory.createdAt)],
  });

  // Get knowledge gaps
  const gaps = await analyzeKnowledgeGaps(prometheusId);

  const prompt = `You are a medical research advisor for a child with HIE (Hypoxic-Ischemic Encephalopathy).

Child Profile:
- Age: ${child.dateOfBirth ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "Unknown"} years
- Diagnosis: ${child.primaryDiagnosis || "HIE"}
- Current Therapies: ${child.currentTherapies || "Not specified"}

Recent High-Priority Knowledge:
${recentMemories.map(m => `- ${m.content.substring(0, 100)}`).join("\n")}

Knowledge Gaps Identified:
${gaps.map(g => `- ${g.topic}: ${g.description}`).join("\n")}

Based on this information, suggest 5 research priorities that would be most valuable for this child's care.
For each priority, specify:
1. Topic (short title)
2. Description (why this is important)
3. Research type (treatment, mechanism, prevention, symptom_management, quality_of_life)
4. Keywords (3-5 search terms)
5. Urgency (critical, high, medium, low)

Return as JSON array with these exact fields: topic, description, researchType, keywords, urgency`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const suggestions = parsed.priorities || parsed.suggestions || parsed;

    if (!Array.isArray(suggestions)) return [];

    return suggestions.map((s: any) => ({
      topic: s.topic,
      description: s.description,
      researchType: s.researchType || "treatment",
      keywords: s.keywords || [],
      urgency: s.urgency || "medium",
    }));
  } catch (error) {
    console.error("Error generating research suggestions:", error);
    return [];
  }
}

// ============================================================================
// Research Priority Management
// ============================================================================

/**
 * Create a new research priority
 */
export async function createResearchPriority(
  prometheusId: number,
  input: ResearchPriorityInput,
  autonomous: boolean = false
): Promise<PrometheusResearchPriority> {
  // Calculate priority score
  const urgencyScores = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.3 };
  const priorityScore = urgencyScores[input.urgency || "medium"];

  const [priority] = await db
    .insert(prometheusResearchPriorities)
    .values({
      prometheusId,
      topic: input.topic,
      topicKa: input.topicKa,
      description: input.description,
      descriptionKa: input.descriptionKa,
      priorityScore,
      urgency: input.urgency || "medium",
      researchType: input.researchType,
      keywords: input.keywords,
      relatedConditions: input.relatedConditions,
      suggestedSources: ["pubmed", "clinicaltrials", "cochrane"],
      status: "pending",
    })
    .returning();

  // Log autonomous action if applicable
  if (autonomous) {
    await db.insert(prometheusAutonomousActions).values({
      prometheusId,
      actionType: "research_initiated",
      description: `Autonomously created research priority: ${input.topic}`,
      descriptionKa: `ავტონომიურად შეიქმნა კვლევის პრიორიტეტი: ${input.topicKa || input.topic}`,
      triggerReason: "Knowledge gap analysis or pattern detection",
      outputData: { priorityId: priority.id, topic: input.topic },
      confidence: priorityScore,
      requiresReview: input.urgency !== "critical",
      impactAssessment: input.urgency === "critical" ? "high" : "medium",
    });
  }

  return priority;
}

/**
 * Get research agenda for a Prometheus instance
 */
export async function getResearchAgenda(
  prometheusId: number
): Promise<ResearchAgenda> {
  const allPriorities = await db.query.prometheusResearchPriorities.findMany({
    where: eq(prometheusResearchPriorities.prometheusId, prometheusId),
    orderBy: [desc(prometheusResearchPriorities.priorityScore)],
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const completedThisWeek = allPriorities.filter(
    p => p.status === "completed" && p.completedAt && p.completedAt >= weekAgo
  ).length;

  const gaps = await analyzeKnowledgeGaps(prometheusId);

  return {
    priorities: allPriorities.filter(p => p.status !== "archived"),
    totalTopics: allPriorities.length,
    criticalCount: allPriorities.filter(p => p.urgency === "critical").length,
    inProgressCount: allPriorities.filter(p => p.status === "in_progress").length,
    completedThisWeek,
    knowledgeGaps: gaps,
  };
}

/**
 * Update research priority status
 */
export async function updateResearchStatus(
  priorityId: number,
  status: "pending" | "in_progress" | "completed" | "paused" | "archived",
  findings?: string,
  findingsKa?: string
): Promise<PrometheusResearchPriority | null> {
  const updates: Partial<InsertPrometheusResearchPriority> & {
    status: string;
    completedAt?: Date;
    updatedAt: Date;
    findings?: string;
    findingsKa?: string;
  } = {
    status,
    updatedAt: new Date(),
  };

  if (status === "completed") {
    updates.completedAt = new Date();
    if (findings) updates.findings = findings;
    if (findingsKa) updates.findingsKa = findingsKa;
  }

  const [updated] = await db
    .update(prometheusResearchPriorities)
    .set(updates)
    .where(eq(prometheusResearchPriorities.id, priorityId))
    .returning();

  return updated || null;
}

/**
 * Get next research priority to work on
 */
export async function getNextResearchPriority(
  prometheusId: number
): Promise<PrometheusResearchPriority | null> {
  // First check for critical pending items
  const critical = await db.query.prometheusResearchPriorities.findFirst({
    where: and(
      eq(prometheusResearchPriorities.prometheusId, prometheusId),
      eq(prometheusResearchPriorities.urgency, "critical"),
      eq(prometheusResearchPriorities.status, "pending")
    ),
  });

  if (critical) return critical;

  // Then get highest priority pending item
  const next = await db.query.prometheusResearchPriorities.findFirst({
    where: and(
      eq(prometheusResearchPriorities.prometheusId, prometheusId),
      eq(prometheusResearchPriorities.status, "pending")
    ),
    orderBy: [desc(prometheusResearchPriorities.priorityScore)],
  });

  return next || null;
}

/**
 * Auto-generate research priorities based on knowledge analysis
 */
export async function autoGenerateResearchPriorities(
  prometheusId: number
): Promise<number> {
  // Get AI suggestions
  const suggestions = await generateResearchSuggestions(prometheusId);

  let created = 0;

  for (const suggestion of suggestions) {
    // Check if similar topic already exists
    const existing = await db.query.prometheusResearchPriorities.findFirst({
      where: and(
        eq(prometheusResearchPriorities.prometheusId, prometheusId),
        sql`${prometheusResearchPriorities.topic} ILIKE ${`%${suggestion.topic}%`}`,
        ne(prometheusResearchPriorities.status, "archived")
      ),
    });

    if (!existing) {
      await createResearchPriority(prometheusId, suggestion, true);
      created++;
    }
  }

  // Notify if new priorities were created
  if (created > 0) {
    const prometheus = await db.query.prometheusState.findFirst({
      where: eq(prometheusState.id, prometheusId),
    });

    if (prometheus) {
      const child = await db.query.children.findFirst({
        where: eq(children.id, prometheus.childId!),
      });

      await createNotification({
        userId: child?.userId || "system",
        prometheusId,
        category: "knowledge_milestone",
        priority: "medium",
        title: `${created} New Research Priorities Generated`,
        titleKa: `${created} ახალი კვლევის პრიორიტეტი შეიქმნა`,
        message: `PROMETHEUS has identified ${created} new research topics that could benefit your child's care.`,
        messageKa: `PROMETHEUS-მა გამოავლინა ${created} ახალი კვლევის თემა, რომელიც შეიძლება სასარგებლო იყოს თქვენი შვილის მოვლისთვის.`,
        actionUrl: `/evolution/research`,
        metadata: { prioritiesCreated: created },
      });
    }
  }

  return created;
}

/**
 * Recalculate priority scores based on current state
 */
export async function recalculatePriorityScores(
  prometheusId: number
): Promise<void> {
  const priorities = await db.query.prometheusResearchPriorities.findMany({
    where: and(
      eq(prometheusResearchPriorities.prometheusId, prometheusId),
      ne(prometheusResearchPriorities.status, "completed"),
      ne(prometheusResearchPriorities.status, "archived")
    ),
  });

  for (const priority of priorities) {
    // Calculate new score based on multiple factors
    let score = 0.5;

    // Urgency factor
    const urgencyScores = { critical: 0.4, high: 0.25, medium: 0.15, low: 0.05 };
    score += urgencyScores[priority.urgency as keyof typeof urgencyScores] || 0.15;

    // Age factor (older pending items get higher priority)
    const ageInDays = priority.createdAt
      ? (Date.now() - priority.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    score += Math.min(0.2, ageInDays * 0.01);

    // Relevance factor
    score += (priority.relevanceToChild || 0.5) * 0.15;

    // Cap at 1.0
    score = Math.min(1.0, score);

    await db
      .update(prometheusResearchPriorities)
      .set({ priorityScore: score, updatedAt: new Date() })
      .where(eq(prometheusResearchPriorities.id, priority.id));
  }
}

// ============================================================================
// Research Execution Integration
// ============================================================================

/**
 * Start researching a priority (integrates with Evolution system)
 */
export async function startResearch(
  priorityId: number
): Promise<{ success: boolean; message: string }> {
  const priority = await db.query.prometheusResearchPriorities.findFirst({
    where: eq(prometheusResearchPriorities.id, priorityId),
  });

  if (!priority) {
    return { success: false, message: "Priority not found" };
  }

  if (priority.status === "in_progress") {
    return { success: false, message: "Research already in progress" };
  }

  // Update status
  await updateResearchStatus(priorityId, "in_progress");

  // Log autonomous action
  await db.insert(prometheusAutonomousActions).values({
    prometheusId: priority.prometheusId,
    actionType: "research_initiated",
    description: `Started research on: ${priority.topic}`,
    descriptionKa: `დაიწყო კვლევა თემაზე: ${priority.topicKa || priority.topic}`,
    triggerReason: "User initiated or scheduled research",
    inputData: { priorityId, topic: priority.topic },
    confidence: priority.priorityScore,
    impactAssessment: priority.urgency === "critical" ? "high" : "medium",
  });

  return { success: true, message: "Research started" };
}

/**
 * Complete research with findings
 */
export async function completeResearch(
  priorityId: number,
  findings: string,
  findingsKa?: string,
  linkedHypotheses?: number[]
): Promise<PrometheusResearchPriority | null> {
  const priority = await db.query.prometheusResearchPriorities.findFirst({
    where: eq(prometheusResearchPriorities.id, priorityId),
  });

  if (!priority) return null;

  const [updated] = await db
    .update(prometheusResearchPriorities)
    .set({
      status: "completed",
      completedAt: new Date(),
      findings,
      findingsKa,
      linkedHypotheses,
      updatedAt: new Date(),
    })
    .where(eq(prometheusResearchPriorities.id, priorityId))
    .returning();

  // Notify about completion
  if (priority.prometheusId) {
    const prometheus = await db.query.prometheusState.findFirst({
      where: eq(prometheusState.id, priority.prometheusId),
    });

    if (prometheus?.childId) {
      const child = await db.query.children.findFirst({
        where: eq(children.id, prometheus.childId),
      });

      await createNotification({
        userId: child?.userId || "system",
        prometheusId: priority.prometheusId,
        category: "knowledge_milestone",
        priority: "medium",
        title: "Research Completed",
        titleKa: "კვლევა დასრულდა",
        message: `Research on "${priority.topic}" has been completed with new findings.`,
        messageKa: `კვლევა თემაზე "${priority.topicKa || priority.topic}" დასრულდა ახალი აღმოჩენებით.`,
        actionUrl: `/evolution/research/${priorityId}`,
        metadata: { priorityId, topic: priority.topic },
      });
    }
  }

  return updated || null;
}
