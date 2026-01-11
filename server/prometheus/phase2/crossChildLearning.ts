/**
 * PROMETHEUS-MIND Phase 2: Cross-Child Anonymous Learning
 * =======================================================
 * Privacy-preserving knowledge transfer across patient cases
 *
 * Dr. Amara Osei (Chief Integration Architect):
 * "ერთი ბავშვის გამოცდილება შეიძლება გახდეს ათასობით სხვას იმედის წყარო."
 * "One child's experience can become a source of hope for thousands of others."
 *
 * PRIVACY PRINCIPLES:
 * 1. No personal identifiers ever leave a child's context
 * 2. Only anonymized patterns and insights are shared
 * 3. Statistical aggregation masks individual cases
 * 4. Opt-in/opt-out is always respected
 */

import { db } from "../../db";
import {
  prometheusState,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusKnowledgeEdges,
  prometheusLearningEvents,
  children
} from "../../../shared/schema";
import { eq, and, sql, desc, gte, ne, isNotNull } from "drizzle-orm";
import { generateEmbedding, cosineSimilarity } from "./vectorEmbeddings";

// ============================================================================
// ANONYMOUS PATTERN TYPES
// ============================================================================

export interface AnonymousPattern {
  patternId: string;
  patternType: "treatment_response" | "symptom_progression" | "therapy_outcome" | "research_insight";
  description: string;
  descriptionKa?: string;
  frequency: number; // How many cases show this pattern
  confidence: number;
  successRate?: number; // For treatment patterns
  avgImpact?: number;
  relevantDiagnoses: string[];
  timeframe?: string;
  embedding?: number[];
  metadata: {
    contributingCases: number; // Count only, no IDs
    firstObserved: Date;
    lastObserved: Date;
    validationCount: number;
  };
}

export interface CrossChildInsight {
  insightId: string;
  category: "treatment" | "therapy" | "symptom" | "prognosis" | "research";
  title: string;
  titleKa?: string;
  description: string;
  descriptionKa?: string;
  evidence: {
    patternCount: number;
    caseCount: number;
    avgConfidence: number;
  };
  applicability: {
    diagnoses: string[];
    ageRange?: { min: number; max: number };
    severityLevels?: string[];
  };
  recommendations: string[];
  createdAt: Date;
}

// ============================================================================
// PATTERN EXTRACTION (Privacy-Preserving)
// ============================================================================

/**
 * Extract anonymized patterns from a single Prometheus instance
 * This function ONLY extracts patterns, no personal data
 */
