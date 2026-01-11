/**
 * PROMETHEUS-MIND Memory Layer
 * ============================
 * Multi-layer memory system that integrates with Evolution cycles
 *
 * Created by Dr. Elena Volkov-Petrov (Chief Memory Systems Architect)
 *
 * Memory Types:
 * - Working Memory: Current context (seconds-minutes)
 * - Episodic Memory: Specific experiences from evolution cycles
 * - Semantic Memory: General facts and concepts extracted
 * - Procedural Memory: How-to knowledge (research patterns)
 * - Meta Memory: Knowledge about knowledge
 */

import { db } from "../db";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import {
  prometheusState,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusKnowledgeEdges,
  prometheusLearningEvents,
  evolutionInsights,
  evolutionCycles,
  evolutionDailyRuns,
  accumulatedKnowledge,
  type PrometheusState,
  type PrometheusMemory,
  type PrometheusKnowledgeNode,
  type InsertPrometheusMemory,
  type InsertPrometheusKnowledgeNode,
  type InsertPrometheusKnowledgeEdge,
  type InsertPrometheusLearningEvent,
} from "../../shared/schema";

// ============================================================================
// TYPES
// ============================================================================

export type MemoryType = "working" | "episodic" | "semantic" | "procedural" | "meta";
export type MemoryPriority = "critical" | "high" | "medium" | "low" | "ephemeral";
export type CertaintyLevel = "unknown" | "aware" | "hypothesis" | "belief" | "knowledge" | "truth";

export interface MemorySearchResult {
  memory: PrometheusMemory;
  relevanceScore: number;
}

export interface KnowledgeGraphQuery {
  nodeTypes?: string[];
  minConfidence?: number;
  certaintyLevels?: CertaintyLevel[];
  limit?: number;
}

// ============================================================================
// PROMETHEUS INITIALIZATION
// ============================================================================

/**
 * Initialize or get Prometheus state for a child
 */
export async function initializePrometheus(
  userId: string,
  childId: number
): Promise<PrometheusState> {
  // Check if Prometheus already exists for this child
  const existing = await db.query.prometheusState.findFirst({
    where: and(
      eq(prometheusState.userId, userId),
      eq(prometheusState.childId, childId)
    ),
  });

  if (existing) {
    return existing;
  }

  // Create new Prometheus instance
  const [newPrometheus] = await db
    .insert(prometheusState)
    .values({
      userId,
      childId,
      status: "initializing",
      currentPhase: "awakening",
      totalKnowledgeNodes: 0,
      totalMemoryItems: 0,
      totalLearningEvents: 0,
      avgConfidence: 50,
      predictionAccuracy: 0,
      errorRate: 0,
    })
    .returning();

  console.log(`[Prometheus] Initialized new instance for child ${childId}`);

  // Import existing accumulated knowledge into Prometheus
  await importAccumulatedKnowledge(newPrometheus.id, childId);

  return newPrometheus;
}

/**
 * Import existing accumulated knowledge into Prometheus memory and knowledge graph
 */
async function importAccumulatedKnowledge(
  prometheusId: number,
  childId: number
): Promise<void> {
  const existingKnowledge = await db.query.accumulatedKnowledge.findMany({
    where: eq(accumulatedKnowledge.childId, childId),
  });

  console.log(`[Prometheus] Importing ${existingKnowledge.length} accumulated knowledge items`);

  for (const knowledge of existingKnowledge) {
    // Create semantic memory from accumulated knowledge
    await storeMemory(prometheusId, {
      memoryType: "semantic",
      priority: knowledge.confidence && knowledge.confidence >= 70 ? "high" : "medium",
      content: knowledge.contentEn || "",
      contentKa: knowledge.contentKa,
      certaintyLevel: mapConfidenceToCertainty(knowledge.confidence || 50),
      confidence: knowledge.confidence || 50,
      sourceIds: [`accumulated_knowledge:${knowledge.id}`],
      tags: [knowledge.knowledgeType, knowledge.status || "active"],
      metadata: {
        originType: "accumulated_knowledge",
        originId: knowledge.id,
        originCycleId: knowledge.originCycleId,
      },
    });

    // Create knowledge node
    await createKnowledgeNode(prometheusId, {
      nodeType: mapKnowledgeTypeToNodeType(knowledge.knowledgeType),
      label: knowledge.titleEn || "",
      labelKa: knowledge.titleKa,
      description: knowledge.contentEn,
      descriptionKa: knowledge.contentKa,
      certaintyLevel: mapConfidenceToCertainty(knowledge.confidence || 50),
      confidence: knowledge.confidence || 50,
      validationCount: knowledge.validationCount || 0,
      contradictionCount: knowledge.contradictionCount || 0,
      sourceIds: [`accumulated_knowledge:${knowledge.id}`],
      metadata: {
        originType: "accumulated_knowledge",
        originId: knowledge.id,
        status: knowledge.status,
      },
    });
  }
}

