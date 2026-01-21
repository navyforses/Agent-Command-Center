/**
 * ClinicalTrials.gov API v2 Service Layer
 * ========================================
 * Documentation: https://clinicaltrials.gov/data-api/api
 *
 * Features:
 * - Rate limiting (10 requests/second)
 * - Retry logic with exponential backoff
 * - Response caching with TTL
 * - Background sync job for new trials
 * - Comprehensive error logging
 */

import fetch from "node-fetch";
import { db } from "../db";
import { clinicalTrials } from "@shared/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://clinicaltrials.gov/api/v2";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ClinicalTrialStudy {
  nctId: string;
  title: string;
  officialTitle?: string;
  status: string;
  phase?: string;
  studyType?: string;
  conditions: string[];
  interventions: string[];
  sponsor: string;
  collaborators: string[];
  locations: ClinicalTrialLocation[];
  eligibility: {
    criteria?: string;
    gender?: string;
    minAge?: string;
    maxAge?: string;
    healthyVolunteers?: boolean;
  };
  contacts: ClinicalTrialContact[];
  startDate?: string;
  completionDate?: string;
  enrollmentCount?: number;
  briefSummary?: string;
  detailedDescription?: string;
  lastUpdateDate?: string;
}

export interface ClinicalTrialLocation {
  facility?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: string;
  contacts?: ClinicalTrialContact[];
}

export interface ClinicalTrialContact {
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
}

export interface ClinicalTrialsSearchParams {
  query?: string;
  condition?: string;
  term?: string;
  location?: string;
  status?: string[];
  phase?: string[];
  studyType?: string;
  pageSize?: number;
  pageToken?: string;
  sort?: string;
}

export interface ClinicalTrialsSearchResult {
  studies: ClinicalTrialStudy[];
  totalCount: number;
  nextPageToken?: string;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  unchanged: number;
  errors: number;
  duration: number;
}

// ============================================================================
// In-Memory Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 1000) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(
        `[ClinicalTrials Cache] Cleaned up ${keysToDelete.length} expired entries`
      );
    }
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  stats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Cache instances
const searchCache = new ApiCache(5 * 60 * 1000, 500); // 5 min TTL, max 500 entries
const studyCache = new ApiCache(30 * 60 * 1000, 1000); // 30 min TTL, max 1000 entries

// ============================================================================
// Dynamic Condition Sync Tracker
// ============================================================================

interface ConditionSyncInfo {
  lastSyncedAt: number;
  syncInProgress: boolean;
  trialsCount: number;
}

class ConditionSyncTracker {
  private conditions = new Map<string, ConditionSyncInfo>();
  private readonly SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 საათი

  // ამოწმებს საჭიროა თუ არა sync
  needsSync(condition: string): boolean {
    const normalized = condition.toLowerCase().trim();
    const info = this.conditions.get(normalized);

    if (!info) return true; // არასდროს სინქრონიზებულა
    if (info.syncInProgress) return false; // უკვე მიმდინარეობს
    if (Date.now() - info.lastSyncedAt > this.SYNC_INTERVAL) return true; // მოძველებულია

    return false;
  }

  // აღნიშნავს რომ sync დაიწყო
  markSyncStarted(condition: string): void {
    const normalized = condition.toLowerCase().trim();
    const existing = this.conditions.get(normalized);
    this.conditions.set(normalized, {
      lastSyncedAt: existing?.lastSyncedAt || 0,
      syncInProgress: true,
      trialsCount: existing?.trialsCount || 0,
    });
    console.log(`[Condition Tracker] Sync started for: "${condition}"`);
  }

  // აღნიშნავს რომ sync დასრულდა
  markSyncCompleted(condition: string, trialsCount: number): void {
    const normalized = condition.toLowerCase().trim();
    this.conditions.set(normalized, {
      lastSyncedAt: Date.now(),
      syncInProgress: false,
      trialsCount,
    });
    console.log(`[Condition Tracker] Sync completed for: "${condition}" (${trialsCount} trials)`);
  }

