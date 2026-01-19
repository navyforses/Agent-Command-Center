// @ts-nocheck
/**
 * PROMETHEUS-MIND Phase 2: Prediction Validation System
 * =====================================================
 * Track, validate, and learn from predictions
 *
 * Dr. Kenji Matsumoto (Chief Self-Evolution Engineer):
 * "ჭეშმარიტი ინტელექტი იზომება არა იმით რამდენს იცი, არამედ იმით რამდენად კარგად
 *  სწავლობ შენს შეცდომებზე."
 * "True intelligence is measured not by what you know, but by how well you learn
 *  from your mistakes."
 */

import { db } from "../../db";
import {
  prometheusState,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusErrors,
  prometheusLearningEvents
} from "../../../shared/schema";
import { eq, and, sql, desc, gte, lte, isNull } from "drizzle-orm";

// ============================================================================
// PREDICTION TYPES
// ============================================================================

export interface Prediction {
  id: number;
  prometheusId: number;
  category: PredictionCategory;
  statement: string;
  statementKa?: string;
  confidence: number;
  timeframe: PredictionTimeframe;
  expectedOutcome: string;
  conditions?: string[];
  sourceNodeIds?: number[];
  sourceMemoryIds?: number[];
  createdAt: Date;
  validationDue: Date;
  validatedAt?: Date;
  actualOutcome?: string;
  wasCorrect?: boolean;
  deviationScore?: number;
  lessonsLearned?: string[];
}

export type PredictionCategory =
  | "treatment_response"    // პაციენტი პასუხობს მკურნალობას
  | "symptom_progression"   // სიმპტომის პროგრესია
  | "therapy_outcome"       // თერაპიის შედეგი
  | "research_finding"      // კვლევის მიგნება
  | "milestone_achievement" // განვითარების milestone
  | "side_effect"           // გვერდითი მოვლენა
  | "complication_risk";    // გართულების რისკი

export type PredictionTimeframe =
  | "immediate"   // 24 საათში
  | "short_term"  // 1 კვირაში
  | "medium_term" // 1 თვეში
  | "long_term"   // 3+ თვეში
  | "indefinite"; // განუსაზღვრელი

// ============================================================================
// PREDICTION CREATION
// ============================================================================

/**
 * Create a new prediction from an insight or hypothesis
 */
export async function createPrediction(
  prometheusId: number,
  prediction: {
    category: PredictionCategory;
    statement: string;
    statementKa?: string;
    confidence: number;
    timeframe: PredictionTimeframe;
    expectedOutcome: string;
    conditions?: string[];
    sourceNodeIds?: number[];
    sourceMemoryIds?: number[];
  }
): Promise<number> {
  // Calculate validation due date based on timeframe
  const validationDue = calculateValidationDue(prediction.timeframe);

  // Store prediction as a special memory type
  const [result] = await db.insert(prometheusMemory).values({
    prometheusId,
    memoryType: "procedural", // Predictions are about future actions/outcomes
    priority: prediction.confidence >= 80 ? "high" : "medium",
    content: JSON.stringify({
      type: "prediction",
      category: prediction.category,
      statement: prediction.statement,
      statementKa: prediction.statementKa,
      expectedOutcome: prediction.expectedOutcome,
      conditions: prediction.conditions,
      sourceNodeIds: prediction.sourceNodeIds,
      sourceMemoryIds: prediction.sourceMemoryIds
    }),
    certaintyLevel: prediction.confidence >= 80 ? "belief" :
                    prediction.confidence >= 60 ? "hypothesis" : "aware",
    confidence: prediction.confidence,
    tags: ["prediction", prediction.category, prediction.timeframe],
    metadata: {
      isPrediction: true,
      category: prediction.category,
      timeframe: prediction.timeframe,
      expectedOutcome: prediction.expectedOutcome,
      validationDue: validationDue.toISOString(),
      validated: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning({ id: prometheusMemory.id });

  console.log(`[PROMETHEUS] Created prediction ${result.id}: "${prediction.statement.slice(0, 50)}..."`);

  return result.id;
}

/**
 * Calculate when a prediction should be validated
 */
function calculateValidationDue(timeframe: PredictionTimeframe): Date {
  const now = new Date();

  switch (timeframe) {
    case "immediate":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    case "short_term":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
    case "medium_term":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
    case "long_term":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months
    case "indefinite":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}

// ============================================================================
// PREDICTION RETRIEVAL
// ============================================================================

/**
 * Get all pending predictions (not yet validated)
 */
export async function getPendingPredictions(
  prometheusId: number
): Promise<Prediction[]> {
  const memories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.metadata}->>'isPrediction' = 'true'`,
      sql`${prometheusMemory.metadata}->>'validated' = 'false'`
    ),
    orderBy: [sql`${prometheusMemory.metadata}->>'validationDue' ASC`]
  });

  return memories.map(m => memoryToPrediction(m));
}

/**
 * Get predictions due for validation
 */
export async function getOverduePredictions(
  prometheusId: number
): Promise<Prediction[]> {
  const now = new Date().toISOString();

  const memories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.metadata}->>'isPrediction' = 'true'`,
      sql`${prometheusMemory.metadata}->>'validated' = 'false'`,
      sql`${prometheusMemory.metadata}->>'validationDue' <= ${now}`
    )
  });

  return memories.map(m => memoryToPrediction(m));
}

