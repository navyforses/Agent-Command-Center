/**
 * PROMETHEUS-MIND Error Detection Framework
 * ==========================================
 * Self-correcting system that learns from mistakes
 *
 * Created by Dr. Kenji Matsumoto (Chief Self-Evolution Engineer)
 *
 * Error Types:
 * - Factual: Wrong information
 * - Inference: Wrong conclusion from correct data
 * - Context: Misunderstanding of context
 * - Temporal: Outdated information
 * - Confidence: Over/under confidence
 * - Integration: Knowledge fragments don't fit together
 */

import { db } from "../db";
import { eq, and, desc, sql, gte, lte, not } from "drizzle-orm";
import {
  prometheusErrors,
  prometheusKnowledgeNodes,
  prometheusMemory,
  prometheusLearningEvents,
  prometheusVerifications,
  prometheusState,
  type PrometheusError,
  type PrometheusKnowledgeNode,
  type InsertPrometheusError,
  type InsertPrometheusVerification,
} from "../../shared/schema";
import { recordLearningEvent, validateKnowledgeNode } from "./memoryLayer";

// ============================================================================
// TYPES
// ============================================================================

export type ErrorType = "factual" | "inference" | "context" | "temporal" | "confidence" | "integration";
export type ErrorSeverity = "critical" | "major" | "minor" | "cosmetic";
export type VerificationMethod =
  | "source_triangulation"
  | "temporal_consistency"
  | "predictive_power"
  | "falsifiability_check"
  | "coherence_test";

export interface PredictionResult {
  prediction: string;
  actualOutcome: string;
  wasCorrect: boolean;
  confidence: number;
}

export interface ContradictionDetection {
  nodeId1: number;
  nodeId2: number;
  node1Content: string;
  node2Content: string;
  contradictionType: string;
  severity: ErrorSeverity;
}

export interface ErrorAnalysis {
  errorType: ErrorType;
  rootCause: string;
  affectedNodes: number[];
  affectedMemories: number[];
  suggestedCorrection: string;
  preventionStrategy: string;
}

// ============================================================================
// ERROR DETECTION
// ============================================================================

/**
 * Detect contradictions between knowledge nodes
 */
export async function detectContradictions(
  prometheusId: number
): Promise<ContradictionDetection[]> {
  const contradictions: ContradictionDetection[] = [];

  // Get all knowledge nodes with 'contradicts' relationships
  const contradictingEdges = await db.query.prometheusKnowledgeEdges.findMany({
    where: and(
      eq(db.query.prometheusKnowledgeEdges.columns.prometheusId, prometheusId),
      eq(db.query.prometheusKnowledgeEdges.columns.relationType, "contradicts")
    ),
  });

  for (const edge of contradictingEdges) {
    if (!edge.sourceNodeId || !edge.targetNodeId) continue;

    const sourceNode = await db.query.prometheusKnowledgeNodes.findFirst({
      where: eq(prometheusKnowledgeNodes.id, edge.sourceNodeId),
    });

    const targetNode = await db.query.prometheusKnowledgeNodes.findFirst({
      where: eq(prometheusKnowledgeNodes.id, edge.targetNodeId),
    });

    if (sourceNode && targetNode) {
      // Determine severity based on confidence difference
      const confidenceDiff = Math.abs((sourceNode.confidence || 50) - (targetNode.confidence || 50));
      let severity: ErrorSeverity = "minor";
      if (confidenceDiff < 20) severity = "major"; // Both are similarly confident
      if (sourceNode.confidence! >= 80 && targetNode.confidence! >= 80) severity = "critical";

      contradictions.push({
        nodeId1: sourceNode.id,
        nodeId2: targetNode.id,
        node1Content: sourceNode.label,
        node2Content: targetNode.label,
        contradictionType: "direct_contradiction",
        severity,
      });
    }
  }

  return contradictions;
}

/**
 * Detect temporal inconsistencies (outdated information)
 */
export async function detectTemporalErrors(
  prometheusId: number,
  maxAgeDays: number = 365
): Promise<PrometheusKnowledgeNode[]> {
  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  // Find nodes that haven't been validated recently
  const outdatedNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, 50), // Only check confident nodes
      lte(prometheusKnowledgeNodes.lastValidatedAt, cutoffDate)
    ),
  });

  return outdatedNodes;
}

/**
 * Detect confidence miscalibration
 */
