/**
 * PROMETHEUS Phase 3: Expert Verification System
 *
 * Human-in-the-loop verification system that allows medical experts
 * to review, verify, correct, and enhance AI-generated knowledge.
 *
 * "ექსპერტის თვალი - ხელოვნური ინტელექტის გული"
 * "Expert's eye - AI's heart"
 */

import { db } from "../../db";
import {
  prometheusExpertCredentials,
  prometheusExpertReviews,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusState,
  type InsertPrometheusExpertCredential,
  type InsertPrometheusExpertReview,
  type PrometheusExpertCredential,
  type PrometheusExpertReview,
} from "@shared/schema";
import { eq, and, desc, sql, gte, isNull, or, inArray } from "drizzle-orm";
import { createNotification } from "../phase2/notificationSystem";

// ============================================================================
// Types
// ============================================================================

export interface ExpertProfile extends PrometheusExpertCredential {
  recentReviews?: PrometheusExpertReview[];
  stats?: ExpertStats;
}

export interface ExpertStats {
  totalReviews: number;
  verificationsApproved: number;
  correctionsSubmitted: number;
  averageResponseTime: number; // hours
  impactScore: number; // Based on how often their corrections improve outcomes
}

export interface ReviewRequest {
  targetType: "memory" | "knowledge_node" | "prediction" | "insight";
  targetId: number;
  prometheusId: number;
  urgency: "critical" | "high" | "normal" | "low";
  context: string;
  contextKa?: string;
  requiredExpertise?: string[];
}

export interface ReviewQueueItem {
  id: number;
  request: ReviewRequest;
  targetContent: string;
  targetContentKa?: string;
  confidence: number;
  createdAt: Date;
  assignedExpert?: ExpertProfile;
  status: "pending" | "in_review" | "completed";
}

export interface ReviewVerdict {
  verdict: "verified" | "partially_verified" | "needs_revision" | "rejected";
  confidenceAdjustment: number;
  suggestedContent?: string;
  suggestedContentKa?: string;
  reasoning: string;
  reasoningKa?: string;
  evidenceLinks?: string[];
  clinicalRelevance: "high" | "medium" | "low" | "none";
  safetyImplications: "critical" | "important" | "minor" | "none";
}

// ============================================================================
// Expert Credential Management
// ============================================================================

/**
 * Register a new expert with credentials
 */
export async function registerExpert(
  credential: InsertPrometheusExpertCredential
): Promise<PrometheusExpertCredential> {
  const [expert] = await db
    .insert(prometheusExpertCredentials)
    .values({
      ...credential,
      verificationStatus: "pending",
      trustScore: 0.5,
      reviewCount: 0,
    })
    .returning();

  // Notify admins about new expert registration
  await createNotification({
    userId: "admin",
    category: "system_alert",
    priority: "medium",
    title: "New Expert Registration",
    titleKa: "ახალი ექსპერტის რეგისტრაცია",
    message: `${credential.fullName} (${credential.specialization}) has registered as an expert and awaits verification.`,
    messageKa: `${credential.fullNameKa || credential.fullName} (${credential.specialization}) დარეგისტრირდა როგორც ექსპერტი და ელოდება ვერიფიკაციას.`,
    metadata: { expertId: expert.id },
  });

  return expert;
}

/**
 * Verify an expert's credentials (admin function)
 */
export async function verifyExpertCredentials(
  expertId: number,
  verifiedBy: string,
  approved: boolean,
  notes?: string
): Promise<PrometheusExpertCredential | null> {
  const [updated] = await db
    .update(prometheusExpertCredentials)
    .set({
      verificationStatus: approved ? "verified" : "rejected",
      verifiedAt: new Date(),
      verifiedBy,
      metadata: notes ? { verificationNotes: notes } : undefined,
      updatedAt: new Date(),
    })
    .where(eq(prometheusExpertCredentials.id, expertId))
    .returning();

  if (updated) {
    // Notify the expert
    await createNotification({
      userId: updated.userId,
      category: "system_alert",
      priority: "high",
      title: approved ? "Expert Status Approved" : "Expert Status Not Approved",
      titleKa: approved ? "ექსპერტის სტატუსი დამტკიცებულია" : "ექსპერტის სტატუსი არ დამტკიცდა",
      message: approved
        ? "Your expert credentials have been verified. You can now review and verify knowledge."
        : `Your expert application was not approved. ${notes || "Please contact support for more information."}`,
      messageKa: approved
        ? "თქვენი ექსპერტის კვალიფიკაცია დადასტურებულია. ახლა შეგიძლიათ ცოდნის ვერიფიკაცია."
        : `თქვენი ექსპერტის განაცხადი არ დამტკიცდა. ${notes || "დამატებითი ინფორმაციისთვის დაუკავშირდით მხარდაჭერას."}`,
      metadata: { expertId: updated.id },
    });
  }

  return updated || null;
}

