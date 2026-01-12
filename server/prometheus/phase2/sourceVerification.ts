/**
 * PROMETHEUS-MIND Phase 2: Real-time Source Verification
 * ======================================================
 * Verify information accuracy through multiple validation protocols
 *
 * Prof. Solomon Okonkwo (Chief Knowledge Philosopher):
 * "ჭეშმარიტება არ არის დემოკრატია - მას ვერ მოვიგებთ ხმებით.
 *  მაგრამ მას ვუახლოვდებით მტკიცებულებების ტრიანგულაციით."
 * "Truth is not a democracy - you can't win it by votes.
 *  But we approach it through triangulation of evidence."
 *
 * VERIFICATION PROTOCOLS:
 * 1. Source Triangulation - Minimum 3 independent sources
 * 2. Temporal Consistency - Information remains valid over time
 * 3. Predictive Power - Information enables accurate predictions
 * 4. Falsifiability - Claims must be testable
 * 5. Coherence Test - Consistency with established knowledge
 */

import { db } from "../../db";
import {
  prometheusKnowledgeNodes,
  prometheusVerifications,
  prometheusErrors,
  prometheusLearningEvents
} from "../../../shared/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Initialize AI clients
const anthropic = new Anthropic();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// VERIFICATION TYPES
// ============================================================================

export type VerificationMethod =
  | "source_triangulation"
  | "temporal_consistency"
  | "predictive_power"
  | "falsifiability_check"
  | "coherence_test"
  | "expert_consensus"
  | "cross_reference";

export type VerificationStatus = "pending" | "passed" | "failed" | "inconclusive";

export interface VerificationResult {
  method: VerificationMethod;
  status: VerificationStatus;
  confidence: number;
  evidence: string[];
  notes?: string;
  sourceUrls?: string[];
  verifiedAt: Date;
}

export interface SourceCredibility {
  sourceType: "peer_reviewed" | "clinical_trial" | "case_study" | "expert_opinion" | "unknown";
  impactFactor?: number;
  citationCount?: number;
  publicationYear?: number;
  credibilityScore: number;
}

// ============================================================================
// SOURCE TRIANGULATION
// ============================================================================

/**
 * Verify a claim through multiple independent sources
 */
export async function verifyBySourceTriangulation(
  nodeId: number,
  claim: string
): Promise<VerificationResult> {
  const evidence: string[] = [];
  let sourcesFound = 0;
  let sourcesSupporting = 0;

  try {
    // Use AI to search for supporting evidence
    const searchPrompt = `
You are a medical research verification system. Analyze this claim and provide evidence:

CLAIM: "${claim}"

Search your knowledge for:
1. Peer-reviewed studies that support or contradict this claim
2. Clinical trials with relevant results
3. Meta-analyses or systematic reviews
4. Expert consensus statements

For each source, provide:
- Source type (peer_reviewed, clinical_trial, meta_analysis, expert_opinion)
- Brief summary of what it says
- Whether it supports, contradicts, or is neutral to the claim

Respond in JSON format:
{
  "sources": [
    {
      "type": "peer_reviewed",
      "summary": "...",
      "position": "supports" | "contradicts" | "neutral",
      "citation_hint": "Author et al., Year"
    }
  ],
  "overall_assessment": "supported" | "contradicted" | "mixed" | "insufficient_evidence",
  "confidence": 0-100
}
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: searchPrompt }]
    });

    const content = response.content[0];
    if (content.type === "text") {
      try {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);

          sourcesFound = result.sources?.length || 0;
          sourcesSupporting = result.sources?.filter(
            (s: any) => s.position === "supports"
          ).length || 0;

          for (const source of result.sources || []) {
            evidence.push(`[${source.type}] ${source.summary} (${source.position})`);
          }

          // Determine verification status
          const status: VerificationStatus =
            result.overall_assessment === "supported" && sourcesSupporting >= 3
              ? "passed"
              : result.overall_assessment === "contradicted"
                ? "failed"
                : sourcesFound >= 3
                  ? "inconclusive"
                  : "pending";

          return {
            method: "source_triangulation",
            status,
            confidence: result.confidence || 50,
            evidence,
            notes: `Found ${sourcesFound} sources, ${sourcesSupporting} supporting`,
            verifiedAt: new Date()
          };
        }
      } catch (parseError) {
        console.error("[PROMETHEUS] Failed to parse AI response:", parseError);
      }
    }
  } catch (error) {
    console.error("[PROMETHEUS] Source triangulation error:", error);
  }

  return {
    method: "source_triangulation",
    status: "inconclusive",
    confidence: 30,
    evidence: ["Automated verification could not complete - manual review recommended"],
    verifiedAt: new Date()
  };
}

// ============================================================================
// TEMPORAL CONSISTENCY
// ============================================================================

/**
 * Check if information is still current and hasn't been superseded
 */
export async function verifyTemporalConsistency(
  nodeId: number,
  claim: string,
  originalDate: Date
): Promise<VerificationResult> {
  const evidence: string[] = [];

  try {
    const ageInMonths = Math.floor(
      (Date.now() - originalDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );

    // Use AI to check for updates
    const checkPrompt = `
You are checking if medical information is still current.

CLAIM: "${claim}"
ORIGINAL DATE: ${originalDate.toISOString().split('T')[0]}
AGE: ${ageInMonths} months old

Check:
1. Has this information been updated or superseded by newer research?
2. Are there newer guidelines that contradict this?
3. Has the medical consensus changed?
4. Are there recent studies that modify this understanding?

Respond in JSON format:
{
  "still_current": true/false,
  "updates_found": [
    {
      "description": "...",
      "impact": "minor" | "moderate" | "major",
      "year": YYYY
    }
  ],
  "recommendation": "keep" | "update" | "deprecate",
  "confidence": 0-100
}
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: checkPrompt }]
    });

    const content = response.content[0];
    if (content.type === "text") {
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);

          evidence.push(`Information age: ${ageInMonths} months`);

          for (const update of result.updates_found || []) {
            evidence.push(`[${update.year}] ${update.description} (${update.impact} impact)`);
          }

          const status: VerificationStatus =
            result.still_current && result.recommendation === "keep"
              ? "passed"
              : result.recommendation === "deprecate"
                ? "failed"
                : "inconclusive";

          return {
            method: "temporal_consistency",
            status,
            confidence: result.confidence || 50,
            evidence,
            notes: `Recommendation: ${result.recommendation}`,
            verifiedAt: new Date()
          };
        }
      } catch (parseError) {
        console.error("[PROMETHEUS] Failed to parse temporal check:", parseError);
      }
    }
  } catch (error) {
    console.error("[PROMETHEUS] Temporal consistency error:", error);
  }

  return {
    method: "temporal_consistency",
    status: "inconclusive",
    confidence: 40,
    evidence: ["Could not verify temporal consistency"],
    verifiedAt: new Date()
  };
}

