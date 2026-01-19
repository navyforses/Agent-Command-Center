// @ts-nocheck
/**
 * PROMETHEUS-MIND Self-Evolution Engine
 * ======================================
 * Consolidation cycles and meta-learning system
 *
 * Created by Dr. Elena Volkov-Petrov & Dr. Kenji Matsumoto
 *
 * Consolidation Phases (Dream Cycle):
 * 1. Collection - Aggregate day's information
 * 2. Evaluation - What is important?
 * 3. Integration - Connect new to existing
 * 4. Compression - Abstract details to principles
 * 5. Reorganization - Optimize knowledge graph
 * 6. Pruning - Remove outdated/wrong information
 */

import { db } from "../db";
import { eq, and, desc, sql, gte, lte, asc, inArray } from "drizzle-orm";
import {
  prometheusState,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusKnowledgeEdges,
  prometheusConsolidationCycles,
  prometheusLearningEvents,
  prometheusErrors,
  type PrometheusConsolidationCycle,
  type PrometheusMemory,
  type PrometheusKnowledgeNode,
  type InsertPrometheusConsolidationCycle,
} from "../../shared/schema";
import {
  storeMemory,
  createKnowledgeNode,
  createKnowledgeEdge,
  recordLearningEvent,
  updatePrometheusStatus,
  getHighPriorityMemories,
} from "./memoryLayer";
import { runAutoCorrection, verifyKnowledgeNode } from "./errorDetection";

// ============================================================================
// TYPES
// ============================================================================

export type ConsolidationPhase =
  | "collection"
  | "evaluation"
  | "integration"
  | "compression"
  | "reorganization"
  | "pruning";

export interface ConsolidationResult {
  phase: ConsolidationPhase;
  memoriesProcessed: number;
  memoriesConsolidated: number;
  memoriesPruned: number;
  nodesCreated: number;
  nodesUpdated: number;
  edgesCreated: number;
  errors: string[];
}

export interface KnowledgeSynthesis {
  principle: string;
  principleKa?: string;
  confidence: number;
  supportingMemoryIds: number[];
  supportingNodeIds: number[];
}

// ============================================================================
// CONSOLIDATION CYCLE MANAGEMENT
// ============================================================================

/**
 * Start a new consolidation cycle
 */
