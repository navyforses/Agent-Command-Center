/**
 * PROMETHEUS-MIND: Pinecone Vector Database Integration
 * =====================================================
 * Scalable vector storage for semantic search at scale
 *
 * Dr. Elena Volkov-Petrov (Chief Memory Systems Architect):
 * "მილიონობით მეხსიერება ერთ სივრცეში - აი სადაც იწყება რეალური ინტელექტი."
 * "Millions of memories in one space - that's where real intelligence begins."
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { generateEmbedding, generateEmbeddingsBatch } from "./vectorEmbeddings";
import { db } from "../../db";
import {
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusState
} from "../../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

// ============================================================================
// PINECONE CONFIGURATION
// ============================================================================

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "prometheus-mind";
const PINECONE_NAMESPACE_PREFIX = "prometheus_";
const EMBEDDING_DIMENSION = 1536; // OpenAI text-embedding-3-small

let pineconeClient: Pinecone | null = null;
let pineconeIndex: ReturnType<Pinecone["index"]> | null = null;

/**
 * Initialize Pinecone client
 */
export async function initializePinecone(): Promise<boolean> {
  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    console.log("[PROMETHEUS] Pinecone API key not configured - using local embeddings only");
    return false;
  }

  try {
    pineconeClient = new Pinecone({ apiKey });
    pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);

    // Test connection
    const stats = await pineconeIndex.describeIndexStats();
    console.log("[PROMETHEUS] Pinecone connected:", {
      dimension: stats.dimension,
      totalVectors: stats.totalRecordCount
    });

    return true;
  } catch (error) {
    console.error("[PROMETHEUS] Failed to initialize Pinecone:", error);
    pineconeClient = null;
    pineconeIndex = null;
    return false;
  }
}

/**
 * Check if Pinecone is available
 */
export function isPineconeAvailable(): boolean {
  return pineconeIndex !== null;
}

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    prometheusId: number;
    type: "memory" | "knowledge_node";
    sourceId: number;
    content: string;
    certaintyLevel: string;
    confidence: number;
    tags?: string[];
    createdAt: string;
  };
}

/**
 * Get namespace for a Prometheus instance
 */
function getNamespace(prometheusId: number): string {
  return `${PINECONE_NAMESPACE_PREFIX}${prometheusId}`;
}

/**
 * Upsert vectors to Pinecone
 */
export async function upsertVectors(
  prometheusId: number,
  vectors: VectorRecord[]
): Promise<number> {
  if (!pineconeIndex) {
    console.log("[PROMETHEUS] Pinecone not available, skipping upsert");
    return 0;
  }

  try {
    const namespace = pineconeIndex.namespace(getNamespace(prometheusId));

    // Upsert in batches of 100
    const batchSize = 100;
    let upsertedCount = 0;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await namespace.upsert(batch);
      upsertedCount += batch.length;
    }

    console.log(`[PROMETHEUS] Upserted ${upsertedCount} vectors to Pinecone`);
    return upsertedCount;
  } catch (error) {
    console.error("[PROMETHEUS] Failed to upsert vectors:", error);
    throw error;
  }
}

/**
 * Query similar vectors from Pinecone
 */
export async function querySimilarVectors(
  prometheusId: number,
  queryVector: number[],
  options: {
    topK?: number;
    filter?: Record<string, any>;
    includeMetadata?: boolean;
  } = {}
): Promise<Array<{
  id: string;
  score: number;
  metadata?: VectorRecord["metadata"];
}>> {
  if (!pineconeIndex) {
    console.log("[PROMETHEUS] Pinecone not available, using local search");
    return [];
  }

  const { topK = 10, filter, includeMetadata = true } = options;

  try {
    const namespace = pineconeIndex.namespace(getNamespace(prometheusId));

    const results = await namespace.query({
      vector: queryVector,
      topK,
      filter,
      includeMetadata
    });

    return (results.matches || []).map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as VectorRecord["metadata"] | undefined
    }));
  } catch (error) {
    console.error("[PROMETHEUS] Failed to query vectors:", error);
    return [];
  }
}

/**
 * Delete vectors from Pinecone
 */
