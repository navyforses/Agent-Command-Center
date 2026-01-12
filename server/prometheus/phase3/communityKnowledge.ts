/**
 * PROMETHEUS Phase 3: Community Knowledge Sharing
 *
 * Anonymized knowledge sharing system that allows families to benefit
 * from collective learnings while protecting privacy.
 *
 * "ერთად ვართ ძლიერები - ცოდნა იზრდება გაზიარებით"
 * "Together we are strong - knowledge grows through sharing"
 */

import { db } from "../../db";
import {
  prometheusSharedKnowledge,
  prometheusKnowledgeContributions,
  prometheusKnowledgeVotes,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusState,
  prometheusExpertCredentials,
  type InsertPrometheusSharedKnowledge,
  type InsertPrometheusKnowledgeContribution,
  type InsertPrometheusKnowledgeVote,
  type PrometheusSharedKnowledge,
  type PrometheusKnowledgeContribution,
  type PrometheusKnowledgeVote,
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte, or, ne, isNotNull, asc } from "drizzle-orm";
import { createNotification } from "../phase2/notificationSystem";

// ============================================================================
// Types
// ============================================================================

export interface SharedKnowledgeWithStats extends PrometheusSharedKnowledge {
  score: number;
  contributions?: PrometheusKnowledgeContribution[];
  userVote?: "upvote" | "downvote" | null;
}

export interface KnowledgeSearchParams {
  query?: string;
  category?: string;
  knowledgeType?: string;
  verificationStatus?: string;
  conditions?: string[];
  ageRangeMonths?: { min?: number; max?: number };
  sortBy?: "relevance" | "votes" | "recent" | "verified";
  limit?: number;
  offset?: number;
}

export interface AnonymizationResult {
  originalText: string;
  anonymizedText: string;
  removedEntities: Array<{ type: string; original: string; replacement: string }>;
}

export interface KnowledgeContributionRequest {
  sharedKnowledgeId?: number; // If enhancing existing
  knowledgeType: string;
  category: string;
  title: string;
  titleKa?: string;
  content: string;
  contentKa?: string;
  sourceReferences?: string[];
  tags?: string[];
  applicableConditions?: string[];
  ageRangeMin?: number;
  ageRangeMax?: number;
}

// ============================================================================
// Anonymization Engine
// ============================================================================

/**
 * Anonymize text to remove identifying information
 */
export function anonymizeText(text: string): AnonymizationResult {
  const removedEntities: Array<{ type: string; original: string; replacement: string }> = [];

  let anonymized = text;

  // Remove names (Georgian and English patterns)
  const namePatterns = [
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, // English names
    /\b[ა-ჰ][ა-ჰ]+\s+[ა-ჰ][ა-ჰ]+\b/g, // Georgian names
  ];

  namePatterns.forEach(pattern => {
    const matches = anonymized.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const replacement = "[Child]";
        removedEntities.push({ type: "name", original: match, replacement });
        anonymized = anonymized.replace(match, replacement);
      });
    }
  });

  // Remove dates of birth
  const dobPatterns = [
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/g,
  ];

  dobPatterns.forEach(pattern => {
    const matches = anonymized.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const replacement = "[Date]";
        removedEntities.push({ type: "date", original: match, replacement });
        anonymized = anonymized.replace(match, replacement);
      });
    }
  });

  // Remove locations/addresses
  const locationPatterns = [
    /\b\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln)\b/gi,
    /\b[A-Z][a-z]+,\s+[A-Z]{2}\s+\d{5}\b/g, // City, ST ZIP
  ];

  locationPatterns.forEach(pattern => {
    const matches = anonymized.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const replacement = "[Location]";
        removedEntities.push({ type: "location", original: match, replacement });
        anonymized = anonymized.replace(match, replacement);
      });
    }
  });

  // Remove hospital/clinic names (common patterns)
  const facilityPatterns = [
    /\b[A-Z][a-z]+\s+(Hospital|Medical Center|Clinic|Children's Hospital)\b/gi,
    /\b(Dr\.|Doctor)\s+[A-Z][a-z]+\b/gi,
  ];

  facilityPatterns.forEach(pattern => {
    const matches = anonymized.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const replacement = match.toLowerCase().includes("dr") ? "[Doctor]" : "[Medical Facility]";
        removedEntities.push({ type: "facility", original: match, replacement });
        anonymized = anonymized.replace(match, replacement);
      });
    }
  });

  // Remove phone numbers
  anonymized = anonymized.replace(
    /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    (match) => {
      removedEntities.push({ type: "phone", original: match, replacement: "[Phone]" });
      return "[Phone]";
    }
  );

  // Remove email addresses
  anonymized = anonymized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    (match) => {
      removedEntities.push({ type: "email", original: match, replacement: "[Email]" });
      return "[Email]";
    }
  );

  return {
    originalText: text,
    anonymizedText: anonymized,
    removedEntities,
  };
}