export async function detectConfidenceErrors(
  prometheusId: number
): Promise<PrometheusKnowledgeNode[]> {
  // Find nodes with high confidence but low validation count
  const overconfidentNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, 80),
      lte(prometheusKnowledgeNodes.validationCount, 1)
    ),
  });

  // Find nodes with low confidence but high validation count
  const underconfidentNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      lte(prometheusKnowledgeNodes.confidence, 40),
      gte(prometheusKnowledgeNodes.validationCount, 3)
    ),
  });

  return [...overconfidentNodes, ...underconfidentNodes];
}

/**
 * Record a prediction for later validation
 */
export async function recordPrediction(
  prometheusId: number,
  prediction: string,
  relatedNodeIds: number[],
  confidence: number
): Promise<number> {
  // Store prediction as a special memory
  const [predictionMemory] = await db
    .insert(prometheusMemory)
    .values({
      prometheusId,
      memoryType: "procedural",
      priority: "high",
      content: prediction,
      certaintyLevel: "hypothesis",
      confidence,
      tags: ["prediction", "pending_validation"],
      metadata: {
        type: "prediction",
        relatedNodeIds,
        recordedAt: new Date().toISOString(),
        validated: false,
      },
    })
    .returning();

  return predictionMemory.id;
}

/**
 * Validate a prediction against actual outcome
 */
export async function validatePrediction(
  prometheusId: number,
  predictionMemoryId: number,
  actualOutcome: string,
  wasCorrect: boolean
): Promise<void> {
  // Get the prediction memory
  const prediction = await db.query.prometheusMemory.findFirst({
    where: eq(prometheusMemory.id, predictionMemoryId),
  });

  if (!prediction) {
    throw new Error(`Prediction memory ${predictionMemoryId} not found`);
  }

  const metadata = prediction.metadata as Record<string, any>;
  const relatedNodeIds = metadata?.relatedNodeIds || [];

  if (wasCorrect) {
    // Prediction was correct - reinforce related nodes
    for (const nodeId of relatedNodeIds) {
      await validateKnowledgeNode(nodeId, true);
    }

    // Record success learning event
    await recordLearningEvent(prometheusId, {
      eventType: "prediction_success",
      description: `Prediction validated successfully: ${prediction.content.substring(0, 100)}...`,
      impact: 0.5,
      affectedNodeIds: relatedNodeIds,
      affectedMemoryIds: [predictionMemoryId],
      beforeState: { confidence: prediction.confidence },
      afterState: { validated: true, wasCorrect: true },
    });

    // Update prediction accuracy
    await updatePredictionAccuracy(prometheusId, true);
  } else {
    // Prediction was wrong - analyze and correct
    const errorAnalysis = await analyzeError(
      prometheusId,
      prediction.content,
      actualOutcome,
      relatedNodeIds
    );

    // Record error
    await recordError(prometheusId, {
      errorType: errorAnalysis.errorType,
      severity: "major",
      description: `Prediction failed: ${prediction.content.substring(0, 100)}...`,
      prediction: prediction.content,
      actualOutcome,
      rootCause: errorAnalysis.rootCause,
      correction: errorAnalysis.suggestedCorrection,
      preventionStrategy: errorAnalysis.preventionStrategy,
      affectedMemoryIds: [predictionMemoryId],
      affectedNodeIds: relatedNodeIds,
    });

    // Reduce confidence in related nodes
    for (const nodeId of relatedNodeIds) {
      await validateKnowledgeNode(nodeId, false);
    }

    // Record failure learning event
    await recordLearningEvent(prometheusId, {
      eventType: "prediction_failure",
      description: `Prediction failed: ${prediction.content.substring(0, 100)}...`,
      impact: -0.5,
      affectedNodeIds: relatedNodeIds,
      affectedMemoryIds: [predictionMemoryId],
      beforeState: { confidence: prediction.confidence },
      afterState: { validated: true, wasCorrect: false },
      lessonsLearned: [errorAnalysis.preventionStrategy],
    });

    // Update prediction accuracy
    await updatePredictionAccuracy(prometheusId, false);
  }

  // Mark prediction as validated
  await db
    .update(prometheusMemory)
    .set({
      metadata: {
        ...metadata,
        validated: true,
        wasCorrect,
        actualOutcome,
        validatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(prometheusMemory.id, predictionMemoryId));
}

// ============================================================================
// ERROR ANALYSIS
// ============================================================================

/**
 * Analyze an error to determine root cause and correction
 */
async function analyzeError(
  prometheusId: number,
  prediction: string,
  actualOutcome: string,
  relatedNodeIds: number[]
): Promise<ErrorAnalysis> {
  // Get related nodes to understand context
  const relatedNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      sql`${prometheusKnowledgeNodes.id} = ANY(${relatedNodeIds})`
    ),
  });

  // Analyze the type of error based on the nodes and prediction
  let errorType: ErrorType = "inference";
  let rootCause = "Unknown root cause";
  let suggestedCorrection = "Review related knowledge nodes";
  let preventionStrategy = "Increase evidence requirements before making predictions";

  // Check for low evidence nodes
  const lowEvidenceNodes = relatedNodes.filter((n) => (n.evidenceCount || 0) < 3);
  if (lowEvidenceNodes.length > 0) {
    errorType = "confidence";
    rootCause = "Prediction based on insufficient evidence";
    suggestedCorrection = `Gather more evidence for: ${lowEvidenceNodes.map((n) => n.label).join(", ")}`;
    preventionStrategy = "Require minimum 3 evidence sources before predictions";
  }

  // Check for recently added nodes
  const recentNodes = relatedNodes.filter((n) => {
    const daysSinceCreation = (Date.now() - new Date(n.createdAt!).getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceCreation < 7;
  });
  if (recentNodes.length > 0) {
    errorType = "temporal";
    rootCause = "Prediction based on newly acquired, unvalidated knowledge";
    suggestedCorrection = "Allow time for new knowledge to be validated before use in predictions";
    preventionStrategy = "Implement waiting period for new knowledge nodes";
  }

  // Check for contradictions among related nodes
  const contradictions = await detectContradictions(prometheusId);
  const relevantContradictions = contradictions.filter(
    (c) => relatedNodeIds.includes(c.nodeId1) || relatedNodeIds.includes(c.nodeId2)
  );
  if (relevantContradictions.length > 0) {
    errorType = "integration";
    rootCause = "Prediction based on contradicting knowledge";
    suggestedCorrection = "Resolve contradictions between: " +
      relevantContradictions.map((c) => `${c.node1Content} vs ${c.node2Content}`).join("; ");
    preventionStrategy = "Check for contradictions before using nodes in predictions";
  }

  return {
    errorType,
    rootCause,
    affectedNodes: relatedNodeIds,
    affectedMemories: [],
    suggestedCorrection,
    preventionStrategy,
  };
}