export async function startConsolidationCycle(
  prometheusId: number
): Promise<PrometheusConsolidationCycle> {
  // Update Prometheus status
  await updatePrometheusStatus(prometheusId, "consolidating", "collection");

  // Create consolidation cycle record
  const [cycle] = await db
    .insert(prometheusConsolidationCycles)
    .values({
      prometheusId,
      phase: "collection",
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  console.log(`[Prometheus] Started consolidation cycle ${cycle.id}`);

  return cycle;
}

/**
 * Run full consolidation cycle
 */
export async function runFullConsolidationCycle(
  prometheusId: number
): Promise<{
  cycleId: number;
  results: ConsolidationResult[];
  totalTime: number;
}> {
  const startTime = Date.now();
  const results: ConsolidationResult[] = [];

  const cycle = await startConsolidationCycle(prometheusId);

  const phases: ConsolidationPhase[] = [
    "collection",
    "evaluation",
    "integration",
    "compression",
    "reorganization",
    "pruning",
  ];

  for (const phase of phases) {
    try {
      // Update cycle phase
      await db
        .update(prometheusConsolidationCycles)
        .set({ phase })
        .where(eq(prometheusConsolidationCycles.id, cycle.id));

      await updatePrometheusStatus(prometheusId, "consolidating", phase);

      // Execute phase
      const result = await executeConsolidationPhase(prometheusId, phase);
      results.push(result);

      // Update cycle metrics
      await db
        .update(prometheusConsolidationCycles)
        .set({
          memoriesProcessed: sql`${prometheusConsolidationCycles.memoriesProcessed} + ${result.memoriesProcessed}`,
          memoriesConsolidated: sql`${prometheusConsolidationCycles.memoriesConsolidated} + ${result.memoriesConsolidated}`,
          memoriesPruned: sql`${prometheusConsolidationCycles.memoriesPruned} + ${result.memoriesPruned}`,
          nodesCreated: sql`${prometheusConsolidationCycles.nodesCreated} + ${result.nodesCreated}`,
          nodesUpdated: sql`${prometheusConsolidationCycles.nodesUpdated} + ${result.nodesUpdated}`,
          edgesCreated: sql`${prometheusConsolidationCycles.edgesCreated} + ${result.edgesCreated}`,
        })
        .where(eq(prometheusConsolidationCycles.id, cycle.id));

      console.log(`[Prometheus] Completed consolidation phase: ${phase}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        phase,
        memoriesProcessed: 0,
        memoriesConsolidated: 0,
        memoriesPruned: 0,
        nodesCreated: 0,
        nodesUpdated: 0,
        edgesCreated: 0,
        errors: [errorMsg],
      });
      console.error(`[Prometheus] Error in consolidation phase ${phase}:`, error);
    }
  }

  // Complete cycle
  await db
    .update(prometheusConsolidationCycles)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(prometheusConsolidationCycles.id, cycle.id));

  // Update Prometheus state
  await db
    .update(prometheusState)
    .set({
      status: "active",
      lastConsolidationAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));

  const totalTime = Date.now() - startTime;

  // Record learning event
  await recordLearningEvent(prometheusId, {
    eventType: "knowledge_synthesis",
    description: `Completed full consolidation cycle in ${totalTime}ms`,
    impact: 0.5,
    metadata: {
      cycleId: cycle.id,
      phases: results.map((r) => ({ phase: r.phase, errors: r.errors.length })),
      totalTime,
    },
  });

  return { cycleId: cycle.id, results, totalTime };
}

/**
 * Execute a single consolidation phase
 */
async function executeConsolidationPhase(
  prometheusId: number,
  phase: ConsolidationPhase
): Promise<ConsolidationResult> {
  switch (phase) {
    case "collection":
      return await runCollectionPhase(prometheusId);
    case "evaluation":
      return await runEvaluationPhase(prometheusId);
    case "integration":
      return await runIntegrationPhase(prometheusId);
    case "compression":
      return await runCompressionPhase(prometheusId);
    case "reorganization":
      return await runReorganizationPhase(prometheusId);
    case "pruning":
      return await runPruningPhase(prometheusId);
    default:
      throw new Error(`Unknown consolidation phase: ${phase}`);
  }
}

// ============================================================================
// PHASE 1: COLLECTION
// ============================================================================

/**
 * Collect and aggregate recent information
 */
async function runCollectionPhase(prometheusId: number): Promise<ConsolidationResult> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent working memories
  const recentMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      eq(prometheusMemory.memoryType, "working"),
      gte(prometheusMemory.createdAt, oneDayAgo)
    ),
  });

  // Get recent episodic memories
  const episodicMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      eq(prometheusMemory.memoryType, "episodic"),
      gte(prometheusMemory.createdAt, oneDayAgo)
    ),
  });

  // Mark them as ready for evaluation
  const allRecentIds = [...recentMemories, ...episodicMemories].map((m) => m.id);

  if (allRecentIds.length > 0) {
    await db
      .update(prometheusMemory)
      .set({
        metadata: sql`COALESCE(${prometheusMemory.metadata}, '{}'::jsonb) || '{"consolidationStatus": "collected"}'::jsonb`,
      })
      .where(inArray(prometheusMemory.id, allRecentIds));
  }

  return {
    phase: "collection",
    memoriesProcessed: allRecentIds.length,
    memoriesConsolidated: 0,
    memoriesPruned: 0,
    nodesCreated: 0,
    nodesUpdated: 0,
    edgesCreated: 0,
    errors: [],
  };
}

// ============================================================================
// PHASE 2: EVALUATION
// ============================================================================

/**
 * Evaluate importance of collected memories
 */
async function runEvaluationPhase(prometheusId: number): Promise<ConsolidationResult> {
  // Get collected memories
  const collectedMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.metadata}->>'consolidationStatus' = 'collected'`
    ),
  });

  let evaluated = 0;
  const importantIds: number[] = [];

  for (const memory of collectedMemories) {
    // Calculate importance score based on:
    // - Confidence level
    // - Access count
    // - Priority
    // - Source reliability

    let importanceScore = 0;

    // Confidence contributes 0-40 points
    importanceScore += (memory.confidence || 50) * 0.4;

    // Access count contributes 0-20 points (capped at 10 accesses)
    importanceScore += Math.min((memory.accessCount || 0) * 2, 20);

    // Priority contributes 0-30 points
    const priorityScores: Record<string, number> = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5,
      ephemeral: 0,
    };
    importanceScore += priorityScores[memory.priority || "medium"] || 10;

    // Tags for medical relevance
    const tags = memory.tags || [];
    if (tags.includes("hypothesis") || tags.includes("treatment")) {
      importanceScore += 10;
    }

    // Mark as important if score > 50
    const isImportant = importanceScore > 50;

    await db
      .update(prometheusMemory)
      .set({
        metadata: sql`COALESCE(${prometheusMemory.metadata}, '{}'::jsonb) || ${JSON.stringify({
          consolidationStatus: "evaluated",
          importanceScore,
          isImportant,
        })}::jsonb`,
      })
      .where(eq(prometheusMemory.id, memory.id));

    if (isImportant) {
      importantIds.push(memory.id);
    }

    evaluated++;
  }

  return {
    phase: "evaluation",
    memoriesProcessed: evaluated,
    memoriesConsolidated: importantIds.length,
    memoriesPruned: 0,
    nodesCreated: 0,
    nodesUpdated: 0,
    edgesCreated: 0,
    errors: [],
  };
}

// ============================================================================
// PHASE 3: INTEGRATION
// ============================================================================

/**
 * Integrate important memories with existing knowledge
 */
async function runIntegrationPhase(prometheusId: number): Promise<ConsolidationResult> {
  // Get important evaluated memories
  const importantMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`(${prometheusMemory.metadata}->>'consolidationStatus') = 'evaluated'`,
      sql`(${prometheusMemory.metadata}->>'isImportant')::boolean = true`
    ),
  });

  let nodesCreated = 0;
  let nodesUpdated = 0;
  let edgesCreated = 0;
  const errors: string[] = [];

  for (const memory of importantMemories) {
    try {
      // Check if similar node already exists
      const existingNodes = await db.query.prometheusKnowledgeNodes.findMany({
        where: and(
          eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
          sql`${prometheusKnowledgeNodes.label} ILIKE ${'%' + memory.content.substring(0, 50) + '%'}`
        ),
        limit: 5,
      });

      if (existingNodes.length > 0) {
        // Update existing node with new evidence
        const bestMatch = existingNodes[0];
        await db
          .update(prometheusKnowledgeNodes)
          .set({
            evidenceCount: sql`${prometheusKnowledgeNodes.evidenceCount} + 1`,
            confidence: sql`LEAST(100, ${prometheusKnowledgeNodes.confidence} + 3)`,
            sourceIds: sql`array_cat(${prometheusKnowledgeNodes.sourceIds}, ARRAY['memory:${memory.id}'])`,
            updatedAt: new Date(),
          })
          .where(eq(prometheusKnowledgeNodes.id, bestMatch.id));
        nodesUpdated++;

        // Create edge if memory links to other concepts
        const linkedMemoryIds = memory.linkedMemoryIds || [];
        for (const linkedId of linkedMemoryIds) {
          const linkedMemory = await db.query.prometheusMemory.findFirst({
            where: eq(prometheusMemory.id, linkedId),
          });
          if (linkedMemory) {
            // Find corresponding node
            const linkedNode = await db.query.prometheusKnowledgeNodes.findFirst({
              where: and(
                eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
                sql`${prometheusKnowledgeNodes.sourceIds} @> ARRAY['memory:${linkedId}']::text[]`
              ),
            });
            if (linkedNode && linkedNode.id !== bestMatch.id) {
              await createKnowledgeEdge(prometheusId, {
                sourceNodeId: bestMatch.id,
                targetNodeId: linkedNode.id,
                relationType: "correlates",
                strength: 0.5,
                confidence: Math.min(memory.confidence || 50, linkedMemory.confidence || 50),
                discoveredBy: "consolidation_integration",
              });
              edgesCreated++;
            }
          }
        }
      } else {
        // Create new node from memory
        const nodeType = determineNodeType(memory);
        await createKnowledgeNode(prometheusId, {
          nodeType,
          label: extractLabel(memory.content),
          labelKa: memory.contentKa ? extractLabel(memory.contentKa) : undefined,
          description: memory.content,
          descriptionKa: memory.contentKa,
          certaintyLevel: memory.certaintyLevel || "hypothesis",
          confidence: memory.confidence || 50,
          sourceIds: [`memory:${memory.id}`],
        });
        nodesCreated++;
      }

      // Mark memory as integrated
      await db
        .update(prometheusMemory)
        .set({
          metadata: sql`COALESCE(${prometheusMemory.metadata}, '{}'::jsonb) || '{"consolidationStatus": "integrated"}'::jsonb`,
        })
        .where(eq(prometheusMemory.id, memory.id));
    } catch (error) {
      errors.push(`Failed to integrate memory ${memory.id}: ${error}`);
    }
  }

  return {
    phase: "integration",
    memoriesProcessed: importantMemories.length,
    memoriesConsolidated: importantMemories.length,
    memoriesPruned: 0,
    nodesCreated,
    nodesUpdated,
    edgesCreated,
    errors,
  };
}

