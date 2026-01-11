/**
 * PROMETHEUS Phase 3: Collaborative Knowledge
 *
 * This phase adds:
 * - Expert human-in-loop verification
 * - Community knowledge sharing
 * - Multi-language knowledge base
 * - Clinical integration APIs
 *
 * "ერთობა ძალაა - ცოდნა იზრდება თანამშრომლობით"
 * "Unity is strength - knowledge grows through collaboration"
 */

// Expert Verification System
export {
  // Expert Credentials
  registerExpert,
  verifyExpertCredentials,
  getExpertProfile,
  getExpertsBySpecialization,
  updateExpertTrustScore,
  // Review Management
  requestExpertReview,
  getPendingReviewsForExpert,
  submitExpertReview,
  applyExpertReview,
  // Analytics
  getReviewStatistics,
  flagForExpertReview,
  autoFlagForReview,
  // Types
  type ExpertProfile,
  type ExpertStats,
  type ReviewRequest,
  type ReviewQueueItem,
  type ReviewVerdict,
} from "./expertVerification";

// Community Knowledge Sharing
export {
  // Anonymization
  anonymizeText,
  // Knowledge Sharing
  shareKnowledge,
  searchSharedKnowledge,
  getKnowledgeByCategory,
  // Voting
  voteOnKnowledge,
  removeVote,
  // Contributions
  submitContribution,
  reviewContribution,
  getPendingContributions,
  // Publishing
  publishKnowledge,
  recordView,
  recordCitation,
  // Statistics
  getCommunityStats,
  // Types
  type SharedKnowledgeWithStats,
  type KnowledgeSearchParams,
  type AnonymizationResult,
  type KnowledgeContributionRequest,
} from "./communityKnowledge";

// Multi-language Knowledge Base
export {
  // Translation
  translateWithAI,
  createTranslation,
  getTranslation,
  getAllTranslations,
  verifyTranslation,
  // Batch Operations
  translatePrometheusContent,
  getMemoryWithTranslation,
  // Medical Dictionary
  findMedicalTerms,
  getMedicalTermTranslation,
  searchMedicalTerms,
  getMedicalTermsByCategory,
  // Statistics
  getTranslationStats,
  // Types
  type SupportedLanguage,
  type TranslationRequest,
  type TranslationResult,
  type MedicalTerm,
} from "./multiLanguage";

// Clinical Integration APIs
export {
  // Integration Management
  createIntegration,
  giveConsent,
  revokeConsent,
  updateConnectionStatus,
  getUserIntegrations,
  // Data Import
  triggerSync,
  importLabResults,
  importMedications,
  // History & Statistics
  getImportHistory,
  getImportStatistics,
  // FHIR Mapping
  mapFHIRObservationToLabResult,
  mapFHIRMedicationToRecord,
  // Types
  type IntegrationType,
  type ConnectionStatus,
  type SyncFrequency,
  type IntegrationConfig,
  type ClinicalDataRecord,
  type LabResult,
  type MedicationRecord,
  type ImagingResult,
  type ImportResult,
} from "./clinicalIntegration";