/**
 * Get all validated predictions
 */
export async function getValidatedPredictions(
  prometheusId: number,
  options: {
    onlyCorrect?: boolean;
    onlyIncorrect?: boolean;
    category?: PredictionCategory;
    limit?: number;
  } = {}
): Promise<Prediction[]> {
  let conditions = [
    eq(prometheusMemory.prometheusId, prometheusId),
    sql`${prometheusMemory.metadata}->>'isPrediction' = 'true'`,
    sql`${prometheusMemory.metadata}->>'validated' = 'true'`
  ];

  if (options.onlyCorrect) {
    conditions.push(sql`${prometheusMemory.metadata}->>'wasCorrect' = 'true'`);
  }

  if (options.onlyIncorrect) {
    conditions.push(sql`${prometheusMemory.metadata}->>'wasCorrect' = 'false'`);
  }

  if (options.category) {
    conditions.push(sql`${prometheusMemory.metadata}->>'category' = ${options.category}`);
  }

  const memories = await db.query.prometheusMemory.findMany({
    where: and(...conditions),
    orderBy: [desc(prometheusMemory.updatedAt)],
    limit: options.limit || 100
  });

  return memories.map(m => memoryToPrediction(m));
}

/**
 * Convert memory to prediction
 */
function memoryToPrediction(memory: typeof prometheusMemory.$inferSelect): Prediction {
  const metadata = memory.metadata as any;
  const content = typeof memory.content === 'string' ? JSON.parse(memory.content) : memory.content;

  return {
    id: memory.id,
    prometheusId: memory.prometheusId,
    category: metadata.category,
    statement: content.statement,
    statementKa: content.statementKa,
    confidence: memory.confidence,
    timeframe: metadata.timeframe,
    expectedOutcome: metadata.expectedOutcome,
    conditions: content.conditions,
    sourceNodeIds: content.sourceNodeIds,
    sourceMemoryIds: content.sourceMemoryIds,
    createdAt: memory.createdAt,
    validationDue: new Date(metadata.validationDue),
    validatedAt: metadata.validatedAt ? new Date(metadata.validatedAt) : undefined,
    actualOutcome: metadata.actualOutcome,
    wasCorrect: metadata.wasCorrect,
    deviationScore: metadata.deviationScore,
    lessonsLearned: metadata.lessonsLearned
  };
}

// ============================================================================
// PREDICTION VALIDATION
// ============================================================================

/**
 * Validate a prediction with actual outcome
 */