// ============================================================================
// ERROR RECORDING AND RESOLUTION
// ============================================================================

/**
 * Record an error
 */
export async function recordError(
  prometheusId: number,
  error: Omit<InsertPrometheusError, "prometheusId">
): Promise<PrometheusError> {
  const [recorded] = await db
    .insert(prometheusErrors)
    .values({
      ...error,
      prometheusId,
    })
    .returning();

  // Update error rate in Prometheus state
  await updateErrorRate(prometheusId);

  // Update last error timestamp
  await db
    .update(prometheusState)
    .set({
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));

  return recorded;
}

/**
 * Get unresolved errors
 */
export async function getUnresolvedErrors(
  prometheusId: number
): Promise<PrometheusError[]> {
  return db.query.prometheusErrors.findMany({
    where: and(
      eq(prometheusErrors.prometheusId, prometheusId),
      eq(prometheusErrors.resolved, false)
    ),
    orderBy: [desc(prometheusErrors.createdAt)],
  });
}

/**
 * Resolve an error
 */
export async function resolveError(
  errorId: number,
  correction: string
): Promise<void> {
  const error = await db.query.prometheusErrors.findFirst({
    where: eq(prometheusErrors.id, errorId),
  });

  if (!error) {
    throw new Error(`Error ${errorId} not found`);
  }

  await db
    .update(prometheusErrors)
    .set({
      resolved: true,
      resolvedAt: new Date(),
      correction,
    })
    .where(eq(prometheusErrors.id, errorId));

  // Record correction as learning event
  if (error.prometheusId) {
    await recordLearningEvent(error.prometheusId, {
      eventType: "error_correction",
      description: `Error resolved: ${error.description?.substring(0, 100)}...`,
      impact: 0.3,
      affectedNodeIds: error.affectedNodeIds || [],
      affectedMemoryIds: error.affectedMemoryIds || [],
      lessonsLearned: [correction],
    });
  }
}

// ============================================================================
// TRUTH VERIFICATION
// ============================================================================

/**
 * Run all verification methods on a knowledge node
 */