/**
 * Get expert profile with stats
 */
export async function getExpertProfile(
  expertId: number
): Promise<ExpertProfile | null> {
  const expert = await db.query.prometheusExpertCredentials.findFirst({
    where: eq(prometheusExpertCredentials.id, expertId),
  });

  if (!expert) return null;

  // Get recent reviews
  const recentReviews = await db.query.prometheusExpertReviews.findMany({
    where: eq(prometheusExpertReviews.expertId, expertId),
    orderBy: [desc(prometheusExpertReviews.createdAt)],
    limit: 10,
  });

  // Calculate stats
  const allReviews = await db.query.prometheusExpertReviews.findMany({
    where: eq(prometheusExpertReviews.expertId, expertId),
  });

  const stats: ExpertStats = {
    totalReviews: allReviews.length,
    verificationsApproved: allReviews.filter(r => r.verdict === "verified").length,
    correctionsSubmitted: allReviews.filter(r => r.reviewType === "correction").length,
    averageResponseTime: 24, // TODO: Calculate from actual data
    impactScore: expert.trustScore ?? 0.5,
  };

  return {
    ...expert,
    recentReviews,
    stats,
  };
}

/**
 * Get experts by specialization
 */
export async function getExpertsBySpecialization(
  specializations: string[]
): Promise<PrometheusExpertCredential[]> {
  return db.query.prometheusExpertCredentials.findMany({
    where: and(
      eq(prometheusExpertCredentials.verificationStatus, "verified"),
      eq(prometheusExpertCredentials.isActive, true),
      or(
        ...specializations.map(spec =>
          sql`${prometheusExpertCredentials.specialization} ILIKE ${`%${spec}%`}`
        )
      )
    ),
    orderBy: [desc(prometheusExpertCredentials.trustScore)],
  });
}

/**
 * Update expert trust score based on review quality
 */