export async function validatePrediction(
  predictionId: number,
  validation: {
    actualOutcome: string;
    wasCorrect: boolean;
    deviationScore?: number; // 0-1, how far off was the prediction
    notes?: string;
  }
): Promise<{
  predictionId: number;
  wasCorrect: boolean;
  lessonsLearned: string[];
  confidenceAdjustment: number;
}> {
  // Get the prediction memory
  const memory = await db.query.prometheusMemory.findFirst({
    where: eq(prometheusMemory.id, predictionId)
  });

  if (!memory) {
    throw new Error(`Prediction ${predictionId} not found`);
  }

  const metadata = memory.metadata as any;

  // Calculate lessons learned
  const lessonsLearned = analyzePredictionOutcome(
    metadata.expectedOutcome,
    validation.actualOutcome,
    validation.wasCorrect
  );

  // Calculate confidence adjustment
  const confidenceAdjustment = calculateConfidenceAdjustment(
    memory.confidence,
    validation.wasCorrect,
    validation.deviationScore || (validation.wasCorrect ? 0 : 1)
  );

  // Update the prediction memory
  await db.update(prometheusMemory)
    .set({
      confidence: Math.max(0, Math.min(100, memory.confidence + confidenceAdjustment)),
      metadata: {
        ...metadata,
        validated: true,
        validatedAt: new Date().toISOString(),
        actualOutcome: validation.actualOutcome,
        wasCorrect: validation.wasCorrect,
        deviationScore: validation.deviationScore,
        lessonsLearned,
        notes: validation.notes
      },
      updatedAt: new Date()
    })
    .where(eq(prometheusMemory.id, predictionId));

  // Record learning event
  await recordPredictionLearningEvent(
    memory.prometheusId,
    predictionId,
    validation.wasCorrect,
    lessonsLearned,
    confidenceAdjustment
  );

  // If prediction was wrong, record an error for self-correction
  if (!validation.wasCorrect) {
    await recordPredictionError(
      memory.prometheusId,
      predictionId,
      metadata.expectedOutcome,
      validation.actualOutcome,
      lessonsLearned
    );
  }

  // Update source node confidence levels
  if (metadata.sourceNodeIds && metadata.sourceNodeIds.length > 0) {
    await updateSourceNodeConfidence(
      metadata.sourceNodeIds,
      validation.wasCorrect,
      confidenceAdjustment
    );
  }

  console.log(`[PROMETHEUS] Validated prediction ${predictionId}:`, {
    wasCorrect: validation.wasCorrect,
    confidenceAdjustment,
    lessonsLearned
  });

  return {
    predictionId,
    wasCorrect: validation.wasCorrect,
    lessonsLearned,
    confidenceAdjustment
  };
}

/**
 * Analyze why a prediction succeeded or failed
 */
function analyzePredictionOutcome(
  expected: string,
  actual: string,
  wasCorrect: boolean
): string[] {
  const lessons: string[] = [];

  if (wasCorrect) {
    lessons.push("Prediction methodology validated");
    lessons.push("Source evidence was reliable");
  } else {
    // Analyze potential causes of failure
    lessons.push("Prediction deviated from actual outcome");

    // Check for common failure patterns
    if (expected.toLowerCase().includes("improve") && actual.toLowerCase().includes("no change")) {
      lessons.push("Overestimated treatment effect - consider longer timeframes");
    }

    if (expected.toLowerCase().includes("stable") && actual.toLowerCase().includes("worsen")) {
      lessons.push("Underestimated progression risk - increase monitoring");
    }

    lessons.push("Review source evidence for potential gaps");
    lessons.push("Consider additional confounding factors");
  }

  return lessons;
}

/**
 * Calculate confidence adjustment based on validation result
 */
function calculateConfidenceAdjustment(
  originalConfidence: number,
  wasCorrect: boolean,
  deviationScore: number
): number {
  // Reward correct predictions, penalize incorrect ones
  // But scale by how confident we were originally

  const confidenceFactor = originalConfidence / 100;

  if (wasCorrect) {
    // Small positive adjustment for correct predictions
    // Larger adjustment if we were less confident (reward for being right despite uncertainty)
    return Math.round((1 - confidenceFactor) * 10 * (1 - deviationScore));
  } else {
    // Larger negative adjustment for incorrect predictions
    // Especially if we were highly confident (penalize overconfidence)
    return Math.round(-confidenceFactor * 15 * deviationScore);
  }
}

// ============================================================================
// LEARNING FROM PREDICTIONS
// ============================================================================

/**
 * Record a learning event from prediction validation
 */
async function recordPredictionLearningEvent(
  prometheusId: number,
  predictionId: number,
  wasCorrect: boolean,
  lessonsLearned: string[],
  confidenceAdjustment: number
): Promise<void> {
  await db.insert(prometheusLearningEvents).values({
    prometheusId,
    eventType: wasCorrect ? "prediction_success" : "prediction_failure",
    description: `Prediction ${predictionId} ${wasCorrect ? "validated correctly" : "deviated from outcome"}`,
    impact: wasCorrect ? 0.5 : -0.3,
    relatedMemoryIds: [predictionId],
    metadata: {
      predictionId,
      wasCorrect,
      lessonsLearned,
      confidenceAdjustment
    },
    createdAt: new Date()
  });
}

