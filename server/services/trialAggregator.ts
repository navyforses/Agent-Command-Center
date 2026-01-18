/**
 * Trial Aggregator Service
 * ========================
 * Aggregates clinical trials from multiple sources,
 * handles deduplication, scoring, and provides unified search
 */

import { db } from "../db";
import {
  clinicalTrials,
  trialTranslations,
  dataSourceStatus,
  languages,
  type ClinicalTrial,
} from "@shared/schema";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";
import * as clinicalTrialsGov from "./trialSources/clinicalTrialsGov";

export interface TrialSearchParams {
  query: string;
  conditions?: string[];
  locations?: string[];
  phase?: string[];
  status?: string[];
  ageRange?: { min?: string; max?: string };
  language?: string;
  page?: number;
  pageSize?: number;
}

export interface TrialSearchResult {
  trials: (ClinicalTrial & {
    translation?: {
      titleTranslated?: string;
      summaryTranslated?: string;
      simplifiedSummary?: string;
    };
  })[];
  totalCount: number;
  page: number;
  pageSize: number;
  sources: string[];
}

export async function searchTrials(
  params: TrialSearchParams
): Promise<TrialSearchResult> {
  const { query, language = "ka", page = 1, pageSize = 20 } = params;

  console.log(`[Trial Aggregator] Searching: "${query}" (${language})`);

  const offset = (page - 1) * pageSize;

  const conditions = [];
  
  if (query) {
    conditions.push(
      or(
        ilike(clinicalTrials.titleEn, `%${query}%`),
        ilike(clinicalTrials.briefSummaryEn, `%${query}%`),
        sql`${clinicalTrials.conditions}::text ILIKE ${'%' + query + '%'}`
      )
    );
  }

  if (params.status?.length) {
    conditions.push(
      or(...params.status.map((s) => eq(clinicalTrials.status, s)))
    );
  }

  if (params.phase?.length) {
    conditions.push(
      or(...params.phase.map((p) => ilike(clinicalTrials.phase, `%${p}%`)))
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [trials, countResult] = await Promise.all([
    db
      .select()
      .from(clinicalTrials)
      .where(whereClause)
      .orderBy(desc(clinicalTrials.relevanceScore), desc(clinicalTrials.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(clinicalTrials)
      .where(whereClause),
  ]);

  const trialsWithTranslations = await Promise.all(
    trials.map(async (trial) => {
      if (language !== "en") {
        const translation = await db
          .select()
          .from(trialTranslations)
          .where(
            and(
              eq(trialTranslations.trialId, trial.id),
              eq(trialTranslations.languageCode, language)
            )
          )
          .limit(1);

        if (translation.length > 0) {
          return {
            ...trial,
            translation: {
              titleTranslated: translation[0].titleTranslated || undefined,
              summaryTranslated: translation[0].summaryTranslated || undefined,
              simplifiedSummary: translation[0].simplifiedSummary || undefined,
            },
          };
        }
      }
      return trial;
    })
  );

  const sources = await db
    .select({ sourceName: dataSourceStatus.sourceName })
    .from(dataSourceStatus)
    .where(eq(dataSourceStatus.isActive, true));

  return {
    trials: trialsWithTranslations,
    totalCount: Number(countResult[0]?.count || 0),
    page,
    pageSize,
    sources: sources.map((s) => s.sourceName!),
  };
}

export async function getTrialById(
  id: number,
  language: string = "ka"
): Promise<
  | (ClinicalTrial & {
      translation?: {
        titleTranslated?: string;
        summaryTranslated?: string;
        eligibilityTranslated?: string;
        simplifiedSummary?: string;
      };
    })
  | null
> {
  const trial = await db
    .select()
    .from(clinicalTrials)
    .where(eq(clinicalTrials.id, id))
    .limit(1);

  if (trial.length === 0) return null;

  let translation = null;
  if (language !== "en") {
    const trans = await db
      .select()
      .from(trialTranslations)
      .where(
        and(
          eq(trialTranslations.trialId, id),
          eq(trialTranslations.languageCode, language)
        )
      )
      .limit(1);

    if (trans.length > 0) {
      translation = {
        titleTranslated: trans[0].titleTranslated || undefined,
        summaryTranslated: trans[0].summaryTranslated || undefined,
        eligibilityTranslated: trans[0].eligibilityTranslated || undefined,
        simplifiedSummary: trans[0].simplifiedSummary || undefined,
      };
    }
  }

  return { ...trial[0], translation: translation || undefined };
}

export async function getTrialByNCT(
  nctNumber: string,
  language: string = "ka"
): Promise<ClinicalTrial | null> {
  const trial = await db
    .select()
    .from(clinicalTrials)
    .where(eq(clinicalTrials.nctNumber, nctNumber))
    .limit(1);

  return trial[0] || null;
}

export async function syncAllSources(
  conditions: string[] = ["hypoxic-ischemic encephalopathy", "HIE neonatal", "birth asphyxia"]
): Promise<{
  sources: { name: string; added: number; updated: number; errors: number }[];
}> {
  console.log("[Trial Aggregator] Starting full sync...");

  const results: { name: string; added: number; updated: number; errors: number }[] = [];

  for (const condition of conditions) {
    const ctgResult = await clinicalTrialsGov.syncTrialsForCondition(condition);
    results.push({
      name: "clinicaltrials_gov",
      ...ctgResult,
    });
  }

  console.log("[Trial Aggregator] Full sync complete:", results);
  return { sources: results };
}

export async function getDataSourcesStatus(): Promise<
  Array<{
    sourceName: string;
    displayName: string;
    lastSyncAt: Date | null;
    lastSyncStatus: string | null;
    recordsCount: number;
    isActive: boolean;
  }>
> {
  const sources = await db.select().from(dataSourceStatus);
  return sources.map((s) => ({
    sourceName: s.sourceName!,
    displayName: s.sourceDisplayName || s.sourceName!,
    lastSyncAt: s.lastSyncAt,
    lastSyncStatus: s.lastSyncStatus,
    recordsCount: s.recordsCount || 0,
    isActive: s.isActive ?? true,
  }));
}

export async function getSupportedLanguages(): Promise<
  Array<{
    code: string;
    nameNative: string;
    nameEnglish: string;
    tier: number;
  }>
> {
  const langs = await db
    .select()
    .from(languages)
    .where(eq(languages.isActive, true));

  return langs.map((l) => ({
    code: l.code,
    nameNative: l.nameNative,
    nameEnglish: l.nameEnglish,
    tier: l.tier || 2,
  }));
}

export async function seedDefaultLanguages(): Promise<void> {
  const defaultLanguages = [
    { code: "ka", nameNative: "ქართული", nameEnglish: "Georgian", tier: 1, speakersMillions: 4, diasporaMillions: 2 },
    { code: "en", nameNative: "English", nameEnglish: "English", tier: 1, speakersMillions: 1500, diasporaMillions: 0 },
    { code: "hy", nameNative: "Հայերdelays", nameEnglish: "Armenian", tier: 1, speakersMillions: 6, diasporaMillions: 7 },
    { code: "az", nameNative: "Azərbaycan", nameEnglish: "Azerbaijani", tier: 1, speakersMillions: 10, diasporaMillions: 3 },
    { code: "ru", nameNative: "Русский", nameEnglish: "Russian", tier: 1, speakersMillions: 255, diasporaMillions: 30 },
    { code: "uk", nameNative: "Українська", nameEnglish: "Ukrainian", tier: 2, speakersMillions: 40, diasporaMillions: 5 },
    { code: "kk", nameNative: "Қазақша", nameEnglish: "Kazakh", tier: 2, speakersMillions: 13, diasporaMillions: 2 },
    { code: "uz", nameNative: "O'zbek", nameEnglish: "Uzbek", tier: 2, speakersMillions: 35, diasporaMillions: 3 },
    { code: "tr", nameNative: "Türkçe", nameEnglish: "Turkish", tier: 2, speakersMillions: 80, diasporaMillions: 10 },
    { code: "de", nameNative: "Deutsch", nameEnglish: "German", tier: 2, speakersMillions: 95, diasporaMillions: 10 },
  ];

  for (const lang of defaultLanguages) {
    const existing = await db
      .select()
      .from(languages)
      .where(eq(languages.code, lang.code))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(languages).values({
        ...lang,
        direction: "ltr",
        isActive: true,
      });
    }
  }

  console.log("[Trial Aggregator] Default languages seeded");
}

export async function calculateRelevanceScore(
  trialId: number,
  userContext?: { conditions?: string[]; location?: string }
): Promise<number> {
  const trial = await db
    .select()
    .from(clinicalTrials)
    .where(eq(clinicalTrials.id, trialId))
    .limit(1);

  if (trial.length === 0) return 0;

  let score = 50;

  if (trial[0].status === "Recruiting") score += 20;
  else if (trial[0].status === "Active, not recruiting") score += 10;
  else if (trial[0].status === "Completed") score -= 10;

  const conditions = trial[0].conditions as string[] | null;
  if (userContext?.conditions && conditions) {
    const matchCount = userContext.conditions.filter((uc) =>
      conditions.some((c) => c.toLowerCase().includes(uc.toLowerCase()))
    ).length;
    score += matchCount * 10;
  }

  if (userContext?.location && trial[0].locations) {
    const locations = trial[0].locations as Array<{ country: string }>;
    if (locations.some((l) => l.country?.toLowerCase().includes(userContext.location!.toLowerCase()))) {
      score += 15;
    }
  }

  if (trial[0].phase?.includes("III")) score += 10;
  else if (trial[0].phase?.includes("II")) score += 5;

  return Math.min(100, Math.max(0, score));
}