export async function deleteVectors(
  prometheusId: number,
  ids: string[]
): Promise<void> {
  if (!pineconeIndex) return;

  try {
    const namespace = pineconeIndex.namespace(getNamespace(prometheusId));
    await namespace.deleteMany(ids);
    console.log(`[PROMETHEUS] Deleted ${ids.length} vectors from Pinecone`);
  } catch (error) {
    console.error("[PROMETHEUS] Failed to delete vectors:", error);
  }
}

/**
 * Delete all vectors for a Prometheus instance
 */
export async function deleteNamespace(prometheusId: number): Promise<void> {
  if (!pineconeIndex) return;

  try {
    const namespace = pineconeIndex.namespace(getNamespace(prometheusId));
    await namespace.deleteAll();
    console.log(`[PROMETHEUS] Deleted namespace for instance ${prometheusId}`);
  } catch (error) {
    console.error("[PROMETHEUS] Failed to delete namespace:", error);
  }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync all memories to Pinecone
 */
export async function syncMemoriesToPinecone(
  prometheusId: number
): Promise<{ synced: number; errors: number }> {
  if (!pineconeIndex) {
    return { synced: 0, errors: 0 };
  }

  const memories = await db.query.prometheusMemory.findMany({
    where: eq(prometheusMemory.prometheusId, prometheusId)
  });

  const vectors: VectorRecord[] = [];
  let errors = 0;

  for (const memory of memories) {
    try {
      let embedding = memory.embedding as number[] | null;

      // Generate embedding if not exists
      if (!embedding) {
        embedding = await generateEmbedding(memory.content);

        // Update in database
        await db.update(prometheusMemory)
          .set({ embedding: embedding, updatedAt: new Date() })
          .where(eq(prometheusMemory.id, memory.id));
      }

      vectors.push({
        id: `memory_${memory.id}`,
        values: embedding,
        metadata: {
          prometheusId: memory.prometheusId ?? 0,
          type: "memory",
          sourceId: memory.id,
          content: memory.content.slice(0, 1000), // Limit metadata size
          certaintyLevel: memory.certaintyLevel ?? 'hypothesis',
          confidence: memory.confidence ?? 50,
          tags: memory.tags as string[] || [],
          createdAt: (memory.createdAt ?? new Date()).toISOString()
        }
      });
    } catch (error) {
      console.error(`[PROMETHEUS] Failed to process memory ${memory.id}:`, error);
      errors++;
    }
  }

  const synced = await upsertVectors(prometheusId, vectors);

  return { synced, errors };
}

/**
 * Sync all knowledge nodes to Pinecone
 */
export async function syncKnowledgeNodesToPinecone(
  prometheusId: number
): Promise<{ synced: number; errors: number }> {
  if (!pineconeIndex) {
    return { synced: 0, errors: 0 };
  }

  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId)
  });

  const vectors: VectorRecord[] = [];
  let errors = 0;

  for (const node of nodes) {
    try {
      let embedding = node.embedding as number[] | null;

      // Generate embedding if not exists
      if (!embedding) {
        const text = `${node.label}. ${node.description || ""}`;
        embedding = await generateEmbedding(text);

        // Update in database
        await db.update(prometheusKnowledgeNodes)
          .set({ embedding, updatedAt: new Date() })
          .where(eq(prometheusKnowledgeNodes.id, node.id));
      }

      vectors.push({
        id: `node_${node.id}`,
        values: embedding,
        metadata: {
          prometheusId: node.prometheusId ?? 0,
          type: "knowledge_node",
          sourceId: node.id,
          content: `${node.label}: ${node.description || ""}`.slice(0, 1000),
          certaintyLevel: node.certaintyLevel ?? 'hypothesis',
          confidence: node.confidence ?? 50,
          tags: [node.nodeType],
          createdAt: (node.createdAt ?? new Date()).toISOString()
        }
      });
    } catch (error) {
      console.error(`[PROMETHEUS] Failed to process node ${node.id}:`, error);
      errors++;
    }
  }

  const synced = await upsertVectors(prometheusId, vectors);

  return { synced, errors };
}

