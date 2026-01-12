/**
 * PROMETHEUS-MIND Phase 2: Vector Embeddings System
 * =================================================
 * Semantic search and similarity detection using vector embeddings
 *
 * Dr. Aria Zhang-Nakamura (Chief Cognitive Architect):
 * "სიტყვები მხოლოდ ზედაპირია. ჭეშმარიტი გაგება მნიშვნელობის სივრცეში ცხოვრობს."
 * "Words are only the surface. True understanding lives in meaning space."
 */

import OpenAI from "openai";
import { db } from "../../db";
import {
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusState
} from "../../../shared/schema";
import { eq, sql, and, desc, isNotNull } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Constants
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const SIMILARITY_THRESHOLD = 0.75;
const MAX_SIMILAR_RESULTS = 10;

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Limit input length
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("[PROMETHEUS] Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const truncatedTexts = texts.map(t => t.slice(0, 8000));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
    });

    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error("[PROMETHEUS] Error generating batch embeddings:", error);
    throw error;
  }
}

// ============================================================================
// COSINE SIMILARITY
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find top-k most similar vectors
 */
export function findTopKSimilar(
  queryVector: number[],
  candidates: Array<{ id: number; embedding: number[] }>,
  k: number = MAX_SIMILAR_RESULTS,
  threshold: number = SIMILARITY_THRESHOLD
): Array<{ id: number; similarity: number }> {
  const similarities = candidates
    .map(candidate => ({
      id: candidate.id,
      similarity: cosineSimilarity(queryVector, candidate.embedding)
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return similarities;
}

// ============================================================================
// MEMORY EMBEDDING OPERATIONS
// ============================================================================

/**
 * Update embedding for a memory item
 */
export async function updateMemoryEmbedding(memoryId: number): Promise<void> {
  const memory = await db.query.prometheusMemory.findFirst({
    where: eq(prometheusMemory.id, memoryId)
  });

  if (!memory) {
    throw new Error(`Memory ${memoryId} not found`);
  }

  const embedding = await generateEmbedding(memory.content);

  await db.update(prometheusMemory)
    .set({
      embedding: embedding,
      updatedAt: new Date()
    })
    .where(eq(prometheusMemory.id, memoryId));

  console.log(`[PROMETHEUS] Updated embedding for memory ${memoryId}`);
}

/**
 * Batch update embeddings for memories without embeddings
 */
export async function updateMissingMemoryEmbeddings(
  prometheusId: number,
  batchSize: number = 50
): Promise<number> {
  const memoriesWithoutEmbeddings = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      sql`${prometheusMemory.embedding} IS NULL`
    ),
    limit: batchSize
  });

  if (memoriesWithoutEmbeddings.length === 0) {
    return 0;
  }

  const contents = memoriesWithoutEmbeddings.map(m => m.content);
  const embeddings = await generateEmbeddingsBatch(contents);

  for (let i = 0; i < memoriesWithoutEmbeddings.length; i++) {
    await db.update(prometheusMemory)
      .set({
        embedding: embeddings[i],
        updatedAt: new Date()
      })
      .where(eq(prometheusMemory.id, memoriesWithoutEmbeddings[i].id));
  }

  console.log(`[PROMETHEUS] Updated ${memoriesWithoutEmbeddings.length} memory embeddings`);
  return memoriesWithoutEmbeddings.length;
}

/**
 * Find semantically similar memories
 */
