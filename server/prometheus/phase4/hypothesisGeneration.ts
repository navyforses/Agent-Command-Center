// @ts-nocheck
/**
 * PROMETHEUS Phase 4: Automatic Hypothesis Generation
 *
 * AI-powered system that generates research hypotheses based on
 * accumulated knowledge, patterns, and emerging connections.
 *
 * "ჰიპოთეზა - ცოდნის თესლი რომელიც მომავალ აღმოჩენებად იქცევა"
 * "Hypothesis - the seed of knowledge that becomes future discoveries"
 */

import { db } from "../../db";
import {
  prometheusHypotheses,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusKnowledgeEdges,
  prometheusState,
  prometheusAutonomousActions,
  children,
  type InsertPrometheusHypothesis,
  type PrometheusHypothesis,
} from "@shared/schema";
import { eq, and, desc, sql, gte, ne, inArray } from "drizzle-orm";
import { createNotification } from "../phase2/notificationSystem";
import OpenAI from "openai";

// ============================================================================
// Types
// ============================================================================

export type HypothesisType =
  | "treatment_effect"    // Treatment X improves condition Y
  | "causal"              // X causes Y
  | "correlational"       // X is associated with Y
  | "mechanistic"         // How X works
  | "predictive";         // If X then Y

export interface HypothesisInput {
  title: string;
  titleKa?: string;
  hypothesis: string;
  hypothesisKa?: string;
  rationale: string;
  rationaleKa?: string;
  hypothesisType: HypothesisType;
  relatedMemories?: number[];
  relatedNodes?: number[];
}

export interface EvidenceItem {
  source: string;
  content: string;
  strength: number;
}

export interface HypothesisWithEvidence extends PrometheusHypothesis {
  evidenceBalance: number; // Positive = more supporting, negative = more contradicting
  readinessForTesting: number; // 0-1 score
}

export interface PatternInsight {
  pattern: string;
  confidence: number;
  nodeIds: number[];
  suggestedHypothesis: string;
}

// ============================================================================
// AI Client
// ============================================================================

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Detect patterns in knowledge graph that could generate hypotheses
 */
export async function detectPatterns(
  prometheusId: number
): Promise<PatternInsight[]> {
  const patterns: PatternInsight[] = [];

  // Get all nodes and edges
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
  });

  const edges = await db.query.prometheusKnowledgeEdges.findMany({
    where: eq(prometheusKnowledgeEdges.prometheusId, prometheusId),
  });

  // Build adjacency map
  const connections = new Map<number, Array<{ targetId: number; relation: string; strength: number }>>();

  for (const edge of edges) {
    if (edge.sourceNodeId && edge.targetNodeId) {
      const existing = connections.get(edge.sourceNodeId) || [];
      existing.push({
        targetId: edge.targetNodeId,
        relation: edge.relationType || "related",
        strength: edge.strength ?? 0.5,
      });
      connections.set(edge.sourceNodeId, existing);
    }
  }

  // Pattern 1: Treatment chains (A treats B, B prevents C)
  for (const node of nodes) {
    if (node.nodeType === "entity") { // Treatment
      const treats = edges.filter(
        e => e.sourceNodeId === node.id && e.relationType === "treats"
      );

      for (const treatEdge of treats) {
        const targetNode = nodes.find(n => n.id === treatEdge.targetNodeId);
        if (targetNode) {
          // Look for what this condition leads to
          const consequences = edges.filter(
            e => e.sourceNodeId === treatEdge.targetNodeId && e.relationType === "causes"
          );

          for (const conseq of consequences) {
            const consequenceNode = nodes.find(n => n.id === conseq.targetNodeId);
            if (consequenceNode) {
              patterns.push({
                pattern: `${node.label} treats ${targetNode.label} which may prevent ${consequenceNode.label}`,
                confidence: Math.min(treatEdge.strength ?? 0.5, conseq.strength ?? 0.5),
                nodeIds: [node.id, targetNode.id, consequenceNode.id],
                suggestedHypothesis: `${node.label} may indirectly prevent ${consequenceNode.label} by treating ${targetNode.label}`,
              });
            }
          }
        }
      }
    }
  }

  // Pattern 2: Similar treatments (A and B both treat C - might have synergy)
  const treatmentsByCondition = new Map<number, number[]>();

  for (const edge of edges) {
    if (edge.relationType === "treats" && edge.sourceNodeId && edge.targetNodeId) {
      const existing = treatmentsByCondition.get(edge.targetNodeId) || [];
      existing.push(edge.sourceNodeId);
      treatmentsByCondition.set(edge.targetNodeId, existing);
    }
  }

  for (const [conditionId, treatmentIds] of treatmentsByCondition.entries()) {
    if (treatmentIds.length >= 2) {
      const conditionNode = nodes.find(n => n.id === conditionId);
      const treatmentNodes = treatmentIds.map(id => nodes.find(n => n.id === id)).filter(Boolean);

      if (conditionNode && treatmentNodes.length >= 2) {
        patterns.push({
          pattern: `Multiple treatments for ${conditionNode.label}: ${treatmentNodes.map(t => t?.label).join(", ")}`,
          confidence: 0.6,
          nodeIds: [conditionId, ...treatmentIds],
          suggestedHypothesis: `Combining ${treatmentNodes[0]?.label} with ${treatmentNodes[1]?.label} may have synergistic effects for ${conditionNode.label}`,
        });
      }
    }
  }

  // Pattern 3: High-confidence facts that support each other
  const highConfidenceNodes = nodes.filter(n => (n.confidence ?? 0) >= 0.8 && n.nodeType === "fact");

  for (let i = 0; i < highConfidenceNodes.length; i++) {
    for (let j = i + 1; j < highConfidenceNodes.length; j++) {
      const nodeA = highConfidenceNodes[i];
      const nodeB = highConfidenceNodes[j];

      // Check if they're connected
      const connection = edges.find(
        e =>
          (e.sourceNodeId === nodeA.id && e.targetNodeId === nodeB.id) ||
          (e.sourceNodeId === nodeB.id && e.targetNodeId === nodeA.id)
      );

      if (connection && connection.relationType === "supports") {
        patterns.push({
          pattern: `Strong supporting relationship between ${nodeA.label} and ${nodeB.label}`,
          confidence: 0.8,
          nodeIds: [nodeA.id, nodeB.id],
          suggestedHypothesis: `The relationship between ${nodeA.label} and ${nodeB.label} suggests a mechanistic connection worth investigating`,
        });
      }
    }
  }

  // Sort by confidence
  patterns.sort((a, b) => b.confidence - a.confidence);

  return patterns.slice(0, 10);
}