/**
 * Full sync to Pinecone
 */
export async function fullSyncToPinecone(
  prometheusId: number
): Promise<{
  memories: { synced: number; errors: number };
  nodes: { synced: number; errors: number };
}> {
  console.log(`[PROMETHEUS] Starting full Pinecone sync for instance ${prometheusId}`);

  const memories = await syncMemoriesToPinecone(prometheusId);
  const nodes = await syncKnowledgeNodesToPinecone(prometheusId);

  console.log(`[PROMETHEUS] Pinecone sync complete:`, { memories, nodes });

  return { memories, nodes };
}

// ============================================================================
// HYBRID SEARCH (Local + Pinecone)
// ============================================================================

export interface HybridSearchResult {
  id: number;
  type: "memory" | "knowledge_node";
  content: string;
  score: number;
  source: "pinecone" | "local";
  certaintyLevel: string;
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Hybrid search - uses Pinecone if available, falls back to local
 */
export async function hybridSemanticSearch(
  prometheusId: number,
  query: string,
  options: {
    topK?: number;
    searchMemories?: boolean;
    searchNodes?: boolean;
    minScore?: number;
  } = {}
): Promise<HybridSearchResult[]> {
  const {
    topK = 10,
    searchMemories = true,
    searchNodes = true,
    minScore = 0.7
  } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Try Pinecone first
  if (isPineconeAvailable()) {
    const typeFilter = [];
    if (searchMemories) typeFilter.push("memory");
    if (searchNodes) typeFilter.push("knowledge_node");

    const results = await querySimilarVectors(prometheusId, queryEmbedding, {
      topK,
      filter: { type: { $in: typeFilter } }
    });

    return results
      .filter(r => r.score >= minScore)
      .map(r => ({
        id: r.metadata?.sourceId || 0,
        type: r.metadata?.type || "memory",
        content: r.metadata?.content || "",
        score: r.score,
        source: "pinecone" as const,
        certaintyLevel: r.metadata?.certaintyLevel || "unknown",
        confidence: r.metadata?.confidence || 0,
        metadata: r.metadata
      }));
  }

  // Fallback to local search
  const { semanticSearch } = await import("./vectorEmbeddings");
  const localResults = await semanticSearch(prometheusId, query, {
    searchMemories,
    searchKnowledge: searchNodes,
    limit: topK,
    threshold: minScore
  });

  return localResults.map(r => ({
    id: r.id,
    type: r.type === "memory" ? "memory" : "knowledge_node",
    content: r.content,
    score: r.similarity,
    source: "local" as const,
    certaintyLevel: r.certaintyLevel,
    confidence: r.confidence,
    metadata: r.metadata
  }));
}

// ============================================================================
// PINECONE STATS
// ============================================================================

export interface PineconeStats {
  available: boolean;
  indexName: string;
  dimension: number;
  totalVectors: number;
  namespaceStats: Record<string, number>;
}

/**
 * Get Pinecone index statistics
 */
export async function getPineconeStats(): Promise<PineconeStats> {
  if (!pineconeIndex) {
    return {
      available: false,
      indexName: PINECONE_INDEX_NAME,
      dimension: EMBEDDING_DIMENSION,
      totalVectors: 0,
      namespaceStats: {}
    };
  }

  try {
    const stats = await pineconeIndex.describeIndexStats();

    const namespaceStats: Record<string, number> = {};
    if (stats.namespaces) {
      for (const [ns, nsStats] of Object.entries(stats.namespaces)) {
        namespaceStats[ns] = nsStats.recordCount || 0;
      }
    }

    return {
      available: true,
      indexName: PINECONE_INDEX_NAME,
      dimension: stats.dimension || EMBEDDING_DIMENSION,
      totalVectors: stats.totalRecordCount || 0,
      namespaceStats
    };
  } catch (error) {
    console.error("[PROMETHEUS] Failed to get Pinecone stats:", error);
    return {
      available: false,
      indexName: PINECONE_INDEX_NAME,
      dimension: EMBEDDING_DIMENSION,
      totalVectors: 0,
      namespaceStats: {}
    };
  }
}