export async function verifyKnowledgeNode(
  prometheusId: number,
  nodeId: number
): Promise<{ passed: boolean; confidence: number; results: InsertPrometheusVerification[] }> {
  const node = await db.query.prometheusKnowledgeNodes.findFirst({
    where: eq(prometheusKnowledgeNodes.id, nodeId),
  });

  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const results: InsertPrometheusVerification[] = [];
  let totalPassed = 0;
  let totalConfidence = 0;

  // 1. Source Triangulation
  const sourceTriangulation = await verifySourceTriangulation(prometheusId, node);
  results.push(sourceTriangulation);
  if (sourceTriangulation.passed) totalPassed++;
  totalConfidence += sourceTriangulation.confidence || 0;

  // 2. Temporal Consistency
  const temporalConsistency = await verifyTemporalConsistency(prometheusId, node);
  results.push(temporalConsistency);
  if (temporalConsistency.passed) totalPassed++;
  totalConfidence += temporalConsistency.confidence || 0;

  // 3. Coherence Test
  const coherenceTest = await verifyCoherence(prometheusId, node);
  results.push(coherenceTest);
  if (coherenceTest.passed) totalPassed++;
  totalConfidence += coherenceTest.confidence || 0;

  // Store verification results
  for (const result of results) {
    await db.insert(prometheusVerifications).values({
      ...result,
      prometheusId,
      targetNodeId: nodeId,
    });
  }

  const overallPassed = totalPassed >= 2; // At least 2 out of 3 methods must pass
  const avgConfidence = Math.round(totalConfidence / results.length);

  // Update node based on verification
  if (overallPassed) {
    await validateKnowledgeNode(nodeId, true);
  }

  return {
    passed: overallPassed,
    confidence: avgConfidence,
    results,
  };
}

/**
 * Verify source triangulation - check if at least 3 independent sources
 */
async function verifySourceTriangulation(
  prometheusId: number,
  node: PrometheusKnowledgeNode
): Promise<Omit<InsertPrometheusVerification, "prometheusId" | "targetNodeId">> {
  const sourceIds = node.sourceIds || [];
  const passed = sourceIds.length >= 3;
  const confidence = Math.min(100, sourceIds.length * 25);

  return {
    method: "source_triangulation",
    passed,
    confidence,
    evidence: sourceIds,
    notes: passed
      ? `Has ${sourceIds.length} sources (minimum 3 required)`
      : `Only ${sourceIds.length} sources (minimum 3 required)`,
  };
}

/**
 * Verify temporal consistency - check if not outdated
 */
async function verifyTemporalConsistency(
  prometheusId: number,
  node: PrometheusKnowledgeNode
): Promise<Omit<InsertPrometheusVerification, "prometheusId" | "targetNodeId">> {
  const createdAt = new Date(node.createdAt!);
  const lastValidated = node.lastValidatedAt ? new Date(node.lastValidatedAt) : createdAt;
  const daysSinceValidation = (Date.now() - lastValidated.getTime()) / (24 * 60 * 60 * 1000);

  // Consider valid if validated within last 180 days
  const passed = daysSinceValidation < 180;
  const confidence = Math.max(0, Math.round(100 - daysSinceValidation / 2));

  return {
    method: "temporal_consistency",
    passed,
    confidence,
    evidence: [],
    notes: passed
      ? `Last validated ${Math.round(daysSinceValidation)} days ago`
      : `Outdated - last validated ${Math.round(daysSinceValidation)} days ago`,
  };
}

/**
 * Verify coherence - check if consistent with related knowledge
 */
async function verifyCoherence(
  prometheusId: number,
  node: PrometheusKnowledgeNode
): Promise<Omit<InsertPrometheusVerification, "prometheusId" | "targetNodeId">> {
  // Check for contradictions
  const contradictions = await detectContradictions(prometheusId);
  const nodeContradictions = contradictions.filter(
    (c) => c.nodeId1 === node.id || c.nodeId2 === node.id
  );

  const passed = nodeContradictions.length === 0;
  const confidence = Math.max(0, 100 - nodeContradictions.length * 30);

  return {
    method: "coherence_test",
    passed,
    confidence,
    evidence: nodeContradictions.map((c) =>
      `Contradicts: ${c.nodeId1 === node.id ? c.node2Content : c.node1Content}`
    ),
    notes: passed
      ? "No contradictions found"
      : `Found ${nodeContradictions.length} contradictions`,
  };
}

// ============================================================================
// METRICS UPDATES
// ============================================================================

/**
 * Update prediction accuracy metric
 */