// ============================================================================
// Knowledge Sharing
// ============================================================================

/**
 * Share knowledge from a Prometheus instance to the community
 */
export async function shareKnowledge(
  prometheusId: number,
  userId: string,
  memoryId?: number,
  nodeId?: number,
  additionalContext?: string
): Promise<PrometheusSharedKnowledge | null> {
  let content = "";
  let contentKa: string | undefined;
  let confidenceLevel = 0.5;
  let category = "general";
  let knowledgeType = "treatment_insight";
  let tags: string[] = [];

  // Get content from memory or knowledge node
  if (memoryId) {
    const memory = await db.query.prometheusMemory.findFirst({
      where: eq(prometheusMemory.id, memoryId),
    });
    if (!memory) return null;

    content = memory.content;
    contentKa = memory.contentKa ?? undefined;
    confidenceLevel = memory.confidence ?? 0.5;
    category = memory.domain ?? "general";
    knowledgeType = memory.memoryType === "episodic" ? "treatment_insight" : "research_finding";
    tags = memory.tags ?? [];
  } else if (nodeId) {
    const node = await db.query.prometheusKnowledgeNodes.findFirst({
      where: eq(prometheusKnowledgeNodes.id, nodeId),
    });
    if (!node) return null;

    content = `${node.label}: ${node.description || ""}`;
    contentKa = node.descriptionKa ? `${node.label}: ${node.descriptionKa}` : undefined;
    confidenceLevel = node.confidence ?? 0.5;
    category = node.nodeType ?? "general";
    knowledgeType = node.nodeType === "procedure" ? "protocol" : "pattern";
  }

  // Anonymize content
  const anonymized = anonymizeText(content);
  const anonymizedKa = contentKa ? anonymizeText(contentKa) : undefined;

  // Generate title from content
  const title = content.substring(0, 100) + (content.length > 100 ? "..." : "");
  const titleKa = contentKa ? contentKa.substring(0, 100) + (contentKa.length > 100 ? "..." : "") : undefined;

  // Create shared knowledge entry
  const [shared] = await db
    .insert(prometheusSharedKnowledge)
    .values({
      sourcePrometheusId: prometheusId,
      knowledgeType,
      category,
      title: anonymized.anonymizedText.substring(0, 100),
      titleKa: anonymizedKa?.anonymizedText.substring(0, 100),
      content: anonymized.anonymizedText,
      contentKa: anonymizedKa?.anonymizedText,
      anonymizedContext: additionalContext ? anonymizeText(additionalContext).anonymizedText : undefined,
      confidenceLevel,
      verificationStatus: "unverified",
      tags,
      isPublic: false, // Requires review before public
      metadata: {
        sourceMemoryId: memoryId,
        sourceNodeId: nodeId,
        anonymizationDetails: {
          entitiesRemoved: anonymized.removedEntities.length,
        },
      },
    })
    .returning();

  // Notify about new shared knowledge
  await createNotification({
    userId: "admin",
    prometheusId,
    category: "knowledge_milestone",
    priority: "low",
    title: "New Knowledge Shared",
    titleKa: "ახალი ცოდნა გაზიარდა",
    message: `Knowledge has been shared to the community pool and awaits review.`,
    messageKa: `ცოდნა გაზიარდა საზოგადოების ფონდში და ელოდება განხილვას.`,
    metadata: { sharedKnowledgeId: shared.id },
  });

  return shared;
}

/**
 * Search shared knowledge
 */