  // აღნიშნავს რომ sync ჩავარდა
  markSyncFailed(condition: string): void {
    const normalized = condition.toLowerCase().trim();
    const existing = this.conditions.get(normalized);
    if (existing) {
      existing.syncInProgress = false;
    }
    console.log(`[Condition Tracker] Sync failed for: "${condition}"`);
  }

  // სტატისტიკა
  getStats(): { conditions: string[]; total: number } {
    return {
      conditions: Array.from(this.conditions.keys()),
      total: this.conditions.size,
    };
  }

  // კონკრეტული condition-ის ინფო
  getConditionInfo(condition: string): ConditionSyncInfo | null {
    return this.conditions.get(condition.toLowerCase().trim()) || null;
  }
}

const conditionTracker = new ConditionSyncTracker();

/**
 * Background-ში სინქრონიზაცია კონკრეტული condition-ისთვის
 * მომხმარებელს არ აცდის - მაშინვე აბრუნებს
 */
export function triggerBackgroundSync(condition: string): void {
  if (!condition || condition.length < 2) return;

  // შევამოწმოთ საჭიროა თუ არა sync
  if (!conditionTracker.needsSync(condition)) {
    console.log(`[Background Sync] Skipping "${condition}" - already synced or in progress`);
    return;
  }

  // აღვნიშნოთ რომ დაიწყო
  conditionTracker.markSyncStarted(condition);

  // Background-ში გავუშვათ (არ ველოდებით)
  syncNewTrials([condition])
    .then((result) => {
      conditionTracker.markSyncCompleted(condition, result.inserted + result.updated);
    })
    .catch((error) => {
      console.error(`[Background Sync] Error syncing "${condition}":`, error);
      conditionTracker.markSyncFailed(condition);
    });
}

/**
 * ძიების query-დან ამოიღებს შესაძლო condition-ებს
 */
export function extractConditionsFromQuery(query: string): string[] {
  if (!query || query.length < 3) return [];

  // გავფილტროთ ძალიან მოკლე ან generic სიტყვები
  const stopWords = new Set([
    "the", "and", "or", "for", "with", "in", "on", "at", "to", "a", "an",
    "trial", "trials", "study", "studies", "clinical", "treatment", "therapy",
    "და", "ან", "ის", "ეს", "რომ", "თუ", "მაგრამ"
  ]);

  const words = query.toLowerCase().split(/\s+/);

  // თუ მთლიანი query არის condition-ის სახელი
  if (query.length > 3 && !stopWords.has(query.toLowerCase())) {
    return [query];
  }

  // ცალკეული სიტყვები რომლებიც შეიძლება იყოს condition
  return words.filter(word => word.length > 3 && !stopWords.has(word));
}

// Export tracker stats
export function getConditionTrackerStats() {
  return conditionTracker.getStats();
}

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;
  private queue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(maxTokens: number = 10, refillRate: number = 10) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for token to become available
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });

      // Process queue periodically
      const interval = setInterval(() => {
        this.refill();
        while (this.tokens >= 1 && this.queue.length > 0) {
          this.tokens -= 1;
          const next = this.queue.shift();
          if (next) {
            clearInterval(interval);
            next.resolve();
          }
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(interval);
        const index = this.queue.findIndex((q) => q.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error("Rate limit queue timeout"));
        }
      }, 30000);
    });
  }
}

const rateLimiter = new RateLimiter(10, 10); // 10 requests per second

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableErrors?: number[];
}

