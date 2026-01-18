/**
 * ClinicalTrials.gov API Connector
 * ================================
 * Fetches clinical trial data from the ClinicalTrials.gov API v2
 * https://clinicaltrials.gov/data-api/api
 */

import { db } from "../../db";
import { clinicalTrials, dataSourceStatus } from "@shared/schema";
import { eq } from "drizzle-orm";

const API_BASE_URL = "https://clinicaltrials.gov/api/v2";
const SOURCE_NAME = "clinicaltrials_gov";

interface CTGStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
      secondaryIdInfos?: Array<{ id: string; type?: string }>;
    };
    statusModule: {
      overallStatus: string;
      startDateStruct?: { date: string };
      completionDateStruct?: { date: string };
      lastUpdateSubmitDate?: string;
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions?: string[];
    };
    designModule?: {
      studyType?: string;
      phases?: string[];
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        type: string;
        name: string;
      }>;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
      healthyVolunteers?: boolean;
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility?: string;
        city?: string;
        country?: string;
        status?: string;
      }>;
      centralContacts?: Array<{
        name?: string;
        email?: string;
        phone?: string;
        role?: string;
      }>;
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: {
        name?: string;
        class?: string;
      };
    };
  };
}

interface CTGSearchResponse {
  studies: CTGStudy[];
  nextPageToken?: string;
  totalCount?: number;
}

function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    "United States": "US",
    "Germany": "DE",
    "France": "FR",
    "United Kingdom": "GB",
    "Italy": "IT",
    "Spain": "ES",
    "Netherlands": "NL",
    "Belgium": "BE",
    "Switzerland": "CH",
    "Austria": "AT",
    "Poland": "PL",
    "Georgia": "GE",
    "Armenia": "AM",
    "Azerbaijan": "AZ",
    "Turkey": "TR",
    "Israel": "IL",
    "Canada": "CA",
    "Australia": "AU",
    "Japan": "JP",
    "China": "CN",
    "South Korea": "KR",
    "India": "IN",
  };
  return countryMap[country] || country.substring(0, 2).toUpperCase();
}