export async function findSimilarMemories(
  prometheusId: number,
  query: string,
  limit: number = MAX_SIMILAR_RESULTS,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<Array<{
  memory: typeof prometheusMemory.$inferSelect;
  similarity: number;
}>> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Get all memories with embeddings
  const memories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      isNotNull(prometheusMemory.embedding)
    )
  });

  // Calculate similarities
  const results = memories
    .map(memory => ({
      memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding as number[])
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

// ============================================================================
// KNOWLEDGE NODE EMBEDDING OPERATIONS
// ============================================================================

/**
 * Update embedding for a knowledge node
 */
export async function updateKnowledgeNodeEmbedding(nodeId: number): Promise<void> {
  const node = await db.query.prometheusKnowledgeNodes.findFirst({
    where: eq(prometheusKnowledgeNodes.id, nodeId)
  });

  if (!node) {
    throw new Error(`Knowledge node ${nodeId} not found`);
  }

  // Combine label and description for richer embedding
  const textContent = `${node.label}. ${node.description || ""}`;
  const embedding = await generateEmbedding(textContent);

  await db.update(prometheusKnowledgeNodes)
    .set({
      embedding,
      updatedAt: new Date()
    })
    .where(eq(prometheusKnowledgeNodes.id, nodeId));

  console.log(`[PROMETHEUS] Updated embedding for knowledge node ${nodeId}`);
}

/**
 * Batch update embeddings for knowledge nodes without embeddings
 */
export async function updateMissingKnowledgeNodeEmbeddings(
  prometheusId: number,
  batchSize: number = 50
): Promise<number> {
  const nodesWithoutEmbeddings = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      sql`${prometheusKnowledgeNodes.embedding} IS NULL`
    ),
    limit: batchSize
  });

  if (nodesWithoutEmbeddings.length === 0) {
    return 0;
  }

  const contents = nodesWithoutEmbeddings.map(n =>
    `${n.label}. ${n.description || ""}`
  );
  const embeddings = await generateEmbeddingsBatch(contents);

  for (let i = 0; i < nodesWithoutEmbeddings.length; i++) {
    await db.update(prometheusKnowledgeNodes)
      .set({
        embedding: embeddings[i],
        updatedAt: new Date()
      })
      .where(eq(prometheusKnowledgeNodes.id, nodesWithoutEmbeddings[i].id));
  }

  console.log(`[PROMETHEUS] Updated ${nodesWithoutEmbeddings.length} knowledge node embeddings`);
  return nodesWithoutEmbeddings.length;
}

/**
 * Find semantically similar knowledge nodes
 */
