// @ts-nocheck
/**
 * PROMETHEUS Phase 4: Treatment Recommendation Engine
 *
 * AI-powered treatment recommendation system that suggests therapies,
 * medications, and interventions based on accumulated knowledge.
 *
 * "მეცნიერება გზამკვლევია, მაგრამ გადაწყვეტილება მშობლისა და ექიმის ხელშია"
 * "Science is the guide, but the decision is in the hands of parents and doctors"
 */

import { db } from "../../db";
import {
  prometheusTreatmentRecommendations,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusHypotheses,
  prometheusState,
  prometheusAutonomousActions,
  children,
  type InsertPrometheusTreatmentRecommendation,
  type PrometheusTreatmentRecommendation,
} from "@shared/schema";
import { eq, and, desc, sql, gte, ne } from "drizzle-orm";
import { createNotification } from "../phase2/notificationSystem";
import OpenAI from "openai";

// ============================================================================
// Types
// ============================================================================

export type TreatmentType =
  | "therapy"
  | "medication"
  | "intervention"
  | "lifestyle"
  | "supplement"
  | "device";

export type EvidenceLevel =
  | "strong"
  | "moderate"
  | "limited"
  | "theoretical"
  | "anecdotal";

export interface EvidenceSource {
  title: string;
  url?: string;
  type: string;
  reliability: number;
}

export interface TreatmentInput {
  treatmentName: string;
  treatmentNameKa?: string;
  treatmentType: TreatmentType;
  description: string;
  descriptionKa?: string;
  rationale: string;
  rationaleKa?: string;
  expectedBenefits?: string[];
  expectedBenefitsKa?: string[];
  potentialRisks?: string[];
  potentialRisksKa?: string[];
  evidenceLevel?: EvidenceLevel;
  evidenceSources?: EvidenceSource[];
  urgency?: "critical" | "high" | "medium" | "low";
  timeframe?: "immediate" | "short_term" | "long_term" | "ongoing";
}

export interface RecommendationWithContext extends PrometheusTreatmentRecommendation {
  applicabilityExplanation?: string;
  relatedKnowledge?: Array<{ type: string; content: string }>;
}

// ============================================================================
// AI Client
// ============================================================================

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ============================================================================
// Recommendation Generation
// ============================================================================

/**
 * Generate treatment recommendations using AI
 */
export async function generateRecommendations(
  prometheusId: number,
  count: number = 5
): Promise<PrometheusTreatmentRecommendation[]> {
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

  if (!child) return [];

  // Get current therapies (to avoid duplicates)
  const existingRecommendations = await db.query.prometheusTreatmentRecommendations.findMany({
    where: eq(prometheusTreatmentRecommendations.prometheusId, prometheusId),
  });

  const existingTreatments = existingRecommendations.map(r => r.treatmentName.toLowerCase());

  // Get validated hypotheses
  const validatedHypotheses = await db.query.prometheusHypotheses.findMany({
    where: and(
      eq(prometheusHypotheses.prometheusId, prometheusId),
      eq(prometheusHypotheses.status, "validated")
    ),
    limit: 10,
  });

  // Get high-confidence treatment knowledge
  const treatmentNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      eq(prometheusKnowledgeNodes.nodeType, "entity"),
      gte(prometheusKnowledgeNodes.confidence, 0.6)
    ),
    limit: 20,
  });

  // Get relevant memories
  const treatmentMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.content} ILIKE '%treatment%' OR ${prometheusMemory.content} ILIKE '%therapy%'`
    ),
    limit: 15,
  });

  const prompt = `You are a medical treatment recommendation system for pediatric neurology, specifically for children with HIE (Hypoxic-Ischemic Encephalopathy).

IMPORTANT DISCLAIMER: These are research-based suggestions only. All recommendations must be reviewed by qualified medical professionals before any implementation.

Child Profile:
- Age: ${child.dateOfBirth ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000 * 12)) : "Unknown"} months
- Diagnosis: ${child.primaryDiagnosis || "HIE"}
- Current Therapies: ${child.currentTherapies || "Not specified"}

Existing Recommendations (avoid duplicating):
${existingTreatments.join(", ") || "None"}

Validated Research Hypotheses:
${validatedHypotheses.map(h => `- ${h.title}: ${h.hypothesis}`).join("\n") || "None yet"}

Known Treatment Options:
${treatmentNodes.map(n => `- ${n.label}: ${n.description || ""} (confidence: ${((n.confidence ?? 0) * 100).toFixed(0)}%)`).join("\n") || "Limited data"}

Research Findings:
${treatmentMemories.map(m => `- ${m.content.substring(0, 150)}`).join("\n") || "Limited data"}

Generate ${count} treatment recommendations that could benefit this child.

For each recommendation:
1. treatmentName: Name of treatment/therapy
2. treatmentType: One of [therapy, medication, intervention, lifestyle, supplement, device]
3. description: What this treatment involves
4. rationale: Why this is recommended for this child
5. expectedBenefits: Array of potential benefits
6. potentialRisks: Array of potential risks/side effects
7. evidenceLevel: One of [strong, moderate, limited, theoretical, anecdotal]
8. urgency: One of [critical, high, medium, low]
9. timeframe: One of [immediate, short_term, long_term, ongoing]
10. confidenceScore: 0-1 confidence in this recommendation
11. applicabilityScore: 0-1 how applicable to this specific child