export async function updateExpertTrustScore(
  expertId: number,
  adjustment: number
): Promise<void> {
  const expert = await db.query.prometheusExpertCredentials.findFirst({
    where: eq(prometheusExpertCredentials.id, expertId),
  });

  if (!expert) return;

  const newScore = Math.max(0, Math.min(1, (expert.trustScore ?? 0.5) + adjustment));

  await db
    .update(prometheusExpertCredentials)
    .set({
      trustScore: newScore,
      reviewCount: (expert.reviewCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(prometheusExpertCredentials.id, expertId));
}

// ============================================================================
// Review Queue Management
// ============================================================================

/**
 * Request expert review for a piece of knowledge
 */
export async function requestExpertReview(
  request: ReviewRequest
): Promise<number> {
  // Find target content based on type
  let targetContent = "";
  let targetContentKa: string | undefined;
  let confidence = 0;

  if (request.targetType === "memory") {
    const memory = await db.query.prometheusMemory.findFirst({
      where: eq(prometheusMemory.id, request.targetId),
    });
    if (memory) {
      targetContent = memory.content;
      targetContentKa = memory.contentKa ?? undefined;
      confidence = memory.confidence ?? 0;
    }
  } else if (request.targetType === "knowledge_node") {
    const node = await db.query.prometheusKnowledgeNodes.findFirst({
      where: eq(prometheusKnowledgeNodes.id, request.targetId),
    });
    if (node) {
      targetContent = `${node.label}: ${node.description || ""}`;
      targetContentKa = node.descriptionKa ?? undefined;
      confidence = node.confidence ?? 0;
    }
  }

  // Find suitable experts
  const experts = request.requiredExpertise
    ? await getExpertsBySpecialization(request.requiredExpertise)
    : await db.query.prometheusExpertCredentials.findMany({
        where: and(
          eq(prometheusExpertCredentials.verificationStatus, "verified"),
          eq(prometheusExpertCredentials.isActive, true)
        ),
        limit: 5,
      });

  // Notify experts about the review request
  for (const expert of experts) {
    await createNotification({
      userId: expert.userId,
      prometheusId: request.prometheusId,
      category: "verification_complete",
      priority: request.urgency === "critical" ? "critical" : request.urgency === "high" ? "high" : "medium",
      title: "Expert Review Requested",
      titleKa: "მოთხოვნილია ექსპერტის შეფასება",
      message: `A ${request.targetType} requires your expert review: "${targetContent.substring(0, 100)}..."`,
      messageKa: `${request.targetType} საჭიროებს თქვენს ექსპერტულ შეფასებას: "${(targetContentKa || targetContent).substring(0, 100)}..."`,
      actionUrl: `/expert/review/${request.targetType}/${request.targetId}`,
      metadata: {
        targetType: request.targetType,
        targetId: request.targetId,
        urgency: request.urgency,
        context: request.context,
      },
    });
  }

  return experts.length;
}

/**
 * Get pending reviews for an expert
 */
export async function getPendingReviewsForExpert(
  expertId: number,
  limit: number = 20
): Promise<ReviewQueueItem[]> {
  const expert = await db.query.prometheusExpertCredentials.findFirst({
    where: eq(prometheusExpertCredentials.id, expertId),
  });

  if (!expert) return [];

  // Get memories that need review and match expert's expertise
  const memoriesNeedingReview = await db.query.prometheusMemory.findMany({
    where: and(
      sql`${prometheusMemory.metadata}->>'needsExpertReview' = 'true'`,
      sql`NOT EXISTS (
        SELECT 1 FROM prometheus_expert_reviews
        WHERE target_type = 'memory'
        AND target_id = ${prometheusMemory.id}
        AND expert_id = ${expertId}
      )`
    ),
    limit,
    orderBy: [desc(prometheusMemory.priority)],
  });

  const queueItems: ReviewQueueItem[] = memoriesNeedingReview.map((memory, index) => ({
    id: index + 1,
    request: {
      targetType: "memory" as const,
      targetId: memory.id,
      prometheusId: memory.prometheusId ?? 0,
      urgency: memory.priority === "critical" ? "critical" : "normal",
      context: memory.context ?? "",
    },
    targetContent: memory.content,
    targetContentKa: memory.contentKa ?? undefined,
    confidence: memory.confidence ?? 0,
    createdAt: memory.createdAt ?? new Date(),
    status: "pending" as const,
  }));

  return queueItems;
}

// ============================================================================
// Review Submission
// ============================================================================

/**
 * Submit an expert review
 */
export async function submitExpertReview(
  expertId: number,
  targetType: "memory" | "knowledge_node" | "prediction" | "insight",
  targetId: number,
  verdict: ReviewVerdict
): Promise<PrometheusExpertReview> {
  // Get original content
  let originalContent = "";
  let prometheusId: number | null = null;

  if (targetType === "memory") {
    const memory = await db.query.prometheusMemory.findFirst({
      where: eq(prometheusMemory.id, targetId),
    });
    if (memory) {
      originalContent = memory.content;
      prometheusId = memory.prometheusId;
    }
  } else if (targetType === "knowledge_node") {
    const node = await db.query.prometheusKnowledgeNodes.findFirst({
      where: eq(prometheusKnowledgeNodes.id, targetId),
    });
    if (node) {
      originalContent = `${node.label}: ${node.description || ""}`;
      prometheusId = node.prometheusId;
    }
  }

  // Create the review
  const [review] = await db
    .insert(prometheusExpertReviews)
    .values({
      expertId,
      targetType,
      targetId,
      prometheusId,
      reviewType: verdict.suggestedContent ? "correction" : "verification",
      verdict: verdict.verdict,
      confidenceAdjustment: verdict.confidenceAdjustment,
      originalContent,
      suggestedContent: verdict.suggestedContent,
      suggestedContentKa: verdict.suggestedContentKa,
      reasoning: verdict.reasoning,
      reasoningKa: verdict.reasoningKa,
      evidenceLinks: verdict.evidenceLinks,
      clinicalRelevance: verdict.clinicalRelevance,
      safetyImplications: verdict.safetyImplications,
      isApplied: false,
    })
    .returning();

  // Update expert stats
  await updateExpertTrustScore(expertId, 0.01); // Small positive adjustment for completing review

  // Apply review if it's a verification or minor correction
  if (verdict.verdict === "verified" || verdict.confidenceAdjustment > 0) {
    await applyExpertReview(review.id);
  }

  // Notify about critical safety implications
  if (verdict.safetyImplications === "critical") {
    await createNotification({
      userId: "admin",
      prometheusId: prometheusId ?? undefined,
      category: "system_alert",
      priority: "critical",
      title: "Critical Safety Issue Identified",
      titleKa: "კრიტიკული უსაფრთხოების პრობლემა გამოვლინდა",
      message: `Expert review identified critical safety implications for ${targetType} #${targetId}: ${verdict.reasoning}`,
      messageKa: `ექსპერტის შეფასებამ გამოავლინა კრიტიკული უსაფრთხოების შედეგები ${targetType} #${targetId}-სთვის: ${verdict.reasoningKa || verdict.reasoning}`,
      metadata: { reviewId: review.id, targetType, targetId },
    });
  }

  return review;
}

/**
 * Apply an expert review to update the knowledge
 */
export async function applyExpertReview(
  reviewId: number
): Promise<boolean> {
  const review = await db.query.prometheusExpertReviews.findFirst({
    where: eq(prometheusExpertReviews.id, reviewId),
  });

  if (!review || review.isApplied) return false;

  // Apply confidence adjustment and content changes
  if (review.targetType === "memory") {
    const memory = await db.query.prometheusMemory.findFirst({
      where: eq(prometheusMemory.id, review.targetId),
    });

    if (memory) {
      const newConfidence = Math.max(0, Math.min(1, (memory.confidence ?? 0.5) + (review.confidenceAdjustment ?? 0)));

      await db
        .update(prometheusMemory)
        .set({
          confidence: newConfidence,
          content: review.suggestedContent || memory.content,
          contentKa: review.suggestedContentKa || memory.contentKa,
          metadata: {
            ...(memory.metadata as object || {}),
            expertVerified: true,
            expertReviewId: review.id,
            verifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(prometheusMemory.id, review.targetId));
    }
  } else if (review.targetType === "knowledge_node") {
    const node = await db.query.prometheusKnowledgeNodes.findFirst({
      where: eq(prometheusKnowledgeNodes.id, review.targetId),
    });

    if (node) {
      const newConfidence = Math.max(0, Math.min(1, (node.confidence ?? 0.5) + (review.confidenceAdjustment ?? 0)));

      // Update certainty level based on new confidence
      let certaintyLevel = node.certaintyLevel;
      if (newConfidence >= 0.9) certaintyLevel = "truth";
      else if (newConfidence >= 0.75) certaintyLevel = "knowledge";
      else if (newConfidence >= 0.6) certaintyLevel = "belief";
      else if (newConfidence >= 0.4) certaintyLevel = "hypothesis";
      else if (newConfidence >= 0.2) certaintyLevel = "aware";
      else certaintyLevel = "unknown";

      await db
        .update(prometheusKnowledgeNodes)
        .set({
          confidence: newConfidence,
          certaintyLevel,
          description: review.suggestedContent || node.description,
          descriptionKa: review.suggestedContentKa || node.descriptionKa,
          metadata: {
            ...(node.metadata as object || {}),
            expertVerified: true,
            expertReviewId: review.id,
            verifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(prometheusKnowledgeNodes.id, review.targetId));
    }
  }

  // Mark review as applied
  await db
    .update(prometheusExpertReviews)
    .set({
      isApplied: true,
      appliedAt: new Date(),
    })
    .where(eq(prometheusExpertReviews.id, reviewId));

  return true;
}

// ============================================================================
// Review Analytics
// ============================================================================

/**
 * Get review statistics for a Prometheus instance
 */
export async function getReviewStatistics(prometheusId: number): Promise<{
  totalReviews: number;
  verified: number;
  rejected: number;
  pendingReviews: number;
  averageConfidenceBoost: number;
  topExperts: Array<{ expert: PrometheusExpertCredential; reviewCount: number }>;
}> {
  const reviews = await db.query.prometheusExpertReviews.findMany({
    where: eq(prometheusExpertReviews.prometheusId, prometheusId),
  });

  const verified = reviews.filter(r => r.verdict === "verified").length;
  const rejected = reviews.filter(r => r.verdict === "rejected").length;

  const confidenceBoosts = reviews
    .filter(r => r.confidenceAdjustment && r.confidenceAdjustment > 0)
    .map(r => r.confidenceAdjustment!);

  const averageConfidenceBoost = confidenceBoosts.length > 0
    ? confidenceBoosts.reduce((a, b) => a + b, 0) / confidenceBoosts.length
    : 0;

  // Count reviews by expert
  const expertReviewCounts = new Map<number, number>();
  for (const review of reviews) {
    if (review.expertId) {
      expertReviewCounts.set(
        review.expertId,
        (expertReviewCounts.get(review.expertId) || 0) + 1
      );
    }
  }

  // Get top experts
  const topExpertIds = Array.from(expertReviewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const topExperts: Array<{ expert: PrometheusExpertCredential; reviewCount: number }> = [];
  for (const expertId of topExpertIds) {
    const expert = await db.query.prometheusExpertCredentials.findFirst({
      where: eq(prometheusExpertCredentials.id, expertId),
    });
    if (expert) {
      topExperts.push({
        expert,
        reviewCount: expertReviewCounts.get(expertId) || 0,
      });
    }
  }

  // Count pending reviews (memories/nodes marked for review but not yet reviewed)
  const pendingMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.metadata}->>'needsExpertReview' = 'true'`
    ),
  });

  const reviewedMemoryIds = new Set(
    reviews.filter(r => r.targetType === "memory").map(r => r.targetId)
  );

  const pendingReviews = pendingMemories.filter(m => !reviewedMemoryIds.has(m.id)).length;

  return {
    totalReviews: reviews.length,
    verified,
    rejected,
    pendingReviews,
    averageConfidenceBoost,
    topExperts,
  };
}

/**
 * Flag content for expert review
 */
export async function flagForExpertReview(
  targetType: "memory" | "knowledge_node",
  targetId: number,
  reason: string
): Promise<void> {
  if (targetType === "memory") {
    const memory = await db.query.prometheusMemory.findFirst({
      where: eq(prometheusMemory.id, targetId),
    });

    if (memory) {
      await db
        .update(prometheusMemory)
        .set({
          metadata: {
            ...(memory.metadata as object || {}),
            needsExpertReview: true,
            reviewReason: reason,
            flaggedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(prometheusMemory.id, targetId));
    }
  } else if (targetType === "knowledge_node") {
    const node = await db.query.prometheusKnowledgeNodes.findFirst({
      where: eq(prometheusKnowledgeNodes.id, targetId),
    });

    if (node) {
      await db
        .update(prometheusKnowledgeNodes)
        .set({
          metadata: {
            ...(node.metadata as object || {}),
            needsExpertReview: true,
            reviewReason: reason,
            flaggedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(prometheusKnowledgeNodes.id, targetId));
    }
  }
}

/**
 * Auto-flag low-confidence or contradictory content for review
 */
export async function autoFlagForReview(prometheusId: number): Promise<number> {
  let flagged = 0;

  // Flag low-confidence memories
  const lowConfidenceMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.confidence} < 0.4`,
      sql`${prometheusMemory.priority} IN ('critical', 'high')`,
      sql`(${prometheusMemory.metadata}->>'needsExpertReview') IS NULL OR ${prometheusMemory.metadata}->>'needsExpertReview' != 'true'`
    ),
  });

  for (const memory of lowConfidenceMemories) {
    await flagForExpertReview("memory", memory.id, "Low confidence on high-priority content");
    flagged++;
  }

  // Flag low-confidence knowledge nodes
  const lowConfidenceNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      sql`${prometheusKnowledgeNodes.confidence} < 0.4`,
      sql`${prometheusKnowledgeNodes.nodeType} IN ('fact', 'procedure')`,
      sql`(${prometheusKnowledgeNodes.metadata}->>'needsExpertReview') IS NULL OR ${prometheusKnowledgeNodes.metadata}->>'needsExpertReview' != 'true'`
    ),
  });

  for (const node of lowConfidenceNodes) {
    await flagForExpertReview("knowledge_node", node.id, "Low confidence on factual/procedural content");
    flagged++;
  }

  return flagged;
}