export async function findSimilarKnowledgeNodes(
  prometheusId: number,
  query: string,
  limit: number = MAX_SIMILAR_RESULTS,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<Array<{
  node: typeof prometheusKnowledgeNodes.$inferSelect;
  similarity: number;
}>> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Get all nodes with embeddings
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      isNotNull(prometheusKnowledgeNodes.embedding)
    )
  });

  // Calculate similarities
  const results = nodes
    .map(node => ({
      node,
      similarity: cosineSimilarity(queryEmbedding, node.embedding as number[])
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

export interface SemanticSearchResult {
  type: "memory" | "knowledge_node";
  id: number;
  content: string;
  similarity: number;
  certaintyLevel: string;
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Unified semantic search across memories and knowledge nodes
 */
export async function semanticSearch(
  prometheusId: number,
  query: string,
  options: {
    searchMemories?: boolean;
    searchKnowledge?: boolean;
    limit?: number;
    threshold?: number;
    memoryTypes?: string[];
    nodeTypes?: string[];
  } = {}
): Promise<SemanticSearchResult[]> {
  const {
    searchMemories = true,
    searchKnowledge = true,
    limit = MAX_SIMILAR_RESULTS,
    threshold = SIMILARITY_THRESHOLD,
    memoryTypes,
    nodeTypes
  } = options;

  const results: SemanticSearchResult[] = [];

  // Search memories
  if (searchMemories) {
    const similarMemories = await findSimilarMemories(
      prometheusId,
      query,
      limit,
      threshold
    );

    for (const { memory, similarity } of similarMemories) {
      if (!memoryTypes || memoryTypes.includes(memory.memoryType)) {
        results.push({
          type: "memory",
          id: memory.id,
          content: memory.content,
          similarity,
          certaintyLevel: memory.certaintyLevel,
          confidence: memory.confidence,
          metadata: memory.metadata as Record<string, any> || undefined
        });
      }
    }
  }

  // Search knowledge nodes
  if (searchKnowledge) {
    const similarNodes = await findSimilarKnowledgeNodes(
      prometheusId,
      query,
      limit,
      threshold
    );

    for (const { node, similarity } of similarNodes) {
      if (!nodeTypes || nodeTypes.includes(node.nodeType)) {
        results.push({
          type: "knowledge_node",
          id: node.id,
          content: `${node.label}: ${node.description || ""}`,
          similarity,
          certaintyLevel: node.certaintyLevel,
          confidence: node.confidence,
          metadata: node.metadata as Record<string, any> || undefined
        });
      }
    }
  }

  // Sort by similarity and limit
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// ============================================================================
// CONCEPT CLUSTERING
// ============================================================================

/**
 * Find related concepts by clustering similar embeddings
 */
export async function findRelatedConcepts(
  prometheusId: number,
  seedConcept: string,
  depth: number = 2,
  maxPerLevel: number = 5
): Promise<{
  concept: string;
  level: number;
  similarity: number;
  nodeId?: number;
}[]> {
  const results: {
    concept: string;
    level: number;
    similarity: number;
    nodeId?: number;
  }[] = [];

  const visited = new Set<number>();
  let currentLevel = [{ query: seedConcept, level: 0 }];

  while (currentLevel.length > 0 && results.length < maxPerLevel * depth) {
    const nextLevel: typeof currentLevel = [];

    for (const { query, level } of currentLevel) {
      if (level >= depth) continue;

      const similar = await findSimilarKnowledgeNodes(
        prometheusId,
        query,
        maxPerLevel,
        0.6 // Lower threshold for exploration
      );

      for (const { node, similarity } of similar) {
        if (!visited.has(node.id)) {
          visited.add(node.id);
          results.push({
            concept: node.label,
            level: level + 1,
            similarity,
            nodeId: node.id
          });

          // Add to next level for deeper exploration
          nextLevel.push({
            query: node.label,
            level: level + 1
          });
        }
      }
    }

    currentLevel = nextLevel;
  }

  return results;
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Find potential duplicate or near-duplicate entries
 */
export async function findPotentialDuplicates(
  prometheusId: number,
  similarityThreshold: number = 0.95
): Promise<Array<{
  item1: { type: string; id: number; content: string };
  item2: { type: string; id: number; content: string };
  similarity: number;
}>> {
  const duplicates: Array<{
    item1: { type: string; id: number; content: string };
    item2: { type: string; id: number; content: string };
    similarity: number;
  }> = [];

  // Get all memories with embeddings
  const memories = await db.query.prometheusMemory.findMany({
    where: and(
      eq(prometheusMemory.prometheusId, prometheusId),
      isNotNull(prometheusMemory.embedding)
    )
  });

  // Compare each pair
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const similarity = cosineSimilarity(
        memories[i].embedding as number[],
        memories[j].embedding as number[]
      );

      if (similarity >= similarityThreshold) {
        duplicates.push({
          item1: {
            type: "memory",
            id: memories[i].id,
            content: memories[i].content.slice(0, 200)
          },
          item2: {
            type: "memory",
            id: memories[j].id,
            content: memories[j].content.slice(0, 200)
          },
          similarity
        });
      }
    }
  }

  return duplicates;
}

// ============================================================================
// EMBEDDING MAINTENANCE
// ============================================================================

/**
 * Run full embedding maintenance for a Prometheus instance
 */
export async function runEmbeddingMaintenance(
  prometheusId: number
): Promise<{
  memoriesUpdated: number;
  nodesUpdated: number;
  duplicatesFound: number;
}> {
  console.log(`[PROMETHEUS] Starting embedding maintenance for instance ${prometheusId}`);

  // Update missing embeddings
  const memoriesUpdated = await updateMissingMemoryEmbeddings(prometheusId);
  const nodesUpdated = await updateMissingKnowledgeNodeEmbeddings(prometheusId);

  // Find duplicates
  const duplicates = await findPotentialDuplicates(prometheusId);

  // Update Prometheus state
  await db.update(prometheusState)
    .set({ updatedAt: new Date() })
    .where(eq(prometheusState.id, prometheusId));

  console.log(`[PROMETHEUS] Embedding maintenance complete:`, {
    memoriesUpdated,
    nodesUpdated,
    duplicatesFound: duplicates.length
  });

  return {
    memoriesUpdated,
    nodesUpdated,
    duplicatesFound: duplicates.length
  };
}