// ============================================================================
// MEMORY OPERATIONS
// ============================================================================

/**
 * Store a new memory item
 */
export async function storeMemory(
  prometheusId: number,
  memory: Omit<InsertPrometheusMemory, "prometheusId">
): Promise<PrometheusMemory> {
  const [stored] = await db
    .insert(prometheusMemory)
    .values({
      ...memory,
      prometheusId,
    })
    .returning();

  // Update Prometheus state
  await db
    .update(prometheusState)
    .set({
      totalMemoryItems: sql`${prometheusState.totalMemoryItems} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));

  return stored;
}

/**
 * Store episodic memory from an Evolution insight
 */
export async function storeEpisodicFromInsight(
  prometheusId: number,
  insight: typeof evolutionInsights.$inferSelect
): Promise<PrometheusMemory> {
  return storeMemory(prometheusId, {
    memoryType: "episodic",
    priority: insight.relevanceScore && insight.relevanceScore >= 70 ? "high" : "medium",
    content: insight.contentEn || "",
    contentKa: insight.contentKa,
    certaintyLevel: mapConfidenceToCertainty(insight.confidence || 50),
    confidence: insight.confidence || 50,
    sourceIds: [`evolution_insight:${insight.id}`],
    tags: [insight.phase, insight.insightType || "observation"],
    metadata: {
      originType: "evolution_insight",
      originId: insight.id,
      dailyRunId: insight.dailyRunId,
      phase: insight.phase,
      insightType: insight.insightType,
      sources: insight.sources,
    },
  });
}

/**
 * Retrieve memories by type
 */
export async function getMemoriesByType(
  prometheusId: number,
  memoryType: MemoryType,
  limit: number = 100
): Promise<PrometheusMemory[]> {
  return db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      eq(prometheusMemory.memoryType, memoryType)
    ),
    orderBy: [desc(prometheusMemory.confidence), desc(prometheusMemory.createdAt)],
    limit,
  });
}

/**
 * Retrieve high-priority memories
 */
export async function getHighPriorityMemories(
  prometheusId: number,
  limit: number = 50
): Promise<PrometheusMemory[]> {
  return db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      inArray(prometheusMemory.priority, ["critical", "high"])
    ),
    orderBy: [desc(prometheusMemory.confidence), desc(prometheusMemory.accessCount)],
    limit,
  });
}

/**
 * Search memories by content similarity (text-based for now)
 */
export async function searchMemories(
  prometheusId: number,
  query: string,
  limit: number = 20
): Promise<MemorySearchResult[]> {
  // For now, use simple text search. In production, use vector embeddings
  const memories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.content} ILIKE ${'%' + query + '%'}`
    ),
    limit: limit * 2, // Get more to filter
  });

  // Calculate basic relevance score
  const results: MemorySearchResult[] = memories.map((memory) => {
    const content = memory.content.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    let matchCount = 0;
    for (const word of queryWords) {
      if (content.includes(word)) {
        matchCount++;
      }
    }

    const relevanceScore = (matchCount / queryWords.length) * 100;

    return { memory, relevanceScore };
  });

  // Sort by relevance and return top results
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/**
 * Access a memory (updates access count and timestamp)
 */
export async function accessMemory(memoryId: number): Promise<void> {
  await db
    .update(prometheusMemory)
    .set({
      accessCount: sql`${prometheusMemory.accessCount} + 1`,
      lastAccessedAt: new Date(),
    })
    .where(eq(prometheusMemory.id, memoryId));
}

/**
 * Upgrade memory certainty level based on validation
 */
export async function upgradeMemoryCertainty(
  memoryId: number,
  newCertaintyLevel: CertaintyLevel,
  newConfidence: number
): Promise<void> {
  await db
    .update(prometheusMemory)
    .set({
      certaintyLevel: newCertaintyLevel,
      confidence: newConfidence,
      updatedAt: new Date(),
    })
    .where(eq(prometheusMemory.id, memoryId));
}

