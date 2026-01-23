/**
 * Server Configuration
 * ====================
 * Centralized configuration for server settings
 * Values can be overridden via environment variables
 */

// ============================================================================
// File Upload Configuration
// ============================================================================

/**
 * Maximum file size for document uploads (bytes)
 * Default: 15MB
 */
export const MAX_DOCUMENT_SIZE = parseInt(
  process.env.MAX_DOCUMENT_SIZE || String(15 * 1024 * 1024),
  10
);

/**
 * Maximum file size for profile images (bytes)
 * Default: 10MB
 */
export const MAX_IMAGE_SIZE = parseInt(
  process.env.MAX_IMAGE_SIZE || String(10 * 1024 * 1024),
  10
);

/**
 * Maximum file size for diagnosis files (bytes)
 * Default: 10MB
 */
export const MAX_DIAGNOSIS_SIZE = parseInt(
  process.env.MAX_DIAGNOSIS_SIZE || String(10 * 1024 * 1024),
  10
);

/**
 * Allowed MIME types for documents
 */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
];

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// ============================================================================
// Pagination Configuration
// ============================================================================

/**
 * Default page size for list endpoints
 */
export const DEFAULT_PAGE_SIZE = parseInt(
  process.env.DEFAULT_PAGE_SIZE || "20",
  10
);

/**
 * Maximum page size allowed
 */
export const MAX_PAGE_SIZE = parseInt(
  process.env.MAX_PAGE_SIZE || "100",
  10
);

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Rate limit window in milliseconds
 * Default: 15 minutes
 */
export const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000),
  10
);

/**
 * Maximum requests per window
 * Default: 100 requests
 */
export const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || "100",
  10
);

/**
 * AI API rate limit (requests per minute)
 */
export const AI_RATE_LIMIT = parseInt(
  process.env.AI_RATE_LIMIT || "10",
  10
);

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Search results cache TTL in milliseconds
 * Default: 5 minutes
 */
export const SEARCH_CACHE_TTL = parseInt(
  process.env.SEARCH_CACHE_TTL || String(5 * 60 * 1000),
  10
);

/**
 * Trial data cache TTL in milliseconds
 * Default: 1 hour
 */
export const TRIAL_CACHE_TTL = parseInt(
  process.env.TRIAL_CACHE_TTL || String(60 * 60 * 1000),
  10
);

// ============================================================================
// Background Job Configuration
// ============================================================================

/**
 * Clinical trials sync interval in milliseconds
 * Default: 6 hours
 */
export const TRIALS_SYNC_INTERVAL = parseInt(
  process.env.TRIALS_SYNC_INTERVAL || String(6 * 60 * 60 * 1000),
  10
);

/**
 * Evolution cycle tick interval in milliseconds
 * Default: 5 minutes
 */
export const EVOLUTION_TICK_INTERVAL = parseInt(
  process.env.EVOLUTION_TICK_INTERVAL || String(5 * 60 * 1000),
  10
);

// ============================================================================
// AI Configuration
// ============================================================================

/**
 * Maximum tokens for AI responses
 */
export const AI_MAX_TOKENS = parseInt(
  process.env.AI_MAX_TOKENS || "4096",
  10
);

/**
 * AI response timeout in milliseconds
 * Default: 60 seconds
 */
export const AI_TIMEOUT = parseInt(
  process.env.AI_TIMEOUT || String(60 * 1000),
  10
);

// ============================================================================
// Export all config as object for convenience
// ============================================================================

export const config = {
  // File uploads
  maxDocumentSize: MAX_DOCUMENT_SIZE,
  maxImageSize: MAX_IMAGE_SIZE,
  maxDiagnosisSize: MAX_DIAGNOSIS_SIZE,
  allowedDocumentTypes: ALLOWED_DOCUMENT_TYPES,
  allowedImageTypes: ALLOWED_IMAGE_TYPES,

  // Pagination
  defaultPageSize: DEFAULT_PAGE_SIZE,
  maxPageSize: MAX_PAGE_SIZE,

  // Rate limiting
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: RATE_LIMIT_MAX_REQUESTS,
  aiRateLimit: AI_RATE_LIMIT,

  // Cache
  searchCacheTtl: SEARCH_CACHE_TTL,
  trialCacheTtl: TRIAL_CACHE_TTL,

  // Background jobs
  trialsSyncInterval: TRIALS_SYNC_INTERVAL,
  evolutionTickInterval: EVOLUTION_TICK_INTERVAL,

  // AI
  aiMaxTokens: AI_MAX_TOKENS,
  aiTimeout: AI_TIMEOUT,
} as const;

export default config;