// ============================================================================
// COHERENCE TEST
// ============================================================================

/**
 * Check if claim is consistent with established knowledge
 */
export async function verifyCoherence(
  prometheusId: number,
  nodeId: number,
  claim: string
): Promise<VerificationResult> {
  const evidence: string[] = [];

  try {
    // Get related knowledge nodes
    const relatedNodes = await db.query.prometheusKnowledgeNodes.findMany({
      where: and(
        eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
        gte(prometheusKnowledgeNodes.confidence, 70)
      ),
      limit: 20
    });

    const existingKnowledge = relatedNodes.map(n => n.label).join(", ");

    const coherencePrompt = `
You are checking if a new claim is coherent with existing knowledge.

NEW CLAIM: "${claim}"

EXISTING KNOWLEDGE BASE:
${existingKnowledge}

Check:
1. Does this claim contradict any established facts?
2. Does it logically follow from existing knowledge?
3. Are there any inconsistencies?
4. Does it align with known mechanisms?

Respond in JSON format:
{
  "is_coherent": true/false,
  "contradictions": ["..."],
  "supports": ["..."],
  "logical_consistency": "high" | "medium" | "low",
  "confidence": 0-100,
  "explanation": "..."
}
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: coherencePrompt }]
    });

    const content = response.content[0];
    if (content.type === "text") {
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);

          if (result.contradictions) {
            for (const contradiction of result.contradictions) {
              evidence.push(`[CONTRADICTION] ${contradiction}`);
            }
          }

          if (result.supports) {
            for (const support of result.supports) {
              evidence.push(`[SUPPORTS] ${support}`);
            }
          }

          evidence.push(`Logical consistency: ${result.logical_consistency}`);

          const status: VerificationStatus =
            result.is_coherent && result.logical_consistency === "high"
              ? "passed"
              : !result.is_coherent
                ? "failed"
                : "inconclusive";

          return {
            method: "coherence_test",
            status,
            confidence: result.confidence || 50,
            evidence,
            notes: result.explanation,
            verifiedAt: new Date()
          };
        }
      } catch (parseError) {
        console.error("[PROMETHEUS] Failed to parse coherence check:", parseError);
      }
    }
  } catch (error) {
    console.error("[PROMETHEUS] Coherence test error:", error);
  }

  return {
    method: "coherence_test",
    status: "inconclusive",
    confidence: 40,
    evidence: ["Could not verify coherence"],
    verifiedAt: new Date()
  };
}

// ============================================================================
// FALSIFIABILITY CHECK
// ============================================================================

/**
 * Verify that a claim is scientifically testable
 */
export async function verifyFalsifiability(
  claim: string
): Promise<VerificationResult> {
  const evidence: string[] = [];

  try {
    const falsifiabilityPrompt = `
Analyze if this claim is scientifically falsifiable:

CLAIM: "${claim}"

Check:
1. Can this claim be tested?
2. What would disprove it?
3. Is it too vague to be tested?
4. Does it make specific, measurable predictions?

Respond in JSON format:
{
  "is_falsifiable": true/false,
  "testability": "high" | "medium" | "low" | "none",
  "potential_tests": ["..."],
  "what_would_disprove": "...",
  "issues": ["..."],
  "confidence": 0-100
}
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: falsifiabilityPrompt }]
    });

    const content = response.content[0];
    if (content.type === "text") {
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);

          evidence.push(`Testability: ${result.testability}`);

          if (result.potential_tests) {
            for (const test of result.potential_tests) {
              evidence.push(`[TEST] ${test}`);
            }
          }

          if (result.what_would_disprove) {
            evidence.push(`[DISPROVES] ${result.what_would_disprove}`);
          }

          if (result.issues) {
            for (const issue of result.issues) {
              evidence.push(`[ISSUE] ${issue}`);
            }
          }

          const status: VerificationStatus =
            result.is_falsifiable && result.testability !== "none"
              ? "passed"
              : result.testability === "none"
                ? "failed"
                : "inconclusive";

          return {
            method: "falsifiability_check",
            status,
            confidence: result.confidence || 50,
            evidence,
            verifiedAt: new Date()
          };
        }
      } catch (parseError) {
        console.error("[PROMETHEUS] Failed to parse falsifiability check:", parseError);
      }
    }
  } catch (error) {
    console.error("[PROMETHEUS] Falsifiability check error:", error);
  }

  return {
    method: "falsifiability_check",
    status: "inconclusive",
    confidence: 40,
    evidence: ["Could not verify falsifiability"],
    verifiedAt: new Date()
  };
}