// ============================================================================
// KNOWLEDGE GRAPH OPERATIONS
// ============================================================================

/**
 * Create a knowledge node
 */
export async function createKnowledgeNode(
  prometheusId: number,
  node: Omit<InsertPrometheusKnowledgeNode, "prometheusId">
): Promise<PrometheusKnowledgeNode> {
  // Check if similar node already exists
  const existing = await db.query.prometheusKnowledgeNodes.findFirst({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      eq(prometheusKnowledgeNodes.label, node.label)
    ),
  });

  if (existing) {
    // Update existing node with new evidence
    await db
      .update(prometheusKnowledgeNodes)
      .set({
        evidenceCount: sql`${prometheusKnowledgeNodes.evidenceCount} + 1`,
        confidence: Math.min(100, (existing.confidence || 50) + 5),
        updatedAt: new Date(),
      })
      .where(eq(prometheusKnowledgeNodes.id, existing.id));

    return existing;
  }

  const [created] = await db
    .insert(prometheusKnowledgeNodes)
    .values({
      ...node,
      prometheusId,
    })
    .returning();

  // Update Prometheus state
  await db
    .update(prometheusState)
    .set({
      totalKnowledgeNodes: sql`${prometheusState.totalKnowledgeNodes} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));

  return created;
}

/**
 * Create a knowledge edge (relationship)
 */
export async function createKnowledgeEdge(
  prometheusId: number,
  edge: Omit<InsertPrometheusKnowledgeEdge, "prometheusId">
): Promise<void> {
  // Check if edge already exists
  const existing = await db.query.prometheusKnowledgeEdges.findFirst({
    where: and(
      eq(prometheusKnowledgeEdges.prometheusId, prometheusId),
      eq(prometheusKnowledgeEdges.sourceNodeId, edge.sourceNodeId!),
      eq(prometheusKnowledgeEdges.targetNodeId, edge.targetNodeId!),
      eq(prometheusKnowledgeEdges.relationType, edge.relationType)
    ),
  });

  if (existing) {
    // Strengthen existing edge
    await db
      .update(prometheusKnowledgeEdges)
      .set({
        strength: Math.min(1, (existing.strength || 0.5) + 0.1),
        confidence: Math.min(100, (existing.confidence || 50) + 5),
        updatedAt: new Date(),
      })
      .where(eq(prometheusKnowledgeEdges.id, existing.id));
    return;
  }

  await db.insert(prometheusKnowledgeEdges).values({
    ...edge,
    prometheusId,
  });
}

/**
 * Get knowledge nodes by query
 */
export async function getKnowledgeNodes(
  prometheusId: number,
  query: KnowledgeGraphQuery
): Promise<PrometheusKnowledgeNode[]> {
  let whereConditions = [eq(prometheusKnowledgeNodes.prometheusId, prometheusId)];

  if (query.nodeTypes && query.nodeTypes.length > 0) {
    whereConditions.push(inArray(prometheusKnowledgeNodes.nodeType, query.nodeTypes));
  }

  if (query.minConfidence) {
    whereConditions.push(gte(prometheusKnowledgeNodes.confidence, query.minConfidence));
  }

  if (query.certaintyLevels && query.certaintyLevels.length > 0) {
    whereConditions.push(inArray(prometheusKnowledgeNodes.certaintyLevel, query.certaintyLevels));
  }

  return db.query.prometheusKnowledgeNodes.findMany({
    where: and(...whereConditions),
    orderBy: [desc(prometheusKnowledgeNodes.confidence)],
    limit: query.limit || 100,
  });
}

/**
 * Get connected nodes (neighbors in the graph)
 */
export async function getConnectedNodes(
  prometheusId: number,
  nodeId: number
): Promise<{ node: PrometheusKnowledgeNode; edge: typeof prometheusKnowledgeEdges.$inferSelect }[]> {
  // Get outgoing edges
  const outgoingEdges = await db.query.prometheusKnowledgeEdges.findMany({
    where: and(
      eq(prometheusKnowledgeEdges.prometheusId, prometheusId),
      eq(prometheusKnowledgeEdges.sourceNodeId, nodeId)
    ),
  });

  // Get incoming edges
  const incomingEdges = await db.query.prometheusKnowledgeEdges.findMany({
    where: and(
      eq(prometheusKnowledgeEdges.prometheusId, prometheusId),
      eq(prometheusKnowledgeEdges.targetNodeId, nodeId)
    ),
  });

  const results: { node: PrometheusKnowledgeNode; edge: typeof prometheusKnowledgeEdges.$inferSelect }[] = [];

  // Get nodes for outgoing edges
  for (const edge of outgoingEdges) {
    if (edge.targetNodeId) {
      const node = await db.query.prometheusKnowledgeNodes.findFirst({
        where: eq(prometheusKnowledgeNodes.id, edge.targetNodeId),
      });
      if (node) {
        results.push({ node, edge });
      }
    }
  }

  // Get nodes for incoming edges
  for (const edge of incomingEdges) {
    if (edge.sourceNodeId) {
      const node = await db.query.prometheusKnowledgeNodes.findFirst({
        where: eq(prometheusKnowledgeNodes.id, edge.sourceNodeId),
      });
      if (node) {
        results.push({ node, edge });
      }
    }
  }

  return results;
}

/**
 * Validate a knowledge node (increase validation count)
 */
export async function validateKnowledgeNode(
  nodeId: number,
  isValid: boolean
): Promise<void> {
  if (isValid) {
    await db
      .update(prometheusKnowledgeNodes)
      .set({
        validationCount: sql`${prometheusKnowledgeNodes.validationCount} + 1`,
        lastValidatedAt: new Date(),
        confidence: sql`LEAST(100, ${prometheusKnowledgeNodes.confidence} + 5)`,
        updatedAt: new Date(),
      })
      .where(eq(prometheusKnowledgeNodes.id, nodeId));
  } else {
    await db
      .update(prometheusKnowledgeNodes)
      .set({
        contradictionCount: sql`${prometheusKnowledgeNodes.contradictionCount} + 1`,
        confidence: sql`GREATEST(0, ${prometheusKnowledgeNodes.confidence} - 10)`,
        updatedAt: new Date(),
      })
      .where(eq(prometheusKnowledgeNodes.id, nodeId));
  }
}

// ============================================================================
// LEARNING EVENTS
// ============================================================================

/**
 * Record a learning event
 */
export async function recordLearningEvent(
  prometheusId: number,
  event: Omit<InsertPrometheusLearningEvent, "prometheusId">
): Promise<void> {
  await db.insert(prometheusLearningEvents).values({
    ...event,
    prometheusId,
  });

  // Update Prometheus state
  await db
    .update(prometheusState)
    .set({
      totalLearningEvents: sql`${prometheusState.totalLearningEvents} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));
}

