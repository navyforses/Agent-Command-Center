/**
 * PROMETHEUS-MIND
 * ================
 * Living Cognitive Entity - A self-evolving AI research system
 *
 * "ცოდნის ცეცხლი რომელიც არასოდეს ჩაქრება"
 *
 * Created by the Council of Minds (2125):
 * - Dr. Aria Zhang-Nakamura (Chief Cognitive Architect)
 * - Prof. Solomon Okonkwo (Chief Knowledge Philosopher)
 * - Dr. Elena Volkov-Petrov (Chief Memory Systems Architect)
 * - Dr. Kenji Matsumoto (Chief Self-Evolution Engineer)
 * - Dr. Amara Osei (Chief Integration Architect)
 * - Dr. Yuki Tanaka-Chen (Chief Medical Domain Expert)
 *
 * Key Features:
 * - Multi-layer memory system (Working, Episodic, Semantic, Procedural, Meta)
 * - Knowledge graph with automatic relationship discovery
 * - Self-correcting error detection and resolution
 * - Consolidation cycles (Dream phases) for knowledge synthesis
 * - Meta-learning for continuous improvement
 * - Seamless integration with Evolution engine
 */

// ============================================================================
// CORE ORCHESTRATOR (Main Entry Point)
// ============================================================================

export {
  // Initialization
  ensurePrometheusForChild,
  getPrometheusStatus,

  // Evolution Integration Hooks
  onEvolutionCycleStart,
  onEvolutionPhaseComplete,
  onEvolutionDailyRunComplete,
  onEvolutionCycleComplete,

  // Query Interface
  queryPrometheus,
  getHighPriorityInsights,
  getKnowledgeGraph,

  // Scheduled Tasks
  runScheduledMaintenance,

  // Types
  type PrometheusStatus,
  type PrometheusInsight,
} from "./coreOrchestrator";

// ============================================================================
// MEMORY LAYER
// ============================================================================

export {
  // Initialization
  initializePrometheus,

  // Memory Operations
  storeMemory,
  storeEpisodicFromInsight,
  getMemoriesByType,
  getHighPriorityMemories,
  searchMemories,
  accessMemory,
  upgradeMemoryCertainty,

  // Knowledge Graph Operations
  createKnowledgeNode,
  createKnowledgeEdge,
  getKnowledgeNodes,
  getConnectedNodes,
  validateKnowledgeNode,

  // Learning Events
  recordLearningEvent,

  // Evolution Integration
  processEvolutionDailyRun,
  syncWithEvolutionHistory,

  // State Management
  getPrometheusState,
  updatePrometheusStatus,
  getPrometheusMetrics,

  // Types
  type MemoryType,
  type MemoryPriority,
  type CertaintyLevel,
  type MemorySearchResult,
  type KnowledgeGraphQuery,
} from "./memoryLayer";

// ============================================================================
// ERROR DETECTION
// ============================================================================

export {
  // Detection
  detectContradictions,
  detectTemporalErrors,
  detectConfidenceErrors,

  // Prediction Validation
  recordPrediction,
  validatePrediction,

  // Error Management
  recordError,
  getUnresolvedErrors,
  resolveError,

  // Verification
  verifyKnowledgeNode,

  // Auto-Correction
  runAutoCorrection,

  // Types
  type ErrorType,
  type ErrorSeverity,
  type VerificationMethod,
  type PredictionResult,
  type ContradictionDetection,
  type ErrorAnalysis,
} from "./errorDetection";

// ============================================================================
// SELF-EVOLUTION
// ============================================================================

export {
  // Consolidation Cycle
  startConsolidationCycle,
  runFullConsolidationCycle,

  // Meta-Learning
  runMetaLearning,
  updateAverageConfidence,

  // Types
  type ConsolidationPhase,
  type ConsolidationResult,
  type KnowledgeSynthesis,
} from "./selfEvolution";