async function fetchWithRetry<T>(
  url: string,
  options: { headers?: Record<string, string> } = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 16000,
    retryableErrors = [429, 500, 502, 503, 504],
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Acquire rate limit token
      await rateLimiter.acquire();

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "TrialNavigator/1.0",
          ...(options.headers || {}),
        },
      });

      // Check if we should retry this status code
      if (!response.ok) {
        if (retryableErrors.includes(response.status) && attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          console.warn(
            `[ClinicalTrials API] Request failed with ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await sleep(delay);
          continue;
        }

        throw new ClinicalTrialsApiError(
          `API error: ${response.status} ${response.statusText}`,
          response.status,
          url
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-network errors (unless it's a retryable API error)
      if (
        error instanceof ClinicalTrialsApiError &&
        !retryableErrors.includes(error.statusCode)
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.warn(
          `[ClinicalTrials API] Request error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`,
          error
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("Unknown fetch error");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class ClinicalTrialsApiError extends Error {
  statusCode: number;
  url: string;

  constructor(message: string, statusCode: number, url: string) {
    super(message);
    this.name = "ClinicalTrialsApiError";
    this.statusCode = statusCode;
    this.url = url;
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

function parseStudy(rawStudy: any): ClinicalTrialStudy {
  const protocol = rawStudy.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const sponsor = protocol.sponsorCollaboratorsModule || {};
  const description = protocol.descriptionModule || {};
  const conditions = protocol.conditionsModule || {};
  const design = protocol.designModule || {};
  const eligibility = protocol.eligibilityModule || {};
  const contacts = protocol.contactsLocationsModule || {};
  const arms = protocol.armsInterventionsModule || {};

  // Parse locations
  const locations: ClinicalTrialLocation[] = (contacts.locations || []).map(
    (loc: any) => ({
      facility: loc.facility,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      status: loc.status,
      contacts: (loc.contacts || []).map((c: any) => ({
        name: c.name,
        role: c.role,
        phone: c.phone,
        email: c.email,
      })),
    })
  );

  // Parse central contacts
  const centralContacts: ClinicalTrialContact[] = (
    contacts.centralContacts || []
  ).map((c: any) => ({
    name: c.name,
    role: c.role,
    phone: c.phone,
    email: c.email,
  }));

  // Parse interventions
  const interventions: string[] = (arms.interventions || []).map(
    (i: any) => `${i.type}: ${i.name}`
  );

  return {
    nctId: identification.nctId || "",
    title:
      identification.briefTitle ||
      identification.officialTitle ||
      "Untitled Study",
    officialTitle: identification.officialTitle,
    status: status.overallStatus || "Unknown",
    phase: design.phases?.join(", ") || undefined,
    studyType: design.studyType,
    conditions: conditions.conditions || [],
    interventions,
    sponsor: sponsor.leadSponsor?.name || "Unknown Sponsor",
    collaborators: (sponsor.collaborators || []).map((c: any) => c.name),
    locations,
    eligibility: {
      criteria: eligibility.eligibilityCriteria,
      gender: eligibility.sex,
      minAge: eligibility.minimumAge,
      maxAge: eligibility.maximumAge,
      healthyVolunteers: eligibility.healthyVolunteers === "Yes",
    },
    contacts: centralContacts,
    startDate: status.startDateStruct?.date,
    completionDate: status.completionDateStruct?.date,
    enrollmentCount: design.enrollmentInfo?.count,
    briefSummary: description.briefSummary,
    detailedDescription: description.detailedDescription,
    lastUpdateDate: status.lastUpdateSubmitDate,
  };
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Search for clinical trials with caching and rate limiting
 */
export async function searchClinicalTrials(
  params: ClinicalTrialsSearchParams
): Promise<ClinicalTrialsSearchResult> {
  // Build cache key
  const cacheKey = `search:${JSON.stringify(params)}`;

  // Check cache first
  const cached = searchCache.get<ClinicalTrialsSearchResult>(cacheKey);
  if (cached) {
    console.log(`[ClinicalTrials API] Cache hit for search`);
    return cached;
  }

  const queryParams = new URLSearchParams();

  // Build query string
  const queryParts: string[] = [];
  if (params.query) {
    queryParts.push(params.query);
  }
  if (params.condition) {
    queryParts.push(`CONDITION:${params.condition}`);
  }
  if (params.term) {
    queryParts.push(params.term);
  }
  if (queryParts.length > 0) {
    queryParams.set("query.term", queryParts.join(" AND "));
  }

  // Location filter
  if (params.location) {
    queryParams.set("query.locn", params.location);
  }

  // Status filter
  if (params.status && params.status.length > 0) {
    queryParams.set("filter.overallStatus", params.status.join(","));
  }

  // Phase filter
  if (params.phase && params.phase.length > 0) {
    queryParams.set("filter.phase", params.phase.join(","));
  }

  // Pagination
  queryParams.set("pageSize", String(params.pageSize || 10));
  if (params.pageToken) {
    queryParams.set("pageToken", params.pageToken);
  }

  // Sort
  if (params.sort) {
    queryParams.set("sort", params.sort);
  }

  // Request fields we need
  queryParams.set(
    "fields",
    [
      "NCTId",
      "BriefTitle",
      "OfficialTitle",
      "OverallStatus",
      "Phase",
      "StudyType",
      "Condition",
      "InterventionName",
      "InterventionType",
      "LeadSponsorName",
      "CollaboratorName",
      "LocationFacility",
      "LocationCity",
      "LocationState",
      "LocationCountry",
      "LocationStatus",
      "CentralContactName",
      "CentralContactPhone",
      "CentralContactEMail",
      "EligibilityCriteria",
      "Gender",
      "MinimumAge",
      "MaximumAge",
      "HealthyVolunteers",
      "StartDate",
      "CompletionDate",
      "EnrollmentCount",
      "BriefSummary",
      "DetailedDescription",
      "LastUpdateSubmitDate",
    ].join(",")
  );

  const url = `${BASE_URL}/studies?${queryParams.toString()}`;

  console.log(`[ClinicalTrials API] Searching: ${url.substring(0, 100)}...`);

  const data = await fetchWithRetry<any>(url);

  const result: ClinicalTrialsSearchResult = {
    studies: (data.studies || []).map(parseStudy),
    totalCount: data.totalCount || 0,
    nextPageToken: data.nextPageToken,
  };

  // Cache the result
  searchCache.set(cacheKey, result);

  console.log(
    `[ClinicalTrials API] Found ${result.totalCount} trials, returned ${result.studies.length}`
  );

  return result;
}

/**
 * Get a specific clinical trial by NCT ID with caching
 */
export async function getClinicalTrial(
  nctId: string
): Promise<ClinicalTrialStudy | null> {
  // Validate NCT ID format
  if (!/^NCT\d{8}$/i.test(nctId)) {
    console.warn(`[ClinicalTrials API] Invalid NCT ID format: ${nctId}`);
    return null;
  }

  const normalizedNctId = nctId.toUpperCase();

  // Check cache first
  const cached = studyCache.get<ClinicalTrialStudy>(`study:${normalizedNctId}`);
  if (cached) {
    console.log(`[ClinicalTrials API] Cache hit for ${normalizedNctId}`);
    return cached;
  }

  const url = `${BASE_URL}/studies/${normalizedNctId}`;

  console.log(`[ClinicalTrials API] Fetching trial: ${normalizedNctId}`);

  try {
    const data = await fetchWithRetry<any>(url);
    const study = parseStudy(data);

    // Cache the result
    studyCache.set(`study:${normalizedNctId}`, study);

    return study;
  } catch (error) {
    if (
      error instanceof ClinicalTrialsApiError &&
      error.statusCode === 404
    ) {
      console.log(`[ClinicalTrials API] Trial not found: ${normalizedNctId}`);
      return null;
    }
    throw error;
  }
}

/**
 * Get full trial details including all protocol information
 */
export async function getTrialDetails(
  nctNumber: string
): Promise<ClinicalTrialStudy | null> {
  const normalizedNctId = nctNumber.toUpperCase();

  // Check cache first
  const cached = studyCache.get<ClinicalTrialStudy>(
    `details:${normalizedNctId}`
  );
  if (cached) {
    return cached;
  }

  const url = `${BASE_URL}/studies/${normalizedNctId}`;

  console.log(`[ClinicalTrials API] Fetching full details: ${normalizedNctId}`);

  try {
    const data = await fetchWithRetry<any>(url);
    const study = parseStudy(data);

    // Cache with longer TTL for full details
    studyCache.set(`details:${normalizedNctId}`, study, 60 * 60 * 1000); // 1 hour

    return study;
  } catch (error) {
    if (
      error instanceof ClinicalTrialsApiError &&
      error.statusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

// ============================================================================
// Background Sync Job
// ============================================================================

/**
 * Sync new/updated trials from ClinicalTrials.gov to our database
 */
export async function syncNewTrials(
  conditions: string[] = ["hypoxic ischemic encephalopathy", "cerebral palsy"]
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    duration: 0,
  };

  console.log(
    `[ClinicalTrials Sync] Starting sync for conditions: ${conditions.join(", ")}`
  );

  try {
    for (const condition of conditions) {
      let pageToken: string | undefined;
      let pageCount = 0;

      do {
        const searchResult = await searchClinicalTrials({
          condition,
          status: [
            "RECRUITING",
            "NOT_YET_RECRUITING",
            "ACTIVE_NOT_RECRUITING",
            "ENROLLING_BY_INVITATION",
          ],
          pageSize: 100,
          pageToken,
          sort: "LastUpdatePostDate:desc",
        });

        pageCount++;
        console.log(
          `[ClinicalTrials Sync] Processing page ${pageCount} for "${condition}" (${searchResult.studies.length} studies)`
        );

        for (const study of searchResult.studies) {
          try {
            await upsertTrial(study, result);
          } catch (error) {
            console.error(
              `[ClinicalTrials Sync] Error processing ${study.nctId}:`,
              error
            );
            result.errors++;
          }
        }

        pageToken = searchResult.nextPageToken;

        // Rate limit between pages
        if (pageToken) {
          await sleep(500);
        }
      } while (pageToken && pageCount < 10); // Limit to 10 pages per condition
    }
  } catch (error) {
    console.error("[ClinicalTrials Sync] Sync error:", error);
    throw error;
  }

  result.duration = Date.now() - startTime;

  console.log(
    `[ClinicalTrials Sync] Completed in ${result.duration}ms:`,
    `inserted=${result.inserted}, updated=${result.updated}, unchanged=${result.unchanged}, errors=${result.errors}`
  );

  return result;
}

/**
 * Upsert a trial into our database
 */
async function upsertTrial(
  study: ClinicalTrialStudy,
  result: SyncResult
): Promise<void> {
  // Check if trial exists
  const existing = await db
    .select()
    .from(clinicalTrials)
    .where(eq(clinicalTrials.nctNumber, study.nctId))
    .limit(1);

  // Map interventions to the expected format
  const mappedInterventions = study.interventions.map((i) => {
    const parts = i.split(": ");
    return {
      type: parts[0] || "Unknown",
      name: parts[1] || i,
    };
  });

  // Map locations to the expected format
  const mappedLocations = study.locations.map((loc) => ({
    facility: loc.facility || "",
    city: loc.city || "",
    country: loc.country || "",
    countryCode: "", // API doesn't provide country code
    status: loc.status,
  }));

  // Map contacts to the expected format
  const mappedContacts = study.contacts.map((c) => ({
    name: c.name || "",
    email: c.email,
    phone: c.phone,
    role: c.role,
  }));

  if (existing.length === 0) {
    // Insert new trial
    await db.insert(clinicalTrials).values({
      nctNumber: study.nctId,
      titleEn: study.title,
      briefSummaryEn: study.briefSummary,
      detailedDescriptionEn: study.detailedDescription,
      status: study.status,
      phase: study.phase,
      studyType: study.studyType,
      eligibilityCriteriaEn: study.eligibility.criteria,
      minAge: study.eligibility.minAge,
      maxAge: study.eligibility.maxAge,
      gender: study.eligibility.gender,
      healthyVolunteers: study.eligibility.healthyVolunteers,
      conditions: study.conditions,
      interventions: mappedInterventions,
      locations: mappedLocations,
      contacts: mappedContacts,
      sponsorName: study.sponsor,
      startDate: study.startDate || undefined,
      completionDate: study.completionDate || undefined,
      lastUpdateDate: study.lastUpdateDate
        ? new Date(study.lastUpdateDate)
        : new Date(),
      sources: ["clinicaltrials.gov"],
    });
    result.inserted++;
  } else {
    // Check if update is needed (based on lastUpdateDate)
    const existingTrial = existing[0];
    const existingUpdateDate = existingTrial.lastUpdateDate?.getTime() || 0;
    const newUpdateDate = study.lastUpdateDate
      ? new Date(study.lastUpdateDate).getTime()
      : 0;

    if (newUpdateDate > existingUpdateDate) {
      await db
        .update(clinicalTrials)
        .set({
          titleEn: study.title,
          briefSummaryEn: study.briefSummary,
          detailedDescriptionEn: study.detailedDescription,
          status: study.status,
          phase: study.phase,
          studyType: study.studyType,
          eligibilityCriteriaEn: study.eligibility.criteria,
          minAge: study.eligibility.minAge,
          maxAge: study.eligibility.maxAge,
          gender: study.eligibility.gender,
          healthyVolunteers: study.eligibility.healthyVolunteers,
          conditions: study.conditions,
          interventions: mappedInterventions,
          locations: mappedLocations,
          contacts: mappedContacts,
          sponsorName: study.sponsor,
          startDate: study.startDate || undefined,
          completionDate: study.completionDate || undefined,
          lastUpdateDate: study.lastUpdateDate
            ? new Date(study.lastUpdateDate)
            : new Date(),
          sources: ["clinicaltrials.gov"],
          updatedAt: new Date(),
        })
        .where(eq(clinicalTrials.nctNumber, study.nctId));
      result.updated++;
    } else {
      result.unchanged++;
    }
  }
}

// ============================================================================
// HIE-Specific Search
// ============================================================================

/**
 * Search for HIE-related clinical trials with child-specific matching
 */
export async function searchHIETrials(options: {
  childAge?: number; // in months
  location?: string;
  status?: string[];
  pageSize?: number;
}): Promise<ClinicalTrialsSearchResult> {
  // HIE-related search terms
  const hieTerms = [
    "hypoxic ischemic encephalopathy",
    "HIE",
    "neonatal encephalopathy",
    "perinatal asphyxia",
    "cerebral palsy",
    "therapeutic hypothermia",
  ];

  const result = await searchClinicalTrials({
    condition: hieTerms.join(" OR "),
    location: options.location,
    status: options.status || [
      "RECRUITING",
      "NOT_YET_RECRUITING",
      "ACTIVE_NOT_RECRUITING",
    ],
    pageSize: options.pageSize || 20,
  });

  // If child age is provided, filter and score by eligibility
  if (options.childAge !== undefined) {
    result.studies = result.studies.map((study) => {
      // Add eligibility score based on age match
      const minAgeMonths = parseAgeToMonths(study.eligibility.minAge);
      const maxAgeMonths = parseAgeToMonths(study.eligibility.maxAge);

      let eligible = true;
      if (minAgeMonths !== null && options.childAge! < minAgeMonths)
        eligible = false;
      if (maxAgeMonths !== null && options.childAge! > maxAgeMonths)
        eligible = false;

      return {
        ...study,
        _eligibilityScore: eligible ? 100 : 50,
      };
    });

    // Sort by eligibility score
    result.studies.sort(
      (a: any, b: any) => (b._eligibilityScore || 0) - (a._eligibilityScore || 0)
    );
  }

  return result;
}

/**
 * Parse age string to months
 */
function parseAgeToMonths(ageStr?: string): number | null {
  if (!ageStr) return null;

  const match = ageStr.match(/(\d+)\s*(year|month|week|day)/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "year":
      return value * 12;
    case "month":
      return value;
    case "week":
      return Math.floor(value / 4);
    case "day":
      return Math.floor(value / 30);
    default:
      return null;
  }
}

// ============================================================================
// Cache Management
// ============================================================================

export function clearCache(type?: "search" | "study" | "all"): void {
  switch (type) {
    case "search":
      searchCache.invalidate();
      break;
    case "study":
      studyCache.invalidate();
      break;
    default:
      searchCache.invalidate();
      studyCache.invalidate();
  }
  console.log(`[ClinicalTrials API] Cache cleared: ${type || "all"}`);
}

export function getCacheStats(): {
  search: { size: number; maxSize: number };
  study: { size: number; maxSize: number };
} {
  return {
    search: searchCache.stats(),
    study: studyCache.stats(),
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  searchClinicalTrials,
  getClinicalTrial,
  getTrialDetails,
  searchHIETrials,
  syncNewTrials,
  clearCache,
  getCacheStats,
  triggerBackgroundSync,
  extractConditionsFromQuery,
  getConditionTrackerStats,
};