export async function searchTrials(
  query: string,
  options: {
    pageSize?: number;
    pageToken?: string;
    status?: string[];
    phase?: string[];
    ageRange?: { min?: string; max?: string };
    countries?: string[];
  } = {}
): Promise<{ trials: CTGStudy[]; nextPageToken?: string; totalCount: number }> {
  const params = new URLSearchParams({
    "query.term": query,
    pageSize: String(options.pageSize || 20),
    format: "json",
  });

  if (options.pageToken) {
    params.append("pageToken", options.pageToken);
  }

  if (options.status?.length) {
    params.append("filter.overallStatus", options.status.join(","));
  }

  const url = `${API_BASE_URL}/studies?${params.toString()}`;
  console.log(`[ClinicalTrials.gov] Searching: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as CTGSearchResponse;
    
    return {
      trials: data.studies || [],
      nextPageToken: data.nextPageToken,
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error("[ClinicalTrials.gov] Search error:", error);
    throw error;
  }
}

export async function getTrialByNCT(nctId: string): Promise<CTGStudy | null> {
  const url = `${API_BASE_URL}/studies/${nctId}?format=json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[ClinicalTrials.gov] Error fetching ${nctId}:`, error);
    return null;
  }
}

export function transformToDBFormat(study: CTGStudy) {
  const proto = study.protocolSection;
  const id = proto.identificationModule;
  const status = proto.statusModule;
  const desc = proto.descriptionModule;
  const cond = proto.conditionsModule;
  const design = proto.designModule;
  const arms = proto.armsInterventionsModule;
  const elig = proto.eligibilityModule;
  const contact = proto.contactsLocationsModule;
  const sponsor = proto.sponsorCollaboratorsModule;

  const eudraCTInfo = id.secondaryIdInfos?.find(
    (s) => s.type === "EudraCT Number"
  );

  return {
    nctNumber: id.nctId,
    eudraCTNumber: eudraCTInfo?.id || null,
    titleEn: id.officialTitle || id.briefTitle,
    briefSummaryEn: desc?.briefSummary || null,
    detailedDescriptionEn: desc?.detailedDescription || null,
    status: status.overallStatus,
    phase: design?.phases?.join(", ") || null,
    studyType: design?.studyType || null,
    eligibilityCriteriaEn: elig?.eligibilityCriteria || null,
    minAge: elig?.minimumAge || null,
    maxAge: elig?.maximumAge || null,
    gender: elig?.sex || "All",
    healthyVolunteers: elig?.healthyVolunteers || false,
    conditions: cond?.conditions || [],
    interventions:
      arms?.interventions?.map((i) => ({ type: i.type, name: i.name })) || [],
    locations:
      contact?.locations?.map((l) => ({
        facility: l.facility || "",
        city: l.city || "",
        country: l.country || "",
        countryCode: getCountryCode(l.country || ""),
        status: l.status,
      })) || [],
    contacts:
      contact?.centralContacts?.map((c) => ({
        name: c.name || "",
        email: c.email,
        phone: c.phone,
        role: c.role,
      })) || [],
    sponsorName: sponsor?.leadSponsor?.name || null,
    sponsorType: sponsor?.leadSponsor?.class || null,
    startDate: status.startDateStruct?.date || null,
    completionDate: status.completionDateStruct?.date || null,
    lastUpdateDate: status.lastUpdateSubmitDate
      ? new Date(status.lastUpdateSubmitDate)
      : null,
    sources: [SOURCE_NAME],
  };
}

export async function syncTrialsForCondition(
  condition: string,
  maxPages: number = 5
): Promise<{ added: number; updated: number; errors: number }> {
  console.log(`[ClinicalTrials.gov] Syncing trials for: ${condition}`);
  
  let added = 0;
  let updated = 0;
  let errors = 0;
  let pageToken: string | undefined;

  try {
    for (let page = 0; page < maxPages; page++) {
      const result = await searchTrials(condition, {
        pageSize: 50,
        pageToken,
        status: ["RECRUITING", "ENROLLING_BY_INVITATION", "ACTIVE_NOT_RECRUITING"],
      });

      for (const study of result.trials) {
        try {
          const trialData = transformToDBFormat(study);
          
          const existing = await db
            .select()
            .from(clinicalTrials)
            .where(eq(clinicalTrials.nctNumber, trialData.nctNumber!))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(clinicalTrials)
              .set({ ...trialData, updatedAt: new Date() })
              .where(eq(clinicalTrials.nctNumber, trialData.nctNumber!));
            updated++;
          } else {
            await db.insert(clinicalTrials).values(trialData as any);
            added++;
          }
        } catch (err) {
          console.error(`[ClinicalTrials.gov] Error saving trial:`, err);
          errors++;
        }
      }

      if (!result.nextPageToken) break;
      pageToken = result.nextPageToken;

      await new Promise((r) => setTimeout(r, 500));
    }

    await updateSourceStatus("success", added + updated);
    console.log(`[ClinicalTrials.gov] Sync complete: ${added} added, ${updated} updated, ${errors} errors`);

  } catch (error) {
    console.error("[ClinicalTrials.gov] Sync failed:", error);
    await updateSourceStatus("failed", 0, String(error));
  }

  return { added, updated, errors };
}

async function updateSourceStatus(
  status: string,
  recordsCount: number,
  errorMessage?: string
) {
  const existing = await db
    .select()
    .from(dataSourceStatus)
    .where(eq(dataSourceStatus.sourceName, SOURCE_NAME))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(dataSourceStatus)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        recordsCount,
        errorMessage: errorMessage || null,
      })
      .where(eq(dataSourceStatus.sourceName, SOURCE_NAME));
  } else {
    await db.insert(dataSourceStatus).values({
      sourceName: SOURCE_NAME,
      sourceDisplayName: "ClinicalTrials.gov",
      lastSyncAt: new Date(),
      lastSyncStatus: status,
      recordsCount,
      isActive: true,
      syncIntervalHours: 24,
    });
  }
}