// ============================================================================
// PHASE 4: COMPRESSION
// ============================================================================

/**
 * Abstract details into higher-level principles
 */
async function runCompressionPhase(prometheusId: number): Promise<ConsolidationResult> {
  // Get all hypothesis and fact nodes with high confidence
  const confidentNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, 70),
      inArray(prometheusKnowledgeNodes.nodeType, ["hypothesis", "fact", "concept"])
    ),
    orderBy: [desc(prometheusKnowledgeNodes.confidence)],
    limit: 100,
  });

  // Group similar nodes
  const groups = groupSimilarNodes(confidentNodes);

  let nodesCreated = 0;
  const errors: string[] = [];

  for (const group of groups) {
    if (group.length >= 3) {
      // Synthesize a principle from the group
      try {
        const synthesis = synthesizePrinciple(group);

        // Create principle node
        await createKnowledgeNode(prometheusId, {
          nodeType: "principle",
          label: synthesis.principle,
          labelKa: synthesis.principleKa,
          description: `Synthesized from ${group.length} related concepts: ${group.map((n) => n.label).join(", ")}`,
          certaintyLevel: "knowledge",
          confidence: synthesis.confidence,
          sourceIds: group.map((n) => `node:${n.id}`),
          metadata: {
            synthesizedFrom: group.map((n) => n.id),
            synthesisType: "compression",
          },
        });

        nodesCreated++;

        // Create edges from principle to source nodes
        // Note: We'd need the new node's ID here - simplified for now
      } catch (error) {
        errors.push(`Failed to synthesize principle: ${error}`);
      }
    }
  }

  return {
    phase: "compression",
    memoriesProcessed: 0,
    memoriesConsolidated: 0,
    memoriesPruned: 0,
    nodesCreated,
    nodesUpdated: 0,
    edgesCreated: 0,
    errors,
  };
}