// ============================================================================
// Hypothesis Generation
// ============================================================================

/**
 * Generate hypotheses using AI based on knowledge and patterns
 */
export async function generateHypotheses(
  prometheusId: number,
  count: number = 5
): Promise<PrometheusHypothesis[]> {
  const openai = getOpenAIClient();
  if (!openai) return [];

  // Get context
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId),
  });

  if (!prometheus?.childId) return [];

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId),
  });

  // Get patterns
  const patterns = await detectPatterns(prometheusId);

  // Get high-confidence knowledge
  const highConfidenceNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, 0.7)
    ),
    limit: 20,
  });

  // Get recent memories
  const recentMemories = await db.query.prometheusMemory.findMany({
    where: eq(prometheusMemory.prometheusId, prometheusId),
    orderBy: [desc(prometheusMemory.createdAt)],
    limit: 15,
  });

  const prompt = `You are a medical research hypothesis generator specializing in pediatric neurology and HIE (Hypoxic-Ischemic Encephalopathy).

Child Context:
- Diagnosis: ${child?.primaryDiagnosis || "HIE"}
- Current Therapies: ${child?.currentTherapies || "Not specified"}

Patterns Detected in Knowledge Base:
${patterns.map(p => `- ${p.pattern} (confidence: ${(p.confidence * 100).toFixed(0)}%)\n  Suggested: ${p.suggestedHypothesis}`).join("\n")}

High-Confidence Knowledge:
${highConfidenceNodes.map(n => `- [${n.nodeType}] ${n.label}: ${n.description || ""}`).join("\n")}

Recent Learnings:
${recentMemories.map(m => `- ${m.content.substring(0, 100)}`).join("\n")}

Generate ${count} research hypotheses that could advance understanding or treatment of this child's condition.

For each hypothesis:
1. title: Short title (10 words max)
2. hypothesis: Clear, testable hypothesis statement
3. rationale: Why this hypothesis is worth investigating (based on the patterns and knowledge)
4. hypothesisType: One of [treatment_effect, causal, correlational, mechanistic, predictive]
5. confidence: 0-1 how confident you are in this hypothesis
6. noveltyScore: 0-1 how novel/unique this hypothesis is
7. testability: One of [easily_testable, requires_study, theoretical]

Return as JSON with "hypotheses" array.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const hypothesesData = parsed.hypotheses || parsed;

    if (!Array.isArray(hypothesesData)) return [];

    const created: PrometheusHypothesis[] = [];

    for (const h of hypothesesData) {
      const [hypothesis] = await db
        .insert(prometheusHypotheses)
        .values({
          prometheusId,
          title: h.title,
          hypothesis: h.hypothesis,
          rationale: h.rationale,
          hypothesisType: h.hypothesisType || "treatment_effect",
          confidence: h.confidence || 0.5,
          noveltyScore: h.noveltyScore || 0.5,
          testability: h.testability || "requires_study",
          status: "generated",
        })
        .returning();

      if (hypothesis) {
        created.push(hypothesis);

        // Log autonomous action
        await db.insert(prometheusAutonomousActions).values({
          prometheusId,
          actionType: "hypothesis_generated",
          description: `Generated hypothesis: ${h.title}`,
          descriptionKa: `შეიქმნა ჰიპოთეზა: ${h.title}`,
          triggerReason: "Pattern detection and knowledge analysis",
          outputData: { hypothesisId: hypothesis.id, title: h.title },
          confidence: h.confidence || 0.5,
          requiresReview: true,
          impactAssessment: h.confidence >= 0.7 ? "high" : "medium",
        });
      }
    }

    // Notify about new hypotheses
    if (created.length > 0) {
      await createNotification({
        userId: child?.userId || "system",
        prometheusId,
        category: "breakthrough_discovery",
        priority: "medium",
        title: `${created.length} New Hypotheses Generated`,
        titleKa: `${created.length} ახალი ჰიპოთეზა შეიქმნა`,
        message: `PROMETHEUS has generated ${created.length} new research hypotheses based on pattern analysis.`,
        messageKa: `PROMETHEUS-მა შექმნა ${created.length} ახალი კვლევითი ჰიპოთეზა პატერნების ანალიზის საფუძველზე.`,
        actionUrl: `/evolution/hypotheses`,
        metadata: { hypothesesCreated: created.length },
      });
    }

    return created;
  } catch (error) {
    console.error("Error generating hypotheses:", error);
    return [];
  }
}

/**
 * Create a hypothesis manually
 */
export async function createHypothesis(
  prometheusId: number,
  input: HypothesisInput
): Promise<PrometheusHypothesis> {
  const [hypothesis] = await db
    .insert(prometheusHypotheses)
    .values({
      prometheusId,
      title: input.title,
      titleKa: input.titleKa,
      hypothesis: input.hypothesis,
      hypothesisKa: input.hypothesisKa,
      rationale: input.rationale,
      rationaleKa: input.rationaleKa,
      hypothesisType: input.hypothesisType,
      relatedMemories: input.relatedMemories,
      relatedNodes: input.relatedNodes,
      confidence: 0.5,
      status: "generated",
    })
    .returning();

  return hypothesis;
}

// ============================================================================
// Hypothesis Management
// ============================================================================

/**
 * Get all hypotheses for a Prometheus instance
 */
export async function getHypotheses(
  prometheusId: number,
  status?: string
): Promise<HypothesisWithEvidence[]> {
  const conditions = [eq(prometheusHypotheses.prometheusId, prometheusId)];

  if (status) {
    conditions.push(eq(prometheusHypotheses.status, status));
  }

  const hypotheses = await db.query.prometheusHypotheses.findMany({
    where: and(...conditions),
    orderBy: [desc(prometheusHypotheses.createdAt)],
  });

  return hypotheses.map(h => {
    const supporting = (h.supportingEvidence as EvidenceItem[] | null) || [];
    const contradicting = (h.contradictingEvidence as EvidenceItem[] | null) || [];

    const supportingStrength = supporting.reduce((sum, e) => sum + e.strength, 0);
    const contradictingStrength = contradicting.reduce((sum, e) => sum + e.strength, 0);

    const evidenceBalance = supportingStrength - contradictingStrength;
    const readinessForTesting = Math.min(
      1,
      (h.confidence ?? 0.5) * 0.4 +
      (supporting.length > 0 ? 0.3 : 0) +
      (h.testability === "easily_testable" ? 0.3 : h.testability === "requires_study" ? 0.15 : 0)
    );

    return {
      ...h,
      evidenceBalance,
      readinessForTesting,
    };
  });
}

/**
 * Add evidence to a hypothesis
 */
export async function addEvidence(
  hypothesisId: number,
  evidence: EvidenceItem,
  type: "supporting" | "contradicting"
): Promise<PrometheusHypothesis | null> {
  const hypothesis = await db.query.prometheusHypotheses.findFirst({
    where: eq(prometheusHypotheses.id, hypothesisId),
  });

  if (!hypothesis) return null;

  const currentEvidence =
    type === "supporting"
      ? (hypothesis.supportingEvidence as EvidenceItem[] | null) || []
      : (hypothesis.contradictingEvidence as EvidenceItem[] | null) || [];

  currentEvidence.push(evidence);

  const updateField =
    type === "supporting" ? { supportingEvidence: currentEvidence } : { contradictingEvidence: currentEvidence };

  // Adjust confidence based on evidence
  let newConfidence = hypothesis.confidence ?? 0.5;
  if (type === "supporting") {
    newConfidence = Math.min(1, newConfidence + evidence.strength * 0.1);
  } else {
    newConfidence = Math.max(0, newConfidence - evidence.strength * 0.1);
  }

  const [updated] = await db
    .update(prometheusHypotheses)
    .set({
      ...updateField,
      confidence: newConfidence,
      updatedAt: new Date(),
    })
    .where(eq(prometheusHypotheses.id, hypothesisId))
    .returning();

  return updated || null;
}

/**
 * Validate a hypothesis
 */
export async function validateHypothesis(
  hypothesisId: number,
  validationStatus: "pending" | "supported" | "partially_supported" | "refuted",
  notes?: string
): Promise<PrometheusHypothesis | null> {
  const [updated] = await db
    .update(prometheusHypotheses)
    .set({
      validationStatus,
      validationNotes: notes,
      status: validationStatus === "supported" ? "validated" : validationStatus === "refuted" ? "invalidated" : "under_review",
      updatedAt: new Date(),
    })
    .where(eq(prometheusHypotheses.id, hypothesisId))
    .returning();

  return updated || null;
}

/**
 * Refine a hypothesis into a more specific version
 */
export async function refineHypothesis(
  parentHypothesisId: number,
  refinedInput: HypothesisInput
): Promise<PrometheusHypothesis | null> {
  const parent = await db.query.prometheusHypotheses.findFirst({
    where: eq(prometheusHypotheses.id, parentHypothesisId),
  });

  if (!parent) return null;

  const [refined] = await db
    .insert(prometheusHypotheses)
    .values({
      prometheusId: parent.prometheusId,
      title: refinedInput.title,
      titleKa: refinedInput.titleKa,
      hypothesis: refinedInput.hypothesis,
      hypothesisKa: refinedInput.hypothesisKa,
      rationale: refinedInput.rationale,
      rationaleKa: refinedInput.rationaleKa,
      hypothesisType: refinedInput.hypothesisType,
      parentHypothesisId,
      relatedMemories: refinedInput.relatedMemories || parent.relatedMemories,
      relatedNodes: refinedInput.relatedNodes || parent.relatedNodes,
      confidence: parent.confidence,
      status: "generated",
    })
    .returning();

  // Update parent with child reference
  const existingChildren = parent.childHypotheses || [];
  await db
    .update(prometheusHypotheses)
    .set({
      childHypotheses: [...existingChildren, refined.id],
      updatedAt: new Date(),
    })
    .where(eq(prometheusHypotheses.id, parentHypothesisId));

  return refined;
}

/**
 * Get hypothesis statistics
 */
export async function getHypothesisStats(prometheusId: number): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  validated: number;
  averageConfidence: number;
  highNovelty: number;
}> {
  const hypotheses = await db.query.prometheusHypotheses.findMany({
    where: eq(prometheusHypotheses.prometheusId, prometheusId),
  });

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalConfidence = 0;
  let highNovelty = 0;

  for (const h of hypotheses) {
    byStatus[h.status || "unknown"] = (byStatus[h.status || "unknown"] || 0) + 1;
    byType[h.hypothesisType] = (byType[h.hypothesisType] || 0) + 1;
    totalConfidence += h.confidence ?? 0;
    if ((h.noveltyScore ?? 0) >= 0.7) highNovelty++;
  }

  return {
    total: hypotheses.length,
    byStatus,
    byType,
    validated: hypotheses.filter(h => h.status === "validated").length,
    averageConfidence: hypotheses.length > 0 ? totalConfidence / hypotheses.length : 0,
    highNovelty,
  };
}