export async function searchSharedKnowledge(
  params: KnowledgeSearchParams,
  userId?: string
): Promise<SharedKnowledgeWithStats[]> {
  const conditions = [
    eq(prometheusSharedKnowledge.isPublic, true),
  ];

  if (params.category) {
    conditions.push(eq(prometheusSharedKnowledge.category, params.category));
  }

  if (params.knowledgeType) {
    conditions.push(eq(prometheusSharedKnowledge.knowledgeType, params.knowledgeType));
  }

  if (params.verificationStatus) {
    conditions.push(eq(prometheusSharedKnowledge.verificationStatus, params.verificationStatus));
  }

  if (params.query) {
    conditions.push(
      or(
        sql`${prometheusSharedKnowledge.title} ILIKE ${`%${params.query}%`}`,
        sql`${prometheusSharedKnowledge.content} ILIKE ${`%${params.query}%`}`,
        sql`${params.query} = ANY(${prometheusSharedKnowledge.tags})`
      )!
    );
  }

  if (params.conditions && params.conditions.length > 0) {
    conditions.push(
      sql`${prometheusSharedKnowledge.applicableConditions} && ARRAY[${sql.join(params.conditions.map(c => sql`${c}`), sql`, `)}]::text[]`
    );
  }

  if (params.ageRangeMonths?.min !== undefined) {
    conditions.push(
      or(
        isNotNull(prometheusSharedKnowledge.ageRangeMax),
        gte(prometheusSharedKnowledge.ageRangeMax, params.ageRangeMonths.min)
      )!
    );
  }

  if (params.ageRangeMonths?.max !== undefined) {
    conditions.push(
      or(
        isNotNull(prometheusSharedKnowledge.ageRangeMin),
        lte(prometheusSharedKnowledge.ageRangeMin, params.ageRangeMonths.max)
      )!
    );
  }

  // Determine sort order
  let orderBy;
  switch (params.sortBy) {
    case "votes":
      orderBy = [desc(prometheusSharedKnowledge.communityVoteScore)];
      break;
    case "recent":
      orderBy = [desc(prometheusSharedKnowledge.createdAt)];
      break;
    case "verified":
      orderBy = [
        desc(sql`CASE WHEN ${prometheusSharedKnowledge.verificationStatus} = 'expert_verified' THEN 3 WHEN ${prometheusSharedKnowledge.verificationStatus} = 'community_verified' THEN 2 ELSE 1 END`),
        desc(prometheusSharedKnowledge.communityVoteScore),
      ];
      break;
    default:
      orderBy = [desc(prometheusSharedKnowledge.communityVoteScore)];
  }

  const results = await db.query.prometheusSharedKnowledge.findMany({
    where: and(...conditions),
    orderBy,
    limit: params.limit || 20,
    offset: params.offset || 0,
  });

  // Enhance with user vote if userId provided
  const enhanced: SharedKnowledgeWithStats[] = await Promise.all(
    results.map(async (knowledge) => {
      let userVote: "upvote" | "downvote" | null = null;

      if (userId) {
        const vote = await db.query.prometheusKnowledgeVotes.findFirst({
          where: and(
            eq(prometheusKnowledgeVotes.sharedKnowledgeId, knowledge.id),
            eq(prometheusKnowledgeVotes.userId, userId)
          ),
        });
        userVote = vote ? (vote.voteType as "upvote" | "downvote") : null;
      }

      return {
        ...knowledge,
        score: (knowledge.upvotes ?? 0) - (knowledge.downvotes ?? 0),
        userVote,
      };
    })
  );

  return enhanced;
}

/**
 * Get knowledge by category with statistics
 */
export async function getKnowledgeByCategory(): Promise<
  Array<{ category: string; count: number; verifiedCount: number; avgScore: number }>
> {
  const results = await db
    .select({
      category: prometheusSharedKnowledge.category,
      count: sql<number>`COUNT(*)::int`,
      verifiedCount: sql<number>`COUNT(*) FILTER (WHERE ${prometheusSharedKnowledge.verificationStatus} = 'expert_verified')::int`,
      avgScore: sql<number>`AVG(${prometheusSharedKnowledge.communityVoteScore})::float`,
    })
    .from(prometheusSharedKnowledge)
    .where(eq(prometheusSharedKnowledge.isPublic, true))
    .groupBy(prometheusSharedKnowledge.category)
    .orderBy(desc(sql`COUNT(*)`));

  return results;
}