async function updatePredictionAccuracy(
  prometheusId: number,
  wasCorrect: boolean
): Promise<void> {
  const state = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId),
  });

  if (!state) return;

  // Get all prediction memories
  const predictions = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.tags} @> ARRAY['prediction']::text[]`,
      sql`(${prometheusMemory.metadata}->>'validated')::boolean = true`
    ),
  });

  const correctPredictions = predictions.filter((p) => {
    const metadata = p.metadata as Record<string, any>;
    return metadata?.wasCorrect === true;
  });

  const accuracy = predictions.length > 0
    ? (correctPredictions.length / predictions.length) * 100
    : 0;

  await db
    .update(prometheusState)
    .set({
      predictionAccuracy: accuracy,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));
}

/**
 * Update error rate metric
 */
async function updateErrorRate(prometheusId: number): Promise<void> {
  // Count errors from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentErrors = await db.query.prometheusErrors.findMany({
    where: and(
      eq(prometheusErrors.prometheusId, prometheusId),
      gte(prometheusErrors.createdAt, thirtyDaysAgo)
    ),
  });

  // Get total operations (learning events) in same period
  const recentEvents = await db.query.prometheusLearningEvents.findMany({
    where: and(
      eq(prometheusLearningEvents.prometheusId, prometheusId),
      gte(prometheusLearningEvents.createdAt, thirtyDaysAgo)
    ),
  });

  const errorRate = recentEvents.length > 0
    ? (recentErrors.length / recentEvents.length) * 100
    : 0;

  await db
    .update(prometheusState)
    .set({
      errorRate,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));
}

// ============================================================================
// AUTO-CORRECTION
// ============================================================================

/**
 * Run automatic error detection and correction
 */
export async function runAutoCorrection(prometheusId: number): Promise<{
  contradictionsFound: number;
  temporalErrorsFound: number;
  confidenceErrorsFound: number;
  errorsRecorded: number;
}> {
  let errorsRecorded = 0;

  // 1. Detect contradictions
  const contradictions = await detectContradictions(prometheusId);
  for (const contradiction of contradictions) {
    await recordError(prometheusId, {
      errorType: "integration",
      severity: contradiction.severity,
      description: `Contradiction detected: "${contradiction.node1Content}" contradicts "${contradiction.node2Content}"`,
      affectedNodeIds: [contradiction.nodeId1, contradiction.nodeId2],
      metadata: { contradictionType: contradiction.contradictionType },
    });
    errorsRecorded++;
  }

  // 2. Detect temporal errors
  const temporalErrors = await detectTemporalErrors(prometheusId);
  for (const node of temporalErrors) {
    await recordError(prometheusId, {
      errorType: "temporal",
      severity: "minor",
      description: `Potentially outdated knowledge: "${node.label}"`,
      affectedNodeIds: [node.id],
      metadata: { lastValidated: node.lastValidatedAt },
    });
    errorsRecorded++;
  }

  // 3. Detect confidence errors
  const confidenceErrors = await detectConfidenceErrors(prometheusId);
  for (const node of confidenceErrors) {
    const isOverconfident = (node.confidence || 0) > 70 && (node.validationCount || 0) < 2;
    await recordError(prometheusId, {
      errorType: "confidence",
      severity: "minor",
      description: isOverconfident
        ? `Overconfident node: "${node.label}" (${node.confidence}% confidence with only ${node.validationCount} validations)`
        : `Underconfident node: "${node.label}" (${node.confidence}% confidence despite ${node.validationCount} validations)`,
      affectedNodeIds: [node.id],
      correction: isOverconfident
        ? "Reduce confidence until more validations are received"
        : "Increase confidence based on validation count",
    });
    errorsRecorded++;
  }

  // Record learning event
  await recordLearningEvent(prometheusId, {
    eventType: "pattern_recognition",
    description: `Auto-correction completed: ${contradictions.length} contradictions, ${temporalErrors.length} temporal errors, ${confidenceErrors.length} confidence errors`,
    impact: errorsRecorded > 0 ? -0.2 : 0.1,
    metadata: {
      contradictionsFound: contradictions.length,
      temporalErrorsFound: temporalErrors.length,
      confidenceErrorsFound: confidenceErrors.length,
    },
  });

  return {
    contradictionsFound: contradictions.length,
    temporalErrorsFound: temporalErrors.length,
    confidenceErrorsFound: confidenceErrors.length,
    errorsRecorded,
  };
}