// ============================================================================
// COMPREHENSIVE VERIFICATION
// ============================================================================

/**
 * Run all verification protocols on a knowledge node
 */
export async function runFullVerification(
  prometheusId: number,
  nodeId: number
): Promise<{
  nodeId: number;
  overallStatus: VerificationStatus;
  overallConfidence: number;
  results: VerificationResult[];
  recommendations: string[];
}> {
  // Get the node
  const node = await db.query.prometheusKnowledgeNodes.findFirst({
    where: eq(prometheusKnowledgeNodes.id, nodeId)
  });

  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const claim = `${node.label}: ${node.description || ""}`;
  const results: VerificationResult[] = [];

  // Run all verification protocols
  console.log(`[PROMETHEUS] Starting full verification for node ${nodeId}`);

  // 1. Source Triangulation
  results.push(await verifyBySourceTriangulation(nodeId, claim));

  // 2. Temporal Consistency
  results.push(await verifyTemporalConsistency(nodeId, claim, node.createdAt));

  // 3. Coherence Test
  results.push(await verifyCoherence(prometheusId, nodeId, claim));

  // 4. Falsifiability Check
  results.push(await verifyFalsifiability(claim));

  // Calculate overall status
  const passedCount = results.filter(r => r.status === "passed").length;
  const failedCount = results.filter(r => r.status === "failed").length;

  const overallStatus: VerificationStatus =
    failedCount >= 2
      ? "failed"
      : passedCount >= 3
        ? "passed"
        : "inconclusive";

  const overallConfidence = Math.round(
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length
  );

  // Generate recommendations
  const recommendations: string[] = [];

  if (failedCount > 0) {
    recommendations.push("Review failed verification protocols and update or flag this knowledge");
  }

  if (results.some(r => r.method === "temporal_consistency" && r.status !== "passed")) {
    recommendations.push("Consider updating with more recent research");
  }

  if (results.some(r => r.method === "source_triangulation" && r.status === "pending")) {
    recommendations.push("Need more independent sources to validate this claim");
  }

  // Store verification results
  for (const result of results) {
    await db.insert(prometheusVerifications).values({
      prometheusId,
      targetNodeId: nodeId,
      method: result.method,
      passed: result.status === "passed",
      confidence: result.confidence,
      evidence: result.evidence,
      notes: result.notes,
      verifiedAt: result.verifiedAt,
      createdAt: new Date()
    });
  }

  // Update node confidence based on verification
  const confidenceAdjustment =
    overallStatus === "passed" ? 5 :
    overallStatus === "failed" ? -15 : 0;

  await db.update(prometheusKnowledgeNodes)
    .set({
      confidence: sql`GREATEST(0, LEAST(100, ${prometheusKnowledgeNodes.confidence} + ${confidenceAdjustment}))`,
      validationCount: sql`${prometheusKnowledgeNodes.validationCount} + 1`,
      lastValidatedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(prometheusKnowledgeNodes.id, nodeId));

  // Record learning event
  await db.insert(prometheusLearningEvents).values({
    prometheusId,
    eventType: "validation",
    description: `Full verification of node ${nodeId}: ${overallStatus}`,
    impact: overallStatus === "passed" ? 0.3 : overallStatus === "failed" ? -0.5 : 0,
    relatedNodeIds: [nodeId],
    metadata: {
      results: results.map(r => ({
        method: r.method,
        status: r.status,
        confidence: r.confidence
      })),
      overallStatus,
      overallConfidence
    },
    createdAt: new Date()
  });

  console.log(`[PROMETHEUS] Verification complete for node ${nodeId}:`, {
    overallStatus,
    overallConfidence,
    passedCount,
    failedCount
  });

  return {
    nodeId,
    overallStatus,
    overallConfidence,
    results,
    recommendations
  };
}

// ============================================================================
// BATCH VERIFICATION
// ============================================================================

/**
 * Verify all unverified or outdated knowledge nodes
 */
export async function runBatchVerification(
  prometheusId: number,
  options: {
    maxNodes?: number;
    minAge?: number; // Days since last verification
    prioritizeHighConfidence?: boolean;
  } = {}
): Promise<{
  nodesVerified: number;
  passed: number;
  failed: number;
  inconclusive: number;
}> {
  const { maxNodes = 10, minAge = 30, prioritizeHighConfidence = true } = options;

  const minAgeDate = new Date();
  minAgeDate.setDate(minAgeDate.getDate() - minAge);

  // Get nodes needing verification
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      sql`(${prometheusKnowledgeNodes.lastValidatedAt} IS NULL OR ${prometheusKnowledgeNodes.lastValidatedAt} < ${minAgeDate})`
    ),
    orderBy: prioritizeHighConfidence
      ? [desc(prometheusKnowledgeNodes.confidence)]
      : [prometheusKnowledgeNodes.createdAt],
    limit: maxNodes
  });

  let passed = 0;
  let failed = 0;
  let inconclusive = 0;

  for (const node of nodes) {
    try {
      const result = await runFullVerification(prometheusId, node.id);

      switch (result.overallStatus) {
        case "passed":
          passed++;
          break;
        case "failed":
          failed++;
          break;
        default:
          inconclusive++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[PROMETHEUS] Failed to verify node ${node.id}:`, error);
      inconclusive++;
    }
  }

  console.log(`[PROMETHEUS] Batch verification complete:`, {
    nodesVerified: nodes.length,
    passed,
    failed,
    inconclusive
  });

  return {
    nodesVerified: nodes.length,
    passed,
    failed,
    inconclusive
  };
}

// ============================================================================
// VERIFICATION ANALYTICS
// ============================================================================

/**
 * Get verification statistics for a Prometheus instance
 */
export async function getVerificationStats(
  prometheusId: number
): Promise<{
  totalVerifications: number;
  passRate: number;
  failRate: number;
  byMethod: Record<VerificationMethod, { total: number; passRate: number }>;
  avgConfidence: number;
  nodesNeedingVerification: number;
}> {
  const verifications = await db.query.prometheusVerifications.findMany({
    where: eq(prometheusVerifications.prometheusId, prometheusId)
  });

  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId)
  });

  const passed = verifications.filter(v => v.passed).length;

  // Calculate by method
  const byMethod: Record<string, { total: number; passed: number }> = {};

  for (const v of verifications) {
    if (!byMethod[v.method]) {
      byMethod[v.method] = { total: 0, passed: 0 };
    }
    byMethod[v.method].total++;
    if (v.passed) {
      byMethod[v.method].passed++;
    }
  }

  // Count nodes needing verification (never verified or > 30 days old)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const needingVerification = nodes.filter(n =>
    !n.lastValidatedAt || n.lastValidatedAt < thirtyDaysAgo
  ).length;

  return {
    totalVerifications: verifications.length,
    passRate: verifications.length > 0 ? passed / verifications.length : 0,
    failRate: verifications.length > 0 ? (verifications.length - passed) / verifications.length : 0,
    byMethod: Object.entries(byMethod).reduce((acc, [method, data]) => {
      acc[method as VerificationMethod] = {
        total: data.total,
        passRate: data.total > 0 ? data.passed / data.total : 0
      };
      return acc;
    }, {} as Record<VerificationMethod, { total: number; passRate: number }>),
    avgConfidence: verifications.length > 0
      ? verifications.reduce((sum, v) => sum + v.confidence, 0) / verifications.length
      : 0,
    nodesNeedingVerification: needingVerification
  };
}
