/**
 * PROMETHEUS-MIND Core Orchestrator
 * ==================================
 * Central controller integrating all Prometheus subsystems with Evolution
 *
 * Created by Dr. Amara Osei (Chief Integration Architect)
 *
 * This orchestrator:
 * - Initializes Prometheus for each child
 * - Hooks into Evolution cycle phases
 * - Coordinates memory, knowledge, and evolution subsystems
 * - Runs scheduled consolidation and meta-learning
 */

import { db } from "../db";
import { eq, and, desc, gte } from "drizzle-orm";
import {
  prometheusState,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusLearningEvents,
  evolutionCycles,
  evolutionDailyRuns,
  evolutionInsights,
  accumulatedKnowledge,
  type PrometheusState,
  type EvolutionCycle,
  type EvolutionDailyRun,
} from "../../shared/schema";

import {
  initializePrometheus,
  storeMemory,
  storeEpisodicFromInsight,
  createKnowledgeNode,
  createKnowledgeEdge,
  recordLearningEvent,
  processEvolutionDailyRun,
  syncWithEvolutionHistory,
  getPrometheusState,
  getPrometheusMetrics,
  updatePrometheusStatus,
  searchMemories,
  getHighPriorityMemories,
  getKnowledgeNodes,
  getConnectedNodes,
} from "./memoryLayer";

import {
  recordError,
  runAutoCorrection,
  verifyKnowledgeNode,
  recordPrediction,
  validatePrediction,
  getUnresolvedErrors,
} from "./errorDetection";

import {
  runFullConsolidationCycle,
  runMetaLearning,
  updateAverageConfidence,
} from "./selfEvolution";

// ============================================================================
// TYPES
// ============================================================================

export interface PrometheusStatus {
  state: PrometheusState;
  metrics: {
    totalNodes: number;
    totalMemories: number;
    totalLearningEvents: number;
    avgConfidence: number;
    predictionAccuracy: number;
    errorRate: number;
    highConfidenceNodes: number;
    recentLearningEvents: number;
  };
  unresolvedErrors: number;
  lastConsolidation: Date | null;
}