/**
 * Record an error from failed prediction
 */
async function recordPredictionError(
  prometheusId: number,
  predictionId: number,
  expected: string,
  actual: string,
  lessonsLearned: string[]
): Promise<void> {
  await db.insert(prometheusErrors).values({
    prometheusId,
    errorType: "prediction_failure",
    severity: "minor",
    description: `Prediction failed: Expected "${expected.slice(0, 100)}" but got "${actual.slice(0, 100)}"`,
    prediction: expected,
    actualOutcome: actual,
    relatedMemoryIds: [predictionId],
    metadata: {
      lessonsLearned,
      predictionId
    },
    resolved: false,
    createdAt: new Date()
  });
}

/**
 * Update confidence of source nodes based on prediction outcome
 */
async function updateSourceNodeConfidence(
  nodeIds: number[],
  wasCorrect: boolean,
  adjustment: number
): Promise<void> {
  const scaledAdjustment = Math.round(adjustment * 0.5); // Scale down for source nodes

  for (const nodeId of nodeIds) {
    await db.update(prometheusKnowledgeNodes)
      .set({
        confidence: sql`GREATEST(0, LEAST(100, ${prometheusKnowledgeNodes.confidence} + ${scaledAdjustment}))`,
        validationCount: sql`${prometheusKnowledgeNodes.validationCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(prometheusKnowledgeNodes.id, nodeId));
  }
}

// ============================================================================
// PREDICTION ANALYTICS
// ============================================================================

export interface PredictionStats {
  totalPredictions: number;
  validatedPredictions: number;
  pendingPredictions: number;
  overduePredictions: number;
  accuracyRate: number;
  avgConfidence: number;
  byCategory: Record<PredictionCategory, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
  byTimeframe: Record<PredictionTimeframe, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
  confidenceCalibration: {
    highConfidence: { predictions: number; accuracy: number };
    mediumConfidence: { predictions: number; accuracy: number };
    lowConfidence: { predictions: number; accuracy: number };
  };
}

/**
 * Get comprehensive prediction statistics
 */
export async function getPredictionStats(
  prometheusId: number
): Promise<PredictionStats> {
  // Get all predictions
  const allPredictions = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.metadata}->>'isPrediction' = 'true'`
    )
  });

  const predictions = allPredictions.map(m => memoryToPrediction(m));

  const validated = predictions.filter(p => p.validatedAt);
  const pending = predictions.filter(p => !p.validatedAt);
  const overdue = pending.filter(p => p.validationDue < new Date());
  const correct = validated.filter(p => p.wasCorrect);

  // Calculate by category
  const byCategory: PredictionStats["byCategory"] = {} as any;
  const categories: PredictionCategory[] = [
    "treatment_response", "symptom_progression", "therapy_outcome",
    "research_finding", "milestone_achievement", "side_effect", "complication_risk"
  ];

  for (const cat of categories) {
    const catPredictions = validated.filter(p => p.category === cat);
    const catCorrect = catPredictions.filter(p => p.wasCorrect);
    byCategory[cat] = {
      total: catPredictions.length,
      correct: catCorrect.length,
      accuracy: catPredictions.length > 0 ? catCorrect.length / catPredictions.length : 0
    };
  }

  // Calculate by timeframe
  const byTimeframe: PredictionStats["byTimeframe"] = {} as any;
  const timeframes: PredictionTimeframe[] = [
    "immediate", "short_term", "medium_term", "long_term", "indefinite"
  ];

  for (const tf of timeframes) {
    const tfPredictions = validated.filter(p => p.timeframe === tf);
    const tfCorrect = tfPredictions.filter(p => p.wasCorrect);
    byTimeframe[tf] = {
      total: tfPredictions.length,
      correct: tfCorrect.length,
      accuracy: tfPredictions.length > 0 ? tfCorrect.length / tfPredictions.length : 0
    };
  }

  // Calculate confidence calibration
  const highConf = validated.filter(p => p.confidence >= 80);
  const medConf = validated.filter(p => p.confidence >= 50 && p.confidence < 80);
  const lowConf = validated.filter(p => p.confidence < 50);

  return {
    totalPredictions: predictions.length,
    validatedPredictions: validated.length,
    pendingPredictions: pending.length,
    overduePredictions: overdue.length,
    accuracyRate: validated.length > 0 ? correct.length / validated.length : 0,
    avgConfidence: predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
      : 0,
    byCategory,
    byTimeframe,
    confidenceCalibration: {
      highConfidence: {
        predictions: highConf.length,
        accuracy: highConf.length > 0
          ? highConf.filter(p => p.wasCorrect).length / highConf.length
          : 0
      },
      mediumConfidence: {
        predictions: medConf.length,
        accuracy: medConf.length > 0
          ? medConf.filter(p => p.wasCorrect).length / medConf.length
          : 0
      },
      lowConfidence: {
        predictions: lowConf.length,
        accuracy: lowConf.length > 0
          ? lowConf.filter(p => p.wasCorrect).length / lowConf.length
          : 0
      }
    }
  };
}