// ============================================================================
// Voting System
// ============================================================================

/**
 * Vote on shared knowledge
 */
export async function voteOnKnowledge(
  userId: string,
  sharedKnowledgeId: number,
  voteType: "upvote" | "downvote",
  reason?: string,
  comment?: string
): Promise<PrometheusKnowledgeVote> {
  // Check for existing vote
  const existingVote = await db.query.prometheusKnowledgeVotes.findFirst({
    where: and(
      eq(prometheusKnowledgeVotes.sharedKnowledgeId, sharedKnowledgeId),
      eq(prometheusKnowledgeVotes.userId, userId)
    ),
  });

  if (existingVote) {
    // Update existing vote
    const [updated] = await db
      .update(prometheusKnowledgeVotes)
      .set({ voteType, reason, comment })
      .where(eq(prometheusKnowledgeVotes.id, existingVote.id))
      .returning();

    // Update vote counts
    await updateVoteCounts(sharedKnowledgeId);

    return updated;
  }

  // Create new vote
  const [vote] = await db
    .insert(prometheusKnowledgeVotes)
    .values({
      userId,
      sharedKnowledgeId,
      voteType,
      reason,
      comment,
    })
    .returning();

  // Update vote counts
  await updateVoteCounts(sharedKnowledgeId);

  // Check for community verification threshold
  await checkCommunityVerification(sharedKnowledgeId);

  return vote;
}

/**
 * Remove vote
 */
export async function removeVote(
  userId: string,
  sharedKnowledgeId: number
): Promise<boolean> {
  const deleted = await db
    .delete(prometheusKnowledgeVotes)
    .where(
      and(
        eq(prometheusKnowledgeVotes.sharedKnowledgeId, sharedKnowledgeId),
        eq(prometheusKnowledgeVotes.userId, userId)
      )
    )
    .returning();

  if (deleted.length > 0) {
    await updateVoteCounts(sharedKnowledgeId);
    return true;
  }

  return false;
}

/**
 * Update vote counts for shared knowledge
 */
async function updateVoteCounts(sharedKnowledgeId: number): Promise<void> {
  const votes = await db.query.prometheusKnowledgeVotes.findMany({
    where: eq(prometheusKnowledgeVotes.sharedKnowledgeId, sharedKnowledgeId),
  });

  const upvotes = votes.filter(v => v.voteType === "upvote").length;
  const downvotes = votes.filter(v => v.voteType === "downvote").length;

  await db
    .update(prometheusSharedKnowledge)
    .set({
      upvotes,
      downvotes,
      communityVoteScore: upvotes - downvotes,
      updatedAt: new Date(),
    })
    .where(eq(prometheusSharedKnowledge.id, sharedKnowledgeId));
}

/**
 * Check if knowledge qualifies for community verification
 */
async function checkCommunityVerification(sharedKnowledgeId: number): Promise<void> {
  const knowledge = await db.query.prometheusSharedKnowledge.findFirst({
    where: eq(prometheusSharedKnowledge.id, sharedKnowledgeId),
  });

  if (!knowledge || knowledge.verificationStatus === "expert_verified") return;

  // Community verification threshold: 10+ votes with 80%+ upvotes
  const totalVotes = (knowledge.upvotes ?? 0) + (knowledge.downvotes ?? 0);
  const upvoteRatio = totalVotes > 0 ? (knowledge.upvotes ?? 0) / totalVotes : 0;

  if (totalVotes >= 10 && upvoteRatio >= 0.8) {
    await db
      .update(prometheusSharedKnowledge)
      .set({
        verificationStatus: "community_verified",
        updatedAt: new Date(),
      })
      .where(eq(prometheusSharedKnowledge.id, sharedKnowledgeId));
  }
}

// ============================================================================
// Contributions
// ============================================================================

/**
 * Submit a knowledge contribution
 */