export interface PrometheusInsight {
  content: string;
  contentKa?: string;
  confidence: number;
  certaintyLevel: string;
  sources: string[];
  relatedNodes: Array<{
    id: number;
    label: string;
    type: string;
    confidence: number;
  }>;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize or get Prometheus instance for a child
 * This should be called when Evolution cycle starts
 */
export async function ensurePrometheusForChild(
  userId: string,
  childId: number
): Promise<PrometheusState> {
  let prometheus = await getPrometheusState(childId);

  if (!prometheus) {
    console.log(`[Prometheus Orchestrator] Initializing new instance for child ${childId}`);
    prometheus = await initializePrometheus(userId, childId);

    // Sync with any existing Evolution history
    await syncWithEvolutionHistory(prometheus.id, childId);
  }

  return prometheus;
}

/**
 * Get full Prometheus status for a child
 */
export async function getPrometheusStatus(childId: number): Promise<PrometheusStatus | null> {
  const state = await getPrometheusState(childId);
  if (!state) return null;

  const metrics = await getPrometheusMetrics(state.id);
  const unresolvedErrors = await getUnresolvedErrors(state.id);

  return {
    state,
    metrics,
    unresolvedErrors: unresolvedErrors.length,
    lastConsolidation: state.lastConsolidationAt,
  };
}

// ============================================================================
// EVOLUTION INTEGRATION HOOKS
// ============================================================================

/**
 * Hook: Called when an Evolution cycle starts
 */
export async function onEvolutionCycleStart(
  cycle: EvolutionCycle
): Promise<void> {
  if (!cycle.userId || !cycle.childId) return;

  console.log(`[Prometheus Orchestrator] Evolution cycle ${cycle.id} started`);

  const prometheus = await ensurePrometheusForChild(cycle.userId, cycle.childId);

  // Update status
  await updatePrometheusStatus(prometheus.id, "active", "observing_evolution");

  // Record learning event
  await recordLearningEvent(prometheus.id, {
    eventType: "new_information",
    description: `Evolution cycle ${cycle.id} started with diagnosis context: ${cycle.diagnosisContext?.substring(0, 100)}...`,
    impact: 0.3,
    metadata: {
      cycleId: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      diagnosisContext: cycle.diagnosisContext,
    },
  });
}

/**
 * Hook: Called when an Evolution phase completes
 */
export async function onEvolutionPhaseComplete(
  dailyRun: EvolutionDailyRun,
  phase: string,
  insights: Array<typeof evolutionInsights.$inferSelect>
): Promise<void> {
  // Get cycle to find child
  const cycle = await db.query.evolutionCycles.findFirst({
    where: eq(evolutionCycles.id, dailyRun.cycleId!),
  });

  if (!cycle?.childId) return;

  const prometheus = await getPrometheusState(cycle.childId);
  if (!prometheus) return;

  console.log(`[Prometheus Orchestrator] Processing ${insights.length} insights from phase ${phase}`);

  // Store each insight as episodic memory
  for (const insight of insights) {
    await storeEpisodicFromInsight(prometheus.id, insight);

    // If it's a hypothesis, also create prediction for later validation
    if (insight.insightType === "hypothesis" && insight.confidence && insight.confidence >= 60) {
      await recordPrediction(
        prometheus.id,
        insight.contentEn || "",
        [], // Related node IDs would be determined by similarity search
        insight.confidence
      );
    }
  }

  // Create knowledge nodes for high-confidence insights
  const highConfidenceInsights = insights.filter((i) => (i.confidence || 0) >= 70);
  for (const insight of highConfidenceInsights) {
    await createKnowledgeNode(prometheus.id, {
      nodeType: mapInsightTypeToNodeType(insight.insightType || "observation"),
      label: extractLabel(insight.contentEn || ""),
      labelKa: insight.contentKa ? extractLabel(insight.contentKa) : undefined,
      description: insight.contentEn,
      descriptionKa: insight.contentKa,
      certaintyLevel: mapConfidenceToCertainty(insight.confidence || 50),
      confidence: insight.confidence || 50,
      sourceIds: [`evolution_insight:${insight.id}`],
      metadata: {
        phase,
        insightType: insight.insightType,
        dailyRunId: dailyRun.id,
        sources: insight.sources,
      },
    });
  }

  // Record learning event
  await recordLearningEvent(prometheus.id, {
    eventType: "new_information",
    description: `Processed Evolution phase ${phase}: ${insights.length} insights, ${highConfidenceInsights.length} high-confidence`,
    impact: 0.4,
    metadata: {
      phase,
      dailyRunId: dailyRun.id,
      totalInsights: insights.length,
      highConfidenceCount: highConfidenceInsights.length,
    },
  });
}

/**
 * Hook: Called when an Evolution daily run completes
 */
export async function onEvolutionDailyRunComplete(
  dailyRun: EvolutionDailyRun
): Promise<void> {
  const cycle = await db.query.evolutionCycles.findFirst({
    where: eq(evolutionCycles.id, dailyRun.cycleId!),
  });

  if (!cycle?.childId) return;

  const prometheus = await getPrometheusState(cycle.childId);
  if (!prometheus) return;

  console.log(`[Prometheus Orchestrator] Daily run ${dailyRun.id} completed`);

  // Process all insights from this daily run
  const result = await processEvolutionDailyRun(prometheus.id, dailyRun.id);

  console.log(`[Prometheus Orchestrator] Created ${result.memoriesCreated} memories, ${result.nodesCreated} nodes`);

  // Run mini-consolidation after each daily run
  await runAutoCorrection(prometheus.id);
  await updateAverageConfidence(prometheus.id);
}

/**
 * Hook: Called when an Evolution cycle completes
 */
export async function onEvolutionCycleComplete(
  cycle: EvolutionCycle
): Promise<void> {
  if (!cycle.childId) return;

  const prometheus = await getPrometheusState(cycle.childId);
  if (!prometheus) return;

  console.log(`[Prometheus Orchestrator] Evolution cycle ${cycle.id} completed`);

  // Import accumulated knowledge created by this cycle
  const newKnowledge = await db.query.accumulatedKnowledge.findMany({
    where: eq(accumulatedKnowledge.originCycleId, cycle.id),
  });

  for (const knowledge of newKnowledge) {
    // Store as high-priority semantic memory
    await storeMemory(prometheus.id, {
      memoryType: "semantic",
      priority: "high",
      content: knowledge.contentEn || "",
      contentKa: knowledge.contentKa,
      certaintyLevel: mapConfidenceToCertainty(knowledge.confidence || 50),
      confidence: knowledge.confidence || 50,
      sourceIds: [`accumulated_knowledge:${knowledge.id}`],
      tags: [knowledge.knowledgeType, "cycle_result"],
      metadata: {
        originType: "accumulated_knowledge",
        originId: knowledge.id,
        cycleId: cycle.id,
      },
    });
  }

  // Run full consolidation cycle
  console.log(`[Prometheus Orchestrator] Running full consolidation cycle`);
  const consolidationResult = await runFullConsolidationCycle(prometheus.id);

  // Run meta-learning
  const metaResult = await runMetaLearning(prometheus.id);

  // Record learning event
  await recordLearningEvent(prometheus.id, {
    eventType: "knowledge_synthesis",
    description: `Evolution cycle ${cycle.id} completed: ${newKnowledge.length} knowledge items absorbed`,
    impact: 0.8,
    metadata: {
      cycleId: cycle.id,
      newKnowledgeCount: newKnowledge.length,
      consolidationTime: consolidationResult.totalTime,
      patternsFound: metaResult.patternsFound,
    },
    lessonsLearned: metaResult.suggestedImprovements,
  });
}

// ============================================================================
// QUERY INTERFACE
// ============================================================================

/**
 * Query Prometheus for insights related to a topic
 */
export async function queryPrometheus(
  childId: number,
  query: string
): Promise<PrometheusInsight[]> {
  const prometheus = await getPrometheusState(childId);
  if (!prometheus) return [];

  // Search memories
  const memories = await searchMemories(prometheus.id, query, 10);

  // Get related knowledge nodes
  const nodes = await getKnowledgeNodes(prometheus.id, {
    minConfidence: 50,
    limit: 20,
  });

  // Filter nodes by query relevance (simple text matching)
  const queryWords = query.toLowerCase().split(/\s+/);
  const relevantNodes = nodes.filter((node) => {
    const nodeText = `${node.label} ${node.description || ""}`.toLowerCase();
    return queryWords.some((word) => nodeText.includes(word));
  });

  // Build insights from memories and nodes
  const insights: PrometheusInsight[] = [];

  for (const { memory, relevanceScore } of memories) {
    if (relevanceScore > 30) {
      insights.push({
        content: memory.content,
        contentKa: memory.contentKa || undefined,
        confidence: memory.confidence || 50,
        certaintyLevel: memory.certaintyLevel || "hypothesis",
        sources: memory.sourceIds || [],
        relatedNodes: relevantNodes.slice(0, 5).map((n) => ({
          id: n.id,
          label: n.label,
          type: n.nodeType,
          confidence: n.confidence || 50,
        })),
      });
    }
  }

  return insights;
}

/**
 * Get high-priority insights for a child
 */
export async function getHighPriorityInsights(
  childId: number,
  limit: number = 10
): Promise<PrometheusInsight[]> {
  const prometheus = await getPrometheusState(childId);
  if (!prometheus) return [];

  const memories = await getHighPriorityMemories(prometheus.id, limit);

  return memories.map((memory) => ({
    content: memory.content,
    contentKa: memory.contentKa || undefined,
    confidence: memory.confidence || 50,
    certaintyLevel: memory.certaintyLevel || "hypothesis",
    sources: memory.sourceIds || [],
    relatedNodes: [],
  }));
}

/**
 * Get knowledge graph for visualization
 */
export async function getKnowledgeGraph(
  childId: number
): Promise<{
  nodes: Array<{
    id: number;
    label: string;
    type: string;
    confidence: number;
    certaintyLevel: string;
  }>;
  edges: Array<{
    source: number;
    target: number;
    type: string;
    strength: number;
  }>;
}> {
  const prometheus = await getPrometheusState(childId);
  if (!prometheus) return { nodes: [], edges: [] };

  const dbNodes = await getKnowledgeNodes(prometheus.id, { limit: 200 });
  const dbEdges = await db.query.prometheusKnowledgeEdges.findMany({
    where: eq(db.query.prometheusKnowledgeEdges.columns.prometheusId, prometheus.id),
  });

  return {
    nodes: dbNodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.nodeType,
      confidence: n.confidence || 50,
      certaintyLevel: n.certaintyLevel || "hypothesis",
    })),
    edges: dbEdges
      .filter((e) => e.sourceNodeId && e.targetNodeId)
      .map((e) => ({
        source: e.sourceNodeId!,
        target: e.targetNodeId!,
        type: e.relationType,
        strength: e.strength || 0.5,
      })),
  };
}

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