// ============================================================================
// PHASE 5: REORGANIZATION
// ============================================================================

/**
 * Optimize knowledge graph structure
 */
async function runReorganizationPhase(prometheusId: number): Promise<ConsolidationResult> {
  let nodesUpdated = 0;
  let edgesCreated = 0;
  const errors: string[] = [];

  // 1. Find isolated nodes (no edges) and try to connect them
  const allNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
  });

  const allEdges = await db.query.prometheusKnowledgeEdges.findMany({
    where: eq(prometheusKnowledgeEdges.prometheusId, prometheusId),
  });

  const connectedNodeIds = new Set([
    ...allEdges.map((e) => e.sourceNodeId),
    ...allEdges.map((e) => e.targetNodeId),
  ]);

  const isolatedNodes = allNodes.filter((n) => !connectedNodeIds.has(n.id));

  // Try to connect isolated nodes to similar nodes
  for (const isolated of isolatedNodes) {
    const similarNodes = allNodes.filter((n) => {
      if (n.id === isolated.id) return false;
      // Simple text similarity check
      const words1 = isolated.label.toLowerCase().split(/\s+/);
      const words2 = n.label.toLowerCase().split(/\s+/);
      const commonWords = words1.filter((w) => words2.includes(w));
      return commonWords.length >= 2;
    });

    if (similarNodes.length > 0) {
      const mostSimilar = similarNodes[0];
      try {
        await createKnowledgeEdge(prometheusId, {
          sourceNodeId: isolated.id,
          targetNodeId: mostSimilar.id,
          relationType: "similar_to",
          strength: 0.3,
          confidence: 40,
          discoveredBy: "consolidation_reorganization",
        });
        edgesCreated++;
      } catch (error) {
        errors.push(`Failed to connect isolated node ${isolated.id}: ${error}`);
      }
    }
  }

  // 2. Strengthen frequently validated edges
  const strongEdges = allEdges.filter((e) => (e.confidence || 0) >= 80);
  for (const edge of strongEdges) {
    await db
      .update(prometheusKnowledgeEdges)
      .set({
        strength: sql`LEAST(1, ${prometheusKnowledgeEdges.strength} + 0.05)`,
      })
      .where(eq(prometheusKnowledgeEdges.id, edge.id));
    nodesUpdated++;
  }

  // 3. Run error detection
  try {
    await runAutoCorrection(prometheusId);
  } catch (error) {
    errors.push(`Error detection failed: ${error}`);
  }

  return {
    phase: "reorganization",
    memoriesProcessed: 0,
    memoriesConsolidated: 0,
    memoriesPruned: 0,
    nodesCreated: 0,
    nodesUpdated,
    edgesCreated,
    errors,
  };
}