export async function submitContribution(
  userId: string,
  contribution: KnowledgeContributionRequest
): Promise<PrometheusKnowledgeContribution> {
  // Anonymize content
  const anonymizedContent = anonymizeText(contribution.content);
  const anonymizedContentKa = contribution.contentKa
    ? anonymizeText(contribution.contentKa)
    : undefined;

  // If new knowledge (not enhancing existing)
  if (!contribution.sharedKnowledgeId) {
    // Create new shared knowledge first
    const [shared] = await db
      .insert(prometheusSharedKnowledge)
      .values({
        knowledgeType: contribution.knowledgeType,
        category: contribution.category,
        title: contribution.title,
        titleKa: contribution.titleKa,
        content: anonymizedContent.anonymizedText,
        contentKa: anonymizedContentKa?.anonymizedText,
        confidenceLevel: 0.5,
        verificationStatus: "unverified",
        sourceReferences: contribution.sourceReferences,
        tags: contribution.tags,
        applicableConditions: contribution.applicableConditions,
        ageRangeMin: contribution.ageRangeMin,
        ageRangeMax: contribution.ageRangeMax,
        isPublic: false,
      })
      .returning();

    contribution.sharedKnowledgeId = shared.id;
  }

  // Create contribution record
  const [contributionRecord] = await db
    .insert(prometheusKnowledgeContributions)
    .values({
      userId,
      sharedKnowledgeId: contribution.sharedKnowledgeId,
      contributionType: contribution.sharedKnowledgeId ? "enhancement" : "original",
      content: anonymizedContent.anonymizedText,
      contentKa: anonymizedContentKa?.anonymizedText,
      language: contribution.contentKa ? "ka" : "en",
      status: "pending",
    })
    .returning();

  // Notify for review
  await createNotification({
    userId: "admin",
    category: "system_alert",
    priority: "low",
    title: "New Knowledge Contribution",
    titleKa: "ახალი ცოდნის წვლილი",
    message: `A user has submitted a knowledge contribution that needs review.`,
    messageKa: `მომხმარებელმა წარადგინა ცოდნის წვლილი, რომელიც საჭიროებს განხილვას.`,
    metadata: { contributionId: contributionRecord.id },
  });

  return contributionRecord;
}

/**
 * Review a contribution (expert/admin)
 */