export async function extractAnonymousPatterns(
  prometheusId: number
): Promise<AnonymousPattern[]> {
  const patterns: AnonymousPattern[] = [];

  // Get knowledge nodes (concepts, not personal data)
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, 60) // Only high-confidence nodes
    )
  });

  // Get edges (relationships)
  const edges = await db.query.prometheusKnowledgeEdges.findMany({
    where: and(
      eq(prometheusKnowledgeEdges.prometheusId, prometheusId),
      gte(prometheusKnowledgeEdges.confidence, 60)
    )
  });

  // Extract treatment response patterns
  const treatmentNodes = nodes.filter(n =>
    n.nodeType === "treatment" || n.nodeType === "mechanism"
  );

  for (const treatment of treatmentNodes) {
    // Find what this treatment affects
    const relatedEdges = edges.filter(e =>
      e.sourceNodeId === treatment.id &&
      (e.relationType === "treats" || e.relationType === "modulates")
    );

    if (relatedEdges.length > 0) {
      patterns.push({
        patternId: `treatment_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        patternType: "treatment_response",
        description: `${treatment.label} shows effects on related conditions`,
        descriptionKa: treatment.labelKa ? `${treatment.labelKa} გავლენას ახდენს დაკავშირებულ მდგომარეობებზე` : undefined,
        frequency: 1,
        confidence: treatment.confidence,
        successRate: treatment.confidence / 100,
        relevantDiagnoses: extractDiagnosesFromMetadata(treatment.metadata),
        metadata: {
          contributingCases: 1,
          firstObserved: treatment.createdAt,
          lastObserved: treatment.updatedAt,
          validationCount: treatment.validationCount || 0
        }
      });
    }
  }

  // Extract symptom progression patterns
  const symptomNodes = nodes.filter(n => n.nodeType === "symptom");
  const diagnosisNodes = nodes.filter(n => n.nodeType === "diagnosis");

  for (const symptom of symptomNodes) {
    const causedBy = edges.filter(e =>
      e.targetNodeId === symptom.id &&
      e.relationType === "causes"
    );

    if (causedBy.length > 0) {
      patterns.push({
        patternId: `symptom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        patternType: "symptom_progression",
        description: `Symptom pattern: ${symptom.label}`,
        frequency: 1,
        confidence: symptom.confidence,
        relevantDiagnoses: diagnosisNodes.map(d => d.label),
        metadata: {
          contributingCases: 1,
          firstObserved: symptom.createdAt,
          lastObserved: symptom.updatedAt,
          validationCount: symptom.validationCount || 0
        }
      });
    }
  }

  // Extract research insights
  const researchNodes = nodes.filter(n =>
    n.nodeType === "research" || n.nodeType === "hypothesis"
  );

  for (const research of researchNodes) {
    patterns.push({
      patternId: `research_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      patternType: "research_insight",
      description: research.label,
      descriptionKa: research.labelKa,
      frequency: 1,
      confidence: research.confidence,
      relevantDiagnoses: diagnosisNodes.map(d => d.label),
      embedding: research.embedding as number[] || undefined,
      metadata: {
        contributingCases: 1,
        firstObserved: research.createdAt,
        lastObserved: research.updatedAt,
        validationCount: research.validationCount || 0
      }
    });
  }

  return patterns;
}

/**
 * Helper to extract diagnoses from metadata without personal info
 */
function extractDiagnosesFromMetadata(metadata: any): string[] {
  if (!metadata) return [];

  // Only extract diagnosis codes/names, no personal data
  const diagnoses: string[] = [];

  if (metadata.diagnoses) {
    diagnoses.push(...metadata.diagnoses);
  }

  if (metadata.icdCodes) {
    diagnoses.push(...metadata.icdCodes);
  }

  // Standard HIE-related diagnoses
  if (metadata.hieGrade) {
    diagnoses.push(`HIE Grade ${metadata.hieGrade}`);
  }

  return [...new Set(diagnoses)]; // Remove duplicates
}

// ============================================================================
// PATTERN AGGREGATION (Multi-Case Analysis)
// ============================================================================

/**
 * Aggregate patterns across multiple Prometheus instances
 * Requires minimum case count for privacy
 */
export async function aggregateCrossChildPatterns(
  minCaseCount: number = 3 // Privacy threshold
): Promise<AnonymousPattern[]> {
  // Get all active Prometheus instances
  const instances = await db.query.prometheusState.findMany({
    where: eq(prometheusState.status, "active")
  });

  if (instances.length < minCaseCount) {
    console.log(`[PROMETHEUS] Not enough cases for aggregation (${instances.length}/${minCaseCount})`);
    return [];
  }

  // Collect patterns from all instances
  const allPatterns: AnonymousPattern[] = [];

  for (const instance of instances) {
    const patterns = await extractAnonymousPatterns(instance.id);
    allPatterns.push(...patterns);
  }

  // Group similar patterns
  const aggregatedPatterns = await aggregateSimilarPatterns(allPatterns, minCaseCount);

  return aggregatedPatterns;
}

/**
 * Group similar patterns using semantic similarity
 */
async function aggregateSimilarPatterns(
  patterns: AnonymousPattern[],
  minCaseCount: number
): Promise<AnonymousPattern[]> {
  if (patterns.length === 0) return [];

  const aggregated: Map<string, AnonymousPattern> = new Map();
  const processed = new Set<string>();

  for (const pattern of patterns) {
    if (processed.has(pattern.patternId)) continue;

    // Generate embedding if not present
    if (!pattern.embedding) {
      pattern.embedding = await generateEmbedding(pattern.description);
    }

    // Find similar patterns
    const similar = patterns.filter(p => {
      if (p.patternId === pattern.patternId || processed.has(p.patternId)) return false;
      if (p.patternType !== pattern.patternType) return false;

      // Use description similarity as fallback
      if (!p.embedding) return false;

      const similarity = cosineSimilarity(pattern.embedding!, p.embedding);
      return similarity >= 0.85; // High threshold for grouping
    });

    // Mark all as processed
    processed.add(pattern.patternId);
    similar.forEach(s => processed.add(s.patternId));

    // Aggregate if enough cases
    const totalCases = 1 + similar.length;

    if (totalCases >= minCaseCount) {
      const avgConfidence = (pattern.confidence + similar.reduce((sum, s) => sum + s.confidence, 0)) / totalCases;

      const aggregatedPattern: AnonymousPattern = {
        patternId: `agg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        patternType: pattern.patternType,
        description: pattern.description,
        descriptionKa: pattern.descriptionKa,
        frequency: totalCases,
        confidence: avgConfidence,
        successRate: pattern.successRate,
        relevantDiagnoses: [...new Set([
          ...pattern.relevantDiagnoses,
          ...similar.flatMap(s => s.relevantDiagnoses)
        ])],
        embedding: pattern.embedding,
        metadata: {
          contributingCases: totalCases,
          firstObserved: new Date(Math.min(
            pattern.metadata.firstObserved.getTime(),
            ...similar.map(s => s.metadata.firstObserved.getTime())
          )),
          lastObserved: new Date(Math.max(
            pattern.metadata.lastObserved.getTime(),
            ...similar.map(s => s.metadata.lastObserved.getTime())
          )),
          validationCount: pattern.metadata.validationCount +
            similar.reduce((sum, s) => sum + s.metadata.validationCount, 0)
        }
      };

      aggregated.set(aggregatedPattern.patternId, aggregatedPattern);
    }
  }

  return Array.from(aggregated.values());
}