// ============================================================================
// INTEGRATION WITH EVOLUTION
// ============================================================================

/**
 * Process all insights from an Evolution daily run into Prometheus memory
 */
export async function processEvolutionDailyRun(
  prometheusId: number,
  dailyRunId: number
): Promise<{ memoriesCreated: number; nodesCreated: number }> {
  const insights = await db.query.evolutionInsights.findMany({
    where: eq(evolutionInsights.dailyRunId, dailyRunId),
  });

  let memoriesCreated = 0;
  let nodesCreated = 0;

  for (const insight of insights) {
    // Store as episodic memory
    await storeEpisodicFromInsight(prometheusId, insight);
    memoriesCreated++;

    // Extract and create knowledge nodes based on insight type
    if (insight.insightType === "hypothesis" || insight.insightType === "prediction") {
      await createKnowledgeNode(prometheusId, {
        nodeType: "hypothesis",
        label: extractTitle(insight.contentEn || ""),
        labelKa: insight.contentKa ? extractTitle(insight.contentKa) : undefined,
        description: insight.contentEn,
        descriptionKa: insight.contentKa,
        certaintyLevel: "hypothesis",
        confidence: insight.confidence || 50,
        sourceIds: [`evolution_insight:${insight.id}`],
        metadata: {
          phase: insight.phase,
          insightType: insight.insightType,
          dailyRunId: insight.dailyRunId,
        },
      });
      nodesCreated++;
    }

    if (insight.insightType === "connection" || insight.insightType === "synthesis") {
      await createKnowledgeNode(prometheusId, {
        nodeType: "concept",
        label: extractTitle(insight.contentEn || ""),
        description: insight.contentEn,
        certaintyLevel: mapConfidenceToCertainty(insight.confidence || 50),
        confidence: insight.confidence || 50,
        sourceIds: [`evolution_insight:${insight.id}`],
      });
      nodesCreated++;
    }
  }

  // Record learning event
  await recordLearningEvent(prometheusId, {
    eventType: "new_information",
    description: `Processed Evolution daily run ${dailyRunId}: ${memoriesCreated} memories, ${nodesCreated} nodes created`,
    impact: 0.5,
    metadata: {
      dailyRunId,
      memoriesCreated,
      nodesCreated,
    },
  });

  return { memoriesCreated, nodesCreated };
}

