/**
 * PROMETHEUS-MIND Phase 2: Enhanced Intelligence
 * ==============================================
 * Export all Phase 2 modules
 *
 * Council of Minds (2125):
 * "Phase 2 არის გადასვლა მონაცემთა შეგროვებიდან ჭეშმარიტ გაგებამდე."
 * "Phase 2 is the transition from data collection to true understanding."
 */

// Vector Embeddings - Semantic Search
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
  findSimilarMemories,
  findSimilarKnowledgeNodes,
  semanticSearch,
  findRelatedConcepts,
  findPotentialDuplicates,
  runEmbeddingMaintenance,
  updateMemoryEmbedding,
  updateKnowledgeNodeEmbedding,
  updateMissingMemoryEmbeddings,
  updateMissingKnowledgeNodeEmbeddings,
  type SemanticSearchResult
} from "./vectorEmbeddings";

// Cross-Child Anonymous Learning
export {
  extractAnonymousPatterns,
  aggregateCrossChildPatterns,
  generateCrossChildInsights,
  findRelevantInsightsForChild,
  applyInsightsToChild,
  auditPatternPrivacy,
  runPrivacyAudit,
  type AnonymousPattern,
  type CrossChildInsight
} from "./crossChildLearning";

// Prediction Validation
export {
  createPrediction,
  getPendingPredictions,
  getOverduePredictions,
  getValidatedPredictions,
  validatePrediction,
  getPredictionStats,
  analyzePredictionFailures,
  generatePredictionsFromKnowledge,
  type Prediction,
  type PredictionCategory,
  type PredictionTimeframe,
  type PredictionStats
} from "./predictionValidation";

// Source Verification
export {
  verifyBySourceTriangulation,
  verifyTemporalConsistency,
  verifyCoherence,
  verifyFalsifiability,
  runFullVerification,
  runBatchVerification,
  getVerificationStats,
  type VerificationMethod,
  type VerificationStatus,
  type VerificationResult,
  type SourceCredibility
} from "./sourceVerification";

// Pinecone Vector Database
export {
  initializePinecone,
  isPineconeAvailable,
  upsertVectors,
  querySimilarVectors,
  deleteVectors,
  deleteNamespace,
  syncMemoriesToPinecone,
  syncKnowledgeNodesToPinecone,
  fullSyncToPinecone,
  hybridSemanticSearch,
  getPineconeStats,
  type VectorRecord,
  type HybridSearchResult,
  type PineconeStats
} from "./vectorDB";

// Notification System
export {
  createNotification,
  getNotifications,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  notifyBreakthroughDiscovery,
  notifyNewTreatmentOption,
  notifyClinicalTrialMatch,
  notifyPredictionValidation,
  notifyKnowledgeMilestone,
  notifyVerificationComplete,
  checkAndNotifyImportantDiscoveries,
  generateDigest,
  type PrometheusNotification,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationDigest
} from "./notificationSystem";

// ============================================================================
// PHASE 2 ORCHESTRATION
// ============================================================================

import { runEmbeddingMaintenance as embedMaintenance } from "./vectorEmbeddings";
import { generateCrossChildInsights, findRelevantInsightsForChild, applyInsightsToChild } from "./crossChildLearning";
import { getOverduePredictions, validatePrediction as validatePred } from "./predictionValidation";
import { runBatchVerification } from "./sourceVerification";

/**
 * Run all Phase 2 maintenance tasks
 */
export async function runPhase2Maintenance(
  prometheusId: number
): Promise<{
  embeddingsUpdated: number;
  insightsApplied: number;
  predictionsChecked: number;
  nodesVerified: number;
}> {
  console.log(`[PROMETHEUS PHASE 2] Starting maintenance for instance ${prometheusId}`);

  // 1. Update embeddings
  const embedResult = await embedMaintenance(prometheusId);
  const embeddingsUpdated = embedResult.memoriesUpdated + embedResult.nodesUpdated;

  // 2. Apply cross-child insights
  const insights = await findRelevantInsightsForChild(prometheusId, 5);
  const insightResult = await applyInsightsToChild(prometheusId, insights);
  const insightsApplied = insightResult.insightsApplied;

  // 3. Check overdue predictions
  const overduePredictions = await getOverduePredictions(prometheusId);
  const predictionsChecked = overduePredictions.length;
  // Note: Actual validation requires human input for actual outcomes

  // 4. Verify knowledge nodes
  const verifyResult = await runBatchVerification(prometheusId, {
    maxNodes: 5,
    minAge: 30
  });
  const nodesVerified = verifyResult.nodesVerified;

  console.log(`[PROMETHEUS PHASE 2] Maintenance complete:`, {
    embeddingsUpdated,
    insightsApplied,
    predictionsChecked,
    nodesVerified
  });

  return {
    embeddingsUpdated,
    insightsApplied,
    predictionsChecked,
    nodesVerified
  };
}

/**
 * Get Phase 2 status summary
 */
export async function getPhase2Status(
  prometheusId: number
): Promise<{
  vectorSearch: {
    memoriesWithEmbeddings: number;
    nodesWithEmbeddings: number;
  };
  crossChildLearning: {
    availableInsights: number;
    appliedInsights: number;
  };
  predictions: {
    pending: number;
    validated: number;
    accuracy: number;
  };
  verification: {
    verified: number;
    needsVerification: number;
    passRate: number;
  };
}> {
  // Import functions dynamically to avoid circular deps
  const { db } = await import("../../db");
  const {
    prometheusMemory,
    prometheusKnowledgeNodes,
    prometheusVerifications
  } = await import("../../../shared/schema");
  const { eq, and, sql, isNotNull } = await import("drizzle-orm");

  // Vector search stats
  const memoriesWithEmbed = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      isNotNull(prometheusMemory.contentEmbedding)
    )
  });

  const nodesWithEmbed = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      isNotNull(prometheusKnowledgeNodes.embedding)
    )
  });

  // Cross-child insights
  const insights = await generateCrossChildInsights(3);

  // Predictions
  const { getPendingPredictions, getValidatedPredictions, getPredictionStats } = await import("./predictionValidation");
  const pending = await getPendingPredictions(prometheusId);
  const validated = await getValidatedPredictions(prometheusId);
  const stats = await getPredictionStats(prometheusId);

  // Verification
  const { getVerificationStats } = await import("./sourceVerification");
  const verifyStats = await getVerificationStats(prometheusId);

  return {
    vectorSearch: {
      memoriesWithEmbeddings: memoriesWithEmbed.length,
      nodesWithEmbeddings: nodesWithEmbed.length
    },
    crossChildLearning: {
      availableInsights: insights.length,
      appliedInsights: 0 // Would need to track this
    },
    predictions: {
      pending: pending.length,
      validated: validated.length,
      accuracy: stats.accuracyRate
    },
    verification: {
      verified: verifyStats.totalVerifications,
      needsVerification: verifyStats.nodesNeedingVerification,
      passRate: verifyStats.passRate
    }
  };
}