// ============================================================================
// INSIGHT GENERATION
// ============================================================================

/**
 * Generate cross-child insights from aggregated patterns
 */
export async function generateCrossChildInsights(
  minPatternFrequency: number = 3
): Promise<CrossChildInsight[]> {
  const insights: CrossChildInsight[] = [];

  // Get aggregated patterns
  const patterns = await aggregateCrossChildPatterns(minPatternFrequency);

  // Group by type and generate insights
  const treatmentPatterns = patterns.filter(p => p.patternType === "treatment_response");
  const symptomPatterns = patterns.filter(p => p.patternType === "symptom_progression");
  const researchPatterns = patterns.filter(p => p.patternType === "research_insight");

  // Treatment insights
  for (const pattern of treatmentPatterns) {
    if (pattern.frequency >= minPatternFrequency) {
      insights.push({
        insightId: `insight_treatment_${Date.now()}`,
        category: "treatment",
        title: `Treatment Pattern: ${pattern.description.slice(0, 50)}`,
        titleKa: pattern.descriptionKa ? `მკურნალობის შაბლონი: ${pattern.descriptionKa.slice(0, 50)}` : undefined,
        description: pattern.description,
        descriptionKa: pattern.descriptionKa,
        evidence: {
          patternCount: 1,
          caseCount: pattern.frequency,
          avgConfidence: pattern.confidence
        },
        applicability: {
          diagnoses: pattern.relevantDiagnoses
        },
        recommendations: [
          `Observed in ${pattern.frequency} cases with ${pattern.confidence.toFixed(0)}% confidence`,
          pattern.successRate ? `Success rate: ${(pattern.successRate * 100).toFixed(0)}%` : ""
        ].filter(Boolean),
        createdAt: new Date()
      });
    }
  }

  // Research insights
  for (const pattern of researchPatterns) {
    if (pattern.frequency >= minPatternFrequency) {
      insights.push({
        insightId: `insight_research_${Date.now()}`,
        category: "research",
        title: `Research Finding: ${pattern.description.slice(0, 50)}`,
        titleKa: pattern.descriptionKa ? `კვლევის მიგნება: ${pattern.descriptionKa.slice(0, 50)}` : undefined,
        description: pattern.description,
        descriptionKa: pattern.descriptionKa,
        evidence: {
          patternCount: 1,
          caseCount: pattern.frequency,
          avgConfidence: pattern.confidence
        },
        applicability: {
          diagnoses: pattern.relevantDiagnoses
        },
        recommendations: [
          `Validated across ${pattern.frequency} independent cases`,
          `Confidence level: ${pattern.confidence.toFixed(0)}%`
        ],
        createdAt: new Date()
      });
    }
  }

  return insights;
}

// ============================================================================
// PATTERN MATCHING FOR INDIVIDUAL CASES
// ============================================================================

/**
 * Find relevant cross-child insights for a specific Prometheus instance
 */
export async function findRelevantInsightsForChild(
  prometheusId: number,
  limit: number = 10
): Promise<CrossChildInsight[]> {
  // Get child's diagnoses from their knowledge nodes
  const diagnosisNodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      eq(prometheusKnowledgeNodes.nodeType, "diagnosis")
    )
  });

  const childDiagnoses = diagnosisNodes.map(n => n.label.toLowerCase());

  // Get all cross-child insights
  const allInsights = await generateCrossChildInsights();

  // Filter and rank by relevance
  const relevantInsights = allInsights
    .map(insight => {
      // Calculate relevance score
      const diagnosisMatch = insight.applicability.diagnoses.filter(d =>
        childDiagnoses.some(cd => cd.includes(d.toLowerCase()) || d.toLowerCase().includes(cd))
      ).length;

      const relevanceScore = diagnosisMatch * 0.5 + (insight.evidence.avgConfidence / 100) * 0.5;

      return { insight, relevanceScore };
    })
    .filter(item => item.relevanceScore > 0.3)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
    .map(item => item.insight);

  return relevantInsights;
}