/**
 * Sync Prometheus with all Evolution cycles for a child
 */
export async function syncWithEvolutionHistory(
  prometheusId: number,
  childId: number
): Promise<void> {
  // Get all completed evolution cycles for this child
  const cycles = await db.query.evolutionCycles.findMany({
    where: and(
      eq(evolutionCycles.childId, childId),
      eq(evolutionCycles.status, "completed")
    ),
  });

  console.log(`[Prometheus] Syncing with ${cycles.length} completed Evolution cycles`);

  for (const cycle of cycles) {
    // Get all daily runs for this cycle
    const dailyRuns = await db.query.evolutionDailyRuns.findMany({
      where: and(
        eq(evolutionDailyRuns.cycleId, cycle.id),
        eq(evolutionDailyRuns.status, "completed")
      ),
    });

    for (const run of dailyRuns) {
      await processEvolutionDailyRun(prometheusId, run.id);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapConfidenceToCertainty(confidence: number): CertaintyLevel {
  if (confidence >= 90) return "truth";
  if (confidence >= 75) return "knowledge";
  if (confidence >= 60) return "belief";
  if (confidence >= 40) return "hypothesis";
  if (confidence >= 20) return "aware";
  return "unknown";
}

function mapKnowledgeTypeToNodeType(knowledgeType: string): string {
  const mapping: Record<string, string> = {
    hypothesis: "hypothesis",
    discovery: "fact",
    treatment_insight: "treatment",
    mechanism: "mechanism",
    pattern: "concept",
    connection: "concept",
    prediction: "hypothesis",
  };
  return mapping[knowledgeType] || "concept";
}

function extractTitle(content: string): string {
  // Extract first sentence or first 100 characters as title
  const firstSentence = content.split(/[.!?]/)[0];
  if (firstSentence.length <= 100) {
    return firstSentence.trim();
  }
  return content.substring(0, 100).trim() + "...";
}

// ============================================================================
// PROMETHEUS STATE MANAGEMENT
// ============================================================================

/**
 * Get Prometheus state for a child
 */
export async function getPrometheusState(childId: number): Promise<PrometheusState | null> {
  const state = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.childId, childId),
  });
  return state || null;
}

/**
 * Update Prometheus status
 */
export async function updatePrometheusStatus(
  prometheusId: number,
  status: string,
  currentPhase?: string
): Promise<void> {
  await db
    .update(prometheusState)
    .set({
      status,
      currentPhase: currentPhase || undefined,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));
}

/**
 * Get Prometheus metrics
 */
export async function getPrometheusMetrics(prometheusId: number): Promise<{
  totalNodes: number;
  totalMemories: number;
  totalLearningEvents: number;
  avgConfidence: number;
  predictionAccuracy: number;
  errorRate: number;
  highConfidenceNodes: number;
  recentLearningEvents: number;
}> {
  const state = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId),
  });

  if (!state) {
    throw new Error(`Prometheus ${prometheusId} not found`);
  }

  // Get high confidence nodes count
  const highConfidenceNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, 70)
    ),
  });

  // Get recent learning events (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentEvents = await db.query.prometheusLearningEvents.findMany({
    where: and(
      eq(prometheusLearningEvents.prometheusId, prometheusId),
      gte(prometheusLearningEvents.createdAt, oneDayAgo)
    ),
  });

  return {
    totalNodes: state.totalKnowledgeNodes || 0,
    totalMemories: state.totalMemoryItems || 0,
    totalLearningEvents: state.totalLearningEvents || 0,
    avgConfidence: state.avgConfidence || 50,
    predictionAccuracy: state.predictionAccuracy || 0,
    errorRate: state.errorRate || 0,
    highConfidenceNodes: highConfidenceNodes.length,
    recentLearningEvents: recentEvents.length,
  };
}