Return as JSON with "recommendations" array.`;

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
    const recommendationsData = parsed.recommendations || parsed;

    if (!Array.isArray(recommendationsData)) return [];

    const created: PrometheusTreatmentRecommendation[] = [];

    for (const r of recommendationsData) {
      // Skip if already exists
      if (existingTreatments.includes(r.treatmentName?.toLowerCase())) continue;

      const [recommendation] = await db
        .insert(prometheusTreatmentRecommendations)
        .values({
          prometheusId,
          childId: prometheus.childId,
          treatmentName: r.treatmentName,
          treatmentType: r.treatmentType || "therapy",
          description: r.description,
          rationale: r.rationale,
          expectedBenefits: r.expectedBenefits,
          potentialRisks: r.potentialRisks,
          confidenceScore: r.confidenceScore || 0.5,
          evidenceLevel: r.evidenceLevel || "moderate",
          applicabilityScore: r.applicabilityScore || 0.5,
          urgency: r.urgency || "medium",
          timeframe: r.timeframe || "ongoing",
          status: "suggested",
        })
        .returning();

      if (recommendation) {
        created.push(recommendation);

        // Log autonomous action
        await db.insert(prometheusAutonomousActions).values({
          prometheusId,
          actionType: "recommendation_created",
          description: `Generated treatment recommendation: ${r.treatmentName}`,
          descriptionKa: `შეიქმნა მკურნალობის რეკომენდაცია: ${r.treatmentName}`,
          triggerReason: "Knowledge analysis and hypothesis validation",
          outputData: { recommendationId: recommendation.id, treatment: r.treatmentName },
          confidence: r.confidenceScore || 0.5,
          requiresReview: true,
          impactAssessment: r.urgency === "critical" ? "high" : "medium",
        });
      }
    }

    // Notify about new recommendations
    if (created.length > 0) {
      await createNotification({
        userId: child.userId,
        prometheusId,
        category: "new_treatment_option",
        priority: "high",
        title: `${created.length} New Treatment Recommendations`,
        titleKa: `${created.length} ახალი მკურნალობის რეკომენდაცია`,
        message: `PROMETHEUS has generated ${created.length} new treatment recommendations for review with your medical team.`,
        messageKa: `PROMETHEUS-მა შექმნა ${created.length} ახალი მკურნალობის რეკომენდაცია თქვენი სამედიცინო გუნდთან განსახილველად.`,
        actionUrl: `/evolution/recommendations`,
        metadata: { recommendationsCreated: created.length },
      });
    }

    return created;
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return [];
  }
}

/**
 * Create a manual recommendation
 */
export async function createRecommendation(
  prometheusId: number,
  childId: number,
  input: TreatmentInput
): Promise<PrometheusTreatmentRecommendation> {
  const [recommendation] = await db
    .insert(prometheusTreatmentRecommendations)
    .values({
      prometheusId,
      childId,
      treatmentName: input.treatmentName,
      treatmentNameKa: input.treatmentNameKa,
      treatmentType: input.treatmentType,
      description: input.description,
      descriptionKa: input.descriptionKa,
      rationale: input.rationale,
      rationaleKa: input.rationaleKa,
      expectedBenefits: input.expectedBenefits,
      expectedBenefitsKa: input.expectedBenefitsKa,
      potentialRisks: input.potentialRisks,
      potentialRisksKa: input.potentialRisksKa,
      evidenceLevel: input.evidenceLevel || "moderate",
      evidenceSources: input.evidenceSources,
      urgency: input.urgency || "medium",
      timeframe: input.timeframe || "ongoing",
      confidenceScore: 0.5,
      status: "suggested",
    })
    .returning();

  return recommendation;
}

// ============================================================================
// Recommendation Management
// ============================================================================

/**
 * Get all recommendations for a child
 */
export async function getRecommendations(
  prometheusId: number,
  status?: string
): Promise<RecommendationWithContext[]> {
  const conditions = [eq(prometheusTreatmentRecommendations.prometheusId, prometheusId)];

  if (status) {
    conditions.push(eq(prometheusTreatmentRecommendations.status, status));
  }

  const recommendations = await db.query.prometheusTreatmentRecommendations.findMany({
    where: and(...conditions),
    orderBy: [
      desc(prometheusTreatmentRecommendations.urgency),
      desc(prometheusTreatmentRecommendations.confidenceScore),
    ],
  });

  return recommendations.map(r => ({
    ...r,
    applicabilityExplanation: generateApplicabilityExplanation(r),
  }));
}

function generateApplicabilityExplanation(rec: PrometheusTreatmentRecommendation): string {
  const score = rec.applicabilityScore ?? 0.5;
  const confidence = rec.confidenceScore ?? 0.5;

  if (score >= 0.8 && confidence >= 0.7) {
    return "Highly applicable based on child's profile and strong evidence";
  } else if (score >= 0.6) {
    return "Moderately applicable - consider discussing with medical team";
  } else {
    return "May be applicable - further evaluation recommended";
  }
}

/**
 * Review a recommendation
 */
export async function reviewRecommendation(
  recommendationId: number,
  reviewedBy: string,
  status: "approved" | "rejected" | "under_review",
  notes?: string
): Promise<PrometheusTreatmentRecommendation | null> {
  const [updated] = await db
    .update(prometheusTreatmentRecommendations)
    .set({
      status,
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: notes,
      updatedAt: new Date(),
    })
    .where(eq(prometheusTreatmentRecommendations.id, recommendationId))
    .returning();

  return updated || null;
}

/**
 * Mark recommendation as implemented
 */
export async function implementRecommendation(
  recommendationId: number
): Promise<PrometheusTreatmentRecommendation | null> {
  const [updated] = await db
    .update(prometheusTreatmentRecommendations)
    .set({
      status: "implemented",
      implementedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(prometheusTreatmentRecommendations.id, recommendationId))
    .returning();

  return updated || null;
}

/**
 * Link recommendation to outcome tracking
 */
export async function linkToOutcomeTracking(
  recommendationId: number,
  outcomeTrackingId: number
): Promise<PrometheusTreatmentRecommendation | null> {
  const [updated] = await db
    .update(prometheusTreatmentRecommendations)
    .set({
      outcomeTrackingId,
      updatedAt: new Date(),
    })
    .where(eq(prometheusTreatmentRecommendations.id, recommendationId))
    .returning();

  return updated || null;
}

/**
 * Get recommendation statistics
 */
export async function getRecommendationStats(prometheusId: number): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  implemented: number;
  averageConfidence: number;
  withOutcomeTracking: number;
}> {
  const recommendations = await db.query.prometheusTreatmentRecommendations.findMany({
    where: eq(prometheusTreatmentRecommendations.prometheusId, prometheusId),
  });

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalConfidence = 0;
  let withOutcomeTracking = 0;

  for (const r of recommendations) {
    byStatus[r.status || "unknown"] = (byStatus[r.status || "unknown"] || 0) + 1;
    byType[r.treatmentType] = (byType[r.treatmentType] || 0) + 1;
    totalConfidence += r.confidenceScore ?? 0;
    if (r.outcomeTrackingId) withOutcomeTracking++;
  }

  return {
    total: recommendations.length,
    byStatus,
    byType,
    implemented: recommendations.filter(r => r.status === "implemented").length,
    averageConfidence: recommendations.length > 0 ? totalConfidence / recommendations.length : 0,
    withOutcomeTracking,
  };
}

// ============================================================================
// Safety Checks
// ============================================================================

/**
 * Check for potential interactions with current treatments
 */
export async function checkInteractions(
  prometheusId: number,
  newTreatment: string
): Promise<{
  hasInteractions: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Get current treatments from child profile and implemented recommendations
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId),
  });

  if (!prometheus?.childId) {
    return { hasInteractions: false, warnings: [] };
  }

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId),
  });

  const implementedRecs = await db.query.prometheusTreatmentRecommendations.findMany({
    where: and(
      eq(prometheusTreatmentRecommendations.prometheusId, prometheusId),
      eq(prometheusTreatmentRecommendations.status, "implemented")
    ),
  });

  // Check each implemented recommendation for interaction warnings
  for (const rec of implementedRecs) {
    if (rec.interactionWarnings && Array.isArray(rec.interactionWarnings)) {
      for (const warning of rec.interactionWarnings) {
        if (warning.toLowerCase().includes(newTreatment.toLowerCase())) {
          warnings.push(`Potential interaction with ${rec.treatmentName}: ${warning}`);
        }
      }
    }
  }

  // Check knowledge base for known interactions
  const interactionMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.content} ILIKE ${`%${newTreatment}%`}`,
      sql`${prometheusMemory.content} ILIKE '%interaction%' OR ${prometheusMemory.content} ILIKE '%contraindication%'`
    ),
  });

  for (const memory of interactionMemories) {
    warnings.push(`Knowledge note: ${memory.content.substring(0, 200)}...`);
  }

  return {
    hasInteractions: warnings.length > 0,
    warnings,
  };
}

/**
 * Check contraindications for a child
 */
export async function checkContraindications(
  prometheusId: number,
  treatmentName: string
): Promise<string[]> {
  const contraindications: string[] = [];

  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId),
  });

  if (!prometheus?.childId) return [];

  // Check for contraindications in knowledge base
  const contraindicationMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.content} ILIKE ${`%${treatmentName}%`}`,
      sql`${prometheusMemory.content} ILIKE '%contraindication%' OR ${prometheusMemory.content} ILIKE '%not recommended%' OR ${prometheusMemory.content} ILIKE '%avoid%'`
    ),
  });

  for (const memory of contraindicationMemories) {
    contraindications.push(memory.content);
  }

  return contraindications;
}