// ============================================================================
// KNOWLEDGE TRANSFER
// ============================================================================

/**
 * Apply relevant insights to a child's knowledge graph
 * Only adds insights that don't already exist
 */
export async function applyInsightsToChild(
  prometheusId: number,
  insights: CrossChildInsight[]
): Promise<{
  nodesCreated: number;
  edgesCreated: number;
  insightsApplied: number;
}> {
  let nodesCreated = 0;
  let edgesCreated = 0;
  let insightsApplied = 0;

  for (const insight of insights) {
    // Check if similar node already exists
    const existingNodes = await db.query.prometheusKnowledgeNodes.findMany({
      where: and(
        eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
        sql`LOWER(${prometheusKnowledgeNodes.label}) LIKE ${`%${insight.title.slice(0, 30).toLowerCase()}%`}`
      )
    });

    if (existingNodes.length > 0) {
      // Update confidence if existing
      await db.update(prometheusKnowledgeNodes)
        .set({
          confidence: sql`GREATEST(${prometheusKnowledgeNodes.confidence}, ${insight.evidence.avgConfidence})`,
          validationCount: sql`${prometheusKnowledgeNodes.validationCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(prometheusKnowledgeNodes.id, existingNodes[0].id));
    } else {
      // Create new node from insight
      const nodeType = insight.category === "treatment" ? "treatment" :
                       insight.category === "research" ? "research" : "concept";

      await db.insert(prometheusKnowledgeNodes).values({
        prometheusId,
        nodeType,
        label: insight.title,
        labelKa: insight.titleKa,
        description: insight.description,
        descriptionKa: insight.descriptionKa,
        certaintyLevel: insight.evidence.avgConfidence >= 80 ? "knowledge" :
                        insight.evidence.avgConfidence >= 60 ? "belief" : "hypothesis",
        confidence: insight.evidence.avgConfidence,
        evidenceCount: insight.evidence.patternCount,
        validationCount: insight.evidence.caseCount,
        metadata: {
          source: "cross_child_learning",
          originalInsightId: insight.insightId,
          diagnoses: insight.applicability.diagnoses
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      nodesCreated++;
    }

    insightsApplied++;
  }

  console.log(`[PROMETHEUS] Applied ${insightsApplied} cross-child insights:`, {
    nodesCreated,
    edgesCreated
  });

  return { nodesCreated, edgesCreated, insightsApplied };
}

// ============================================================================
// PRIVACY AUDIT
// ============================================================================

/**
 * Verify that no personal information is exposed in patterns/insights
 */
export function auditPatternPrivacy(pattern: AnonymousPattern): {
  isPrivate: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for potential PII in description
  const piiPatterns = [
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/, // Names
    /\b\d{2}[./]\d{2}[./]\d{4}\b/, // Dates
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN-like
    /\b[a-z]+@[a-z]+\.[a-z]+\b/i, // Email
    /\bchild\s*#?\s*\d+\b/i, // Child ID references
    /\bpatient\s*#?\s*\d+\b/i // Patient ID references
  ];

  for (const piiPattern of piiPatterns) {
    if (piiPattern.test(pattern.description)) {
      warnings.push(`Potential PII detected in description: ${piiPattern.toString()}`);
    }
  }

  // Ensure minimum aggregation
  if (pattern.metadata.contributingCases < 3) {
    warnings.push(`Pattern based on fewer than 3 cases (${pattern.metadata.contributingCases})`);
  }

  return {
    isPrivate: warnings.length === 0,
    warnings
  };
}

/**
 * Run full privacy audit on all patterns
 */
export async function runPrivacyAudit(): Promise<{
  totalPatterns: number;
  privatePatterns: number;
  warnings: Array<{ patternId: string; warnings: string[] }>;
}> {
  const patterns = await aggregateCrossChildPatterns(1); // Get all patterns for audit
  const warningsList: Array<{ patternId: string; warnings: string[] }> = [];
  let privateCount = 0;

  for (const pattern of patterns) {
    const audit = auditPatternPrivacy(pattern);
    if (audit.isPrivate) {
      privateCount++;
    } else {
      warningsList.push({
        patternId: pattern.patternId,
        warnings: audit.warnings
      });
    }
  }

  return {
    totalPatterns: patterns.length,
    privatePatterns: privateCount,
    warnings: warningsList
  };
}