/**
 * Run scheduled Prometheus maintenance
 * Should be called by a scheduler (e.g., every 24 hours)
 */
export async function runScheduledMaintenance(): Promise<void> {
  console.log(`[Prometheus Orchestrator] Running scheduled maintenance`);

  // Get all active Prometheus instances
  const allPrometheus = await db.query.prometheusState.findMany({
    where: eq(prometheusState.status, "active"),
  });

  for (const prometheus of allPrometheus) {
    try {
      // Check if consolidation is needed (> 24 hours since last)
      const lastConsolidation = prometheus.lastConsolidationAt;
      const hoursSinceConsolidation = lastConsolidation
        ? (Date.now() - new Date(lastConsolidation).getTime()) / (1000 * 60 * 60)
        : 999;

      if (hoursSinceConsolidation > 24) {
        console.log(`[Prometheus Orchestrator] Running consolidation for ${prometheus.id}`);
        await runFullConsolidationCycle(prometheus.id);
      }

      // Run auto-correction
      await runAutoCorrection(prometheus.id);

      // Update metrics
      await updateAverageConfidence(prometheus.id);

      // Run meta-learning weekly
      if (hoursSinceConsolidation > 168) {
        await runMetaLearning(prometheus.id);
      }
    } catch (error) {
      console.error(`[Prometheus Orchestrator] Maintenance failed for ${prometheus.id}:`, error);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapInsightTypeToNodeType(insightType: string): string {
  const mapping: Record<string, string> = {
    observation: "fact",
    learning: "concept",
    connection: "concept",
    hypothesis: "hypothesis",
    prediction: "hypothesis",
    synthesis: "principle",
    validation: "fact",
    adaptation: "concept",
  };
  return mapping[insightType] || "concept";
}

function mapConfidenceToCertainty(confidence: number): string {
  if (confidence >= 90) return "truth";
  if (confidence >= 75) return "knowledge";
  if (confidence >= 60) return "belief";
  if (confidence >= 40) return "hypothesis";
  if (confidence >= 20) return "aware";
  return "unknown";
}

function extractLabel(content: string): string {
  const firstSentence = content.split(/[.!?]/)[0];
  if (firstSentence.length <= 80) {
    return firstSentence.trim();
  }
  return content.substring(0, 80).trim() + "...";
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Memory Layer
  storeMemory,
  searchMemories,
  getHighPriorityMemories,
  createKnowledgeNode,
  createKnowledgeEdge,
  recordLearningEvent,
  getKnowledgeNodes,
  getConnectedNodes,

  // Error Detection
  recordError,
  runAutoCorrection,
  verifyKnowledgeNode,
  recordPrediction,
  validatePrediction,
  getUnresolvedErrors,

  // Self Evolution
  runFullConsolidationCycle,
  runMetaLearning,
  updateAverageConfidence,
};