// ============================================================================
// PHASE 6: PRUNING
// ============================================================================

/**
 * Remove outdated and low-quality information
 */
async function runPruningPhase(prometheusId: number): Promise<ConsolidationResult> {
  let memoriesPruned = 0;
  let nodesPruned = 0;
  const errors: string[] = [];

  // 1. Prune ephemeral memories older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const ephemeralToDelete = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      eq(prometheusMemory.priority, "ephemeral"),
      lte(prometheusMemory.createdAt, sevenDaysAgo)
    ),
  });

  if (ephemeralToDelete.length > 0) {
    await db
      .delete(prometheusMemory)
      .where(inArray(prometheusMemory.id, ephemeralToDelete.map((m) => m.id)));
    memoriesPruned += ephemeralToDelete.length;
  }

  // 2. Prune expired memories
  const expiredMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      lte(prometheusMemory.expiresAt, new Date())
    ),
  });

  if (expiredMemories.length > 0) {
    await db
      .delete(prometheusMemory)
      .where(inArray(prometheusMemory.id, expiredMemories.map((m) => m.id)));
    memoriesPruned += expiredMemories.length;
  }

  // 3. Downgrade very low confidence nodes
  const veryLowConfidenceNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      lte(prometheusKnowledgeNodes.confidence, 20)
    ),
  });

  for (const node of veryLowConfidenceNodes) {
    // If contradicted more than validated, mark for removal
    if ((node.contradictionCount || 0) > (node.validationCount || 0)) {
      // Don't delete, just mark as refuted
      await db
        .update(prometheusKnowledgeNodes)
        .set({
          certaintyLevel: "unknown",
          metadata: sql`COALESCE(${prometheusKnowledgeNodes.metadata}, '{}'::jsonb) || '{"status": "refuted"}'::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(prometheusKnowledgeNodes.id, node.id));
      nodesPruned++;
    }
  }

  // 4. Clean up old working memories that weren't promoted
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldWorkingMemories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      eq(prometheusMemory.memoryType, "working"),
      lte(prometheusMemory.createdAt, thirtyDaysAgo),
      eq(prometheusMemory.accessCount, 0)
    ),
  });

  if (oldWorkingMemories.length > 0) {
    await db
      .delete(prometheusMemory)
      .where(inArray(prometheusMemory.id, oldWorkingMemories.map((m) => m.id)));
    memoriesPruned += oldWorkingMemories.length;
  }

  // Update Prometheus state with new counts
  const totalMemories = await db.query.prometheusMemory.findMany({
    where: eq(prometheusMemory.prometheusId, prometheusId),
  });

  const totalNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
  });

  await db
    .update(prometheusState)
    .set({
      totalMemoryItems: totalMemories.length,
      totalKnowledgeNodes: totalNodes.length,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));

  return {
    phase: "pruning",
    memoriesProcessed: 0,
    memoriesConsolidated: 0,
    memoriesPruned,
    nodesCreated: 0,
    nodesUpdated: nodesPruned,
    edgesCreated: 0,
    errors,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function determineNodeType(memory: PrometheusMemory): string {
  const tags = memory.tags || [];
  const content = memory.content.toLowerCase();

  if (tags.includes("hypothesis")) return "hypothesis";
  if (tags.includes("treatment")) return "treatment";
  if (tags.includes("mechanism")) return "mechanism";
  if (tags.includes("diagnosis")) return "diagnosis";
  if (tags.includes("research")) return "research";

  if (content.includes("therapy") || content.includes("treatment")) return "treatment";
  if (content.includes("mechanism") || content.includes("pathway")) return "mechanism";
  if (content.includes("hypothesis") || content.includes("theory")) return "hypothesis";
  if (content.includes("study") || content.includes("trial")) return "research";

  return "concept";
}

function extractLabel(content: string): string {
  // Extract first sentence or first 80 characters
  const firstSentence = content.split(/[.!?]/)[0];
  if (firstSentence.length <= 80) {
    return firstSentence.trim();
  }
  return content.substring(0, 80).trim() + "...";
}

function groupSimilarNodes(nodes: PrometheusKnowledgeNode[]): PrometheusKnowledgeNode[][] {
  const groups: PrometheusKnowledgeNode[][] = [];
  const used = new Set<number>();

  for (const node of nodes) {
    if (used.has(node.id)) continue;

    const group = [node];
    used.add(node.id);

    // Find similar nodes
    const nodeWords = new Set(node.label.toLowerCase().split(/\s+/));

    for (const other of nodes) {
      if (used.has(other.id)) continue;

      const otherWords = new Set(other.label.toLowerCase().split(/\s+/));
      const intersection = [...nodeWords].filter((w) => otherWords.has(w));

      // If more than 30% words in common, consider similar
      const similarity = intersection.length / Math.max(nodeWords.size, otherWords.size);
      if (similarity > 0.3) {
        group.push(other);
        used.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

function synthesizePrinciple(nodes: PrometheusKnowledgeNode[]): KnowledgeSynthesis {
  // Calculate average confidence
  const avgConfidence = Math.round(
    nodes.reduce((sum, n) => sum + (n.confidence || 50), 0) / nodes.length
  );

  // Extract common themes (simplified)
  const allLabels = nodes.map((n) => n.label).join(". ");

  // For now, just concatenate the key points
  const principle = `Based on ${nodes.length} related findings: ${allLabels.substring(0, 200)}...`;

  return {
    principle,
    confidence: avgConfidence,
    supportingMemoryIds: [],
    supportingNodeIds: nodes.map((n) => n.id),
  };
}

// ============================================================================
// META-LEARNING
// ============================================================================

/**
 * Analyze learning patterns and improve strategies
 */
export async function runMetaLearning(prometheusId: number): Promise<{
  patternsFound: string[];
  suggestedImprovements: string[];
}> {
  const patternsFound: string[] = [];
  const suggestedImprovements: string[] = [];

  // Analyze recent learning events
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEvents = await db.query.prometheusLearningEvents.findMany({
    where: and(
      eq(prometheusLearningEvents.prometheusId, prometheusId),
      gte(prometheusLearningEvents.createdAt, thirtyDaysAgo)
    ),
    orderBy: [desc(prometheusLearningEvents.createdAt)],
  });

  // Count event types
  const eventTypeCounts: Record<string, number> = {};
  for (const event of recentEvents) {
    eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
  }

  // Analyze patterns
  const failures = eventTypeCounts["prediction_failure"] || 0;
  const successes = eventTypeCounts["prediction_success"] || 0;

  if (failures > successes && failures > 5) {
    patternsFound.push(`High prediction failure rate: ${failures} failures vs ${successes} successes`);
    suggestedImprovements.push("Increase evidence threshold before making predictions");
    suggestedImprovements.push("Focus on strengthening knowledge nodes before prediction attempts");
  }

  // Check error patterns
  const recentErrors = await db.query.prometheusErrors.findMany({
    where: and(
      eq(prometheusErrors.prometheusId, prometheusId),
      gte(prometheusErrors.createdAt, thirtyDaysAgo)
    ),
  });

  const errorTypeCounts: Record<string, number> = {};
  for (const error of recentErrors) {
    errorTypeCounts[error.errorType] = (errorTypeCounts[error.errorType] || 0) + 1;
  }

  if ((errorTypeCounts["temporal"] || 0) > 3) {
    patternsFound.push("Frequent temporal errors - outdated information being used");
    suggestedImprovements.push("Increase validation frequency for time-sensitive knowledge");
  }

  if ((errorTypeCounts["confidence"] || 0) > 3) {
    patternsFound.push("Confidence calibration issues");
    suggestedImprovements.push("Recalibrate confidence scoring based on validation results");
  }

  // Record meta-learning event
  await recordLearningEvent(prometheusId, {
    eventType: "pattern_recognition",
    description: `Meta-learning analysis: Found ${patternsFound.length} patterns`,
    impact: 0.2,
    metadata: {
      patternsFound,
      suggestedImprovements,
      eventTypeCounts,
      errorTypeCounts,
    },
  });

  return { patternsFound, suggestedImprovements };
}

/**
 * Update average confidence metric
 */
export async function updateAverageConfidence(prometheusId: number): Promise<void> {
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
  });

  if (nodes.length === 0) return;

  const avgConfidence = Math.round(
    nodes.reduce((sum, n) => sum + (n.confidence || 50), 0) / nodes.length
  );

  await db
    .update(prometheusState)
    .set({
      avgConfidence,
      updatedAt: new Date(),
    })
    .where(eq(prometheusState.id, prometheusId));
}