export async function reviewContribution(
  contributionId: number,
  reviewerId: number,
  approved: boolean,
  notes?: string
): Promise<PrometheusKnowledgeContribution | null> {
  const [updated] = await db
    .update(prometheusKnowledgeContributions)
    .set({
      status: approved ? "approved" : "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    })
    .where(eq(prometheusKnowledgeContributions.id, contributionId))
    .returning();

  if (!updated) return null;

  // If approved and it's an enhancement, update the shared knowledge
  if (approved && updated.sharedKnowledgeId) {
    const contribution = updated;

    // Get current shared knowledge
    const existing = await db.query.prometheusSharedKnowledge.findFirst({
      where: eq(prometheusSharedKnowledge.id, contribution.sharedKnowledgeId),
    });

    if (existing) {
      // If it's the first contribution (original), make it public
      if (contribution.contributionType === "original") {
        await db
          .update(prometheusSharedKnowledge)
          .set({
            isPublic: true,
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(prometheusSharedKnowledge.id, contribution.sharedKnowledgeId));
      }
      // If enhancement, could append or merge content
    }
  }

  // Notify contributor
  await createNotification({
    userId: updated.userId,
    category: approved ? "knowledge_milestone" : "system_alert",
    priority: "medium",
    title: approved ? "Contribution Approved" : "Contribution Not Approved",
    titleKa: approved ? "წვლილი დამტკიცებულია" : "წვლილი არ დამტკიცდა",
    message: approved
      ? "Your knowledge contribution has been approved and is now shared with the community."
      : `Your contribution was not approved. ${notes || "Please review and try again."}`,
    messageKa: approved
      ? "თქვენი ცოდნის წვლილი დამტკიცდა და ახლა გაზიარებულია საზოგადოებასთან."
      : `თქვენი წვლილი არ დამტკიცდა. ${notes || "გთხოვთ გადახედოთ და სცადოთ ხელახლა."}`,
    metadata: { contributionId },
  });

  return updated;
}

/**
 * Get pending contributions for review
 */
export async function getPendingContributions(
  limit: number = 20
): Promise<PrometheusKnowledgeContribution[]> {
  return db.query.prometheusKnowledgeContributions.findMany({
    where: eq(prometheusKnowledgeContributions.status, "pending"),
    orderBy: [asc(prometheusKnowledgeContributions.createdAt)],
    limit,
  });
}

// ============================================================================
// Knowledge Publishing
// ============================================================================

/**
 * Publish shared knowledge (make public)
 */
export async function publishKnowledge(
  sharedKnowledgeId: number,
  publishedBy: string
): Promise<PrometheusSharedKnowledge | null> {
  const [published] = await db
    .update(prometheusSharedKnowledge)
    .set({
      isPublic: true,
      publishedAt: new Date(),
      updatedAt: new Date(),
      metadata: sql`COALESCE(${prometheusSharedKnowledge.metadata}, '{}'::jsonb) || ${JSON.stringify({ publishedBy })}::jsonb`,
    })
    .where(eq(prometheusSharedKnowledge.id, sharedKnowledgeId))
    .returning();

  return published || null;
}

/**
 * Record a view on shared knowledge
 */
export async function recordView(sharedKnowledgeId: number): Promise<void> {
  await db
    .update(prometheusSharedKnowledge)
    .set({
      viewCount: sql`COALESCE(${prometheusSharedKnowledge.viewCount}, 0) + 1`,
    })
    .where(eq(prometheusSharedKnowledge.id, sharedKnowledgeId));
}

/**
 * Record a citation (when knowledge is referenced by another Prometheus)
 */
export async function recordCitation(
  sharedKnowledgeId: number,
  citingPrometheusId: number
): Promise<void> {
  await db
    .update(prometheusSharedKnowledge)
    .set({
      citationCount: sql`COALESCE(${prometheusSharedKnowledge.citationCount}, 0) + 1`,
      metadata: sql`COALESCE(${prometheusSharedKnowledge.metadata}, '{}'::jsonb) || ${JSON.stringify({
        citations: [{ prometheusId: citingPrometheusId, citedAt: new Date().toISOString() }],
      })}::jsonb`,
    })
    .where(eq(prometheusSharedKnowledge.id, sharedKnowledgeId));
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get community knowledge statistics
 */
export async function getCommunityStats(): Promise<{
  totalKnowledge: number;
  expertVerified: number;
  communityVerified: number;
  totalContributions: number;
  totalVotes: number;
  topCategories: Array<{ category: string; count: number }>;
  recentActivity: number;
}> {
  const totalKnowledge = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(prometheusSharedKnowledge)
    .where(eq(prometheusSharedKnowledge.isPublic, true));

  const expertVerified = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(prometheusSharedKnowledge)
    .where(
      and(
        eq(prometheusSharedKnowledge.isPublic, true),
        eq(prometheusSharedKnowledge.verificationStatus, "expert_verified")
      )
    );

  const communityVerified = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(prometheusSharedKnowledge)
    .where(
      and(
        eq(prometheusSharedKnowledge.isPublic, true),
        eq(prometheusSharedKnowledge.verificationStatus, "community_verified")
      )
    );

  const totalContributions = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(prometheusKnowledgeContributions);

  const totalVotes = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(prometheusKnowledgeVotes);

  const topCategories = await db
    .select({
      category: prometheusSharedKnowledge.category,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(prometheusSharedKnowledge)
    .where(eq(prometheusSharedKnowledge.isPublic, true))
    .groupBy(prometheusSharedKnowledge.category)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(5);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentActivity = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(prometheusSharedKnowledge)
    .where(gte(prometheusSharedKnowledge.createdAt, weekAgo));

  return {
    totalKnowledge: totalKnowledge[0]?.count ?? 0,
    expertVerified: expertVerified[0]?.count ?? 0,
    communityVerified: communityVerified[0]?.count ?? 0,
    totalContributions: totalContributions[0]?.count ?? 0,
    totalVotes: totalVotes[0]?.count ?? 0,
    topCategories,
    recentActivity: recentActivity[0]?.count ?? 0,
  };
}