/**
 * Identify patterns in prediction failures
 */
export async function analyzePredictionFailures(
  prometheusId: number
): Promise<{
  commonPatterns: string[];
  categoryFailureRates: Record<string, number>;
  timeframeFailureRates: Record<string, number>;
  recommendations: string[];
}> {
  const failed = await getValidatedPredictions(prometheusId, { onlyIncorrect: true });

  const categoryFailures: Record<string, number> = {};
  const timeframeFailures: Record<string, number> = {};
  const patterns: string[] = [];

  for (const prediction of failed) {
    // Count by category
    categoryFailures[prediction.category] = (categoryFailures[prediction.category] || 0) + 1;

    // Count by timeframe
    timeframeFailures[prediction.timeframe] = (timeframeFailures[prediction.timeframe] || 0) + 1;

    // Collect lessons
    if (prediction.lessonsLearned) {
      patterns.push(...prediction.lessonsLearned);
    }
  }

  // Find common patterns
  const patternCounts = patterns.reduce((acc, p) => {
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonPatterns = Object.entries(patternCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern]) => pattern);

  // Generate recommendations
  const recommendations: string[] = [];

  // Find worst category
  const worstCategory = Object.entries(categoryFailures)
    .sort((a, b) => b[1] - a[1])[0];

  if (worstCategory) {
    recommendations.push(
      `Review methodology for ${worstCategory[0]} predictions (${worstCategory[1]} failures)`
    );
  }

  // Find worst timeframe
  const worstTimeframe = Object.entries(timeframeFailures)
    .sort((a, b) => b[1] - a[1])[0];

  if (worstTimeframe) {
    recommendations.push(
      `${worstTimeframe[0]} predictions have high failure rate - consider extending timeframes`
    );
  }

  return {
    commonPatterns,
    categoryFailureRates: categoryFailures,
    timeframeFailureRates: timeframeFailures,
    recommendations
  };
}

// ============================================================================
// AUTOMATIC PREDICTION GENERATION
// ============================================================================

/**
 * Generate predictions from high-confidence knowledge nodes
 */
export async function generatePredictionsFromKnowledge(
  prometheusId: number,
  minConfidence: number = 70
): Promise<number[]> {
  const createdPredictionIds: number[] = [];

  // Get treatment and mechanism nodes with high confidence
  const treatmentNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, minConfidence),
      sql`${prometheusKnowledgeNodes.nodeType} IN ('treatment', 'mechanism')`
    )
  });

  for (const node of treatmentNodes) {
    // Create prediction for treatment response
    const predictionId = await createPrediction(prometheusId, {
      category: "treatment_response",
      statement: `Based on ${node.label}, expected positive response in treatment outcomes`,
      statementKa: node.labelKa ? `${node.labelKa}-ის საფუძველზე, მოსალოდნელია დადებითი რეაგირება` : undefined,
      confidence: Math.round(node.confidence * 0.8), // Slightly lower confidence for predictions
      timeframe: "medium_term",
      expectedOutcome: "Improvement in related symptoms or metrics",
      sourceNodeIds: [node.id]
    });

    createdPredictionIds.push(predictionId);
  }

  console.log(`[PROMETHEUS] Generated ${createdPredictionIds.length} predictions from knowledge`);

  return createdPredictionIds;
}
