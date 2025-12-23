/**
 * OpenFDA API Service
 * Documentation: https://open.fda.gov/apis/
 *
 * Provides access to FDA data including:
 * - Drug information (labels, adverse events, recalls)
 * - Device information
 * - Food information
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://api.fda.gov';

// Optional: Add your API key for higher rate limits (1000 requests/day without, 120000/day with)
// Get one at: https://open.fda.gov/apis/authentication/
const API_KEY = process.env.OPENFDA_API_KEY || '';

export interface DrugLabel {
  id: string;
  brandName: string;
  genericName: string;
  manufacturer: string;
  activeIngredients: string[];
  purpose?: string;
  indications?: string;
  warnings?: string;
  dosage?: string;
  adverseReactions?: string;
  drugInteractions?: string;
  pediatricUse?: string;
  pregnancyCategory?: string;
  storageHandling?: string;
  route?: string[];
  productType?: string;
  marketingStatus?: string;
  ndc?: string[];
  rxcui?: string[];
  splId?: string;
  effectiveDate?: string;
}

export interface DrugAdverseEvent {
  safetyReportId: string;
  receiptDate: string;
  serious: boolean;
  seriousnessHospitalization?: boolean;
  seriousnessLifeThreatening?: boolean;
  seriousnessDeath?: boolean;
  patientAge?: number;
  patientAgeUnit?: string;
  patientSex?: string;
  patientWeight?: number;
  drugs: {
    name: string;
    indication?: string;
    route?: string;
    dose?: string;
  }[];
  reactions: string[];
  outcomes?: string[];
}

export interface DrugRecall {
  recallNumber: string;
  recallInitiationDate: string;
  reportDate: string;
  recallClass: string;
  productDescription: string;
  reason: string;
  status: string;
  distribution: string;
  firm: string;
  city?: string;
  state?: string;
  country?: string;
  voluntaryMandated?: string;
}

export interface DrugSearchParams {
  query?: string;
  brandName?: string;
  genericName?: string;
  manufacturer?: string;
  route?: string;
  limit?: number;
  skip?: number;
}

export interface DrugSearchResult<T> {
  results: T[];
  totalCount: number;
}

/**
 * Build search URL with optional API key
 */
function buildUrl(endpoint: string, params: URLSearchParams): string {
  if (API_KEY) {
    params.set('api_key', API_KEY);
  }
  return `${BASE_URL}${endpoint}?${params.toString()}`;
}

/**
 * Search drug labels (package inserts)
 */
export async function searchDrugLabels(params: DrugSearchParams): Promise<DrugSearchResult<DrugLabel>> {
  const searchParts: string[] = [];

  if (params.query) {
    searchParts.push(params.query);
  }
  if (params.brandName) {
    searchParts.push(`openfda.brand_name:"${params.brandName}"`);
  }
  if (params.genericName) {
    searchParts.push(`openfda.generic_name:"${params.genericName}"`);
  }
  if (params.manufacturer) {
    searchParts.push(`openfda.manufacturer_name:"${params.manufacturer}"`);
  }
  if (params.route) {
    searchParts.push(`openfda.route:"${params.route}"`);
  }

  const queryParams = new URLSearchParams({
    search: searchParts.join(' AND ') || '_exists_:openfda.brand_name',
    limit: String(params.limit || 20),
    skip: String(params.skip || 0),
  });

  const url = buildUrl('/drug/label.json', queryParams);

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      return { results: [], totalCount: 0 };
    }

    if (!response.ok) {
      throw new Error(`OpenFDA API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;

    const results: DrugLabel[] = (data.results || []).map((item: any) => ({
      id: item.id || item.set_id,
      brandName: item.openfda?.brand_name?.[0] || 'Unknown',
      genericName: item.openfda?.generic_name?.[0] || '',
      manufacturer: item.openfda?.manufacturer_name?.[0] || 'Unknown Manufacturer',
      activeIngredients: item.active_ingredient || [],
      purpose: Array.isArray(item.purpose) ? item.purpose.join(' ') : item.purpose,
      indications: Array.isArray(item.indications_and_usage) ? item.indications_and_usage.join(' ') : item.indications_and_usage,
      warnings: Array.isArray(item.warnings) ? item.warnings.join(' ') : item.warnings,
      dosage: Array.isArray(item.dosage_and_administration) ? item.dosage_and_administration.join(' ') : item.dosage_and_administration,
      adverseReactions: Array.isArray(item.adverse_reactions) ? item.adverse_reactions.join(' ') : item.adverse_reactions,
      drugInteractions: Array.isArray(item.drug_interactions) ? item.drug_interactions.join(' ') : item.drug_interactions,
      pediatricUse: Array.isArray(item.pediatric_use) ? item.pediatric_use.join(' ') : item.pediatric_use,
      pregnancyCategory: item.pregnancy_category,
      storageHandling: Array.isArray(item.storage_and_handling) ? item.storage_and_handling.join(' ') : item.storage_and_handling,
      route: item.openfda?.route || [],
      productType: item.openfda?.product_type?.[0],
      marketingStatus: item.openfda?.marketing_status,
      ndc: item.openfda?.product_ndc || [],
      rxcui: item.openfda?.rxcui || [],
      splId: item.spl_id,
      effectiveDate: item.effective_time,
    }));

    return {
      results,
      totalCount: data.meta?.results?.total || results.length,
    };
  } catch (error) {
    console.error('OpenFDA API error:', error);
    throw error;
  }
}

/**
 * Get drug label by SPL ID or set ID
 */
export async function getDrugLabel(id: string): Promise<DrugLabel | null> {
  const queryParams = new URLSearchParams({
    search: `set_id:"${id}" OR spl_id:"${id}"`,
    limit: '1',
  });

  const url = buildUrl('/drug/label.json', queryParams);

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`OpenFDA API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const item = data.results?.[0];

    if (!item) return null;

    return {
      id: item.id || item.set_id,
      brandName: item.openfda?.brand_name?.[0] || 'Unknown',
      genericName: item.openfda?.generic_name?.[0] || '',
      manufacturer: item.openfda?.manufacturer_name?.[0] || 'Unknown Manufacturer',
      activeIngredients: item.active_ingredient || [],
      purpose: Array.isArray(item.purpose) ? item.purpose.join(' ') : item.purpose,
      indications: Array.isArray(item.indications_and_usage) ? item.indications_and_usage.join(' ') : item.indications_and_usage,
      warnings: Array.isArray(item.warnings) ? item.warnings.join(' ') : item.warnings,
      dosage: Array.isArray(item.dosage_and_administration) ? item.dosage_and_administration.join(' ') : item.dosage_and_administration,
      adverseReactions: Array.isArray(item.adverse_reactions) ? item.adverse_reactions.join(' ') : item.adverse_reactions,
      drugInteractions: Array.isArray(item.drug_interactions) ? item.drug_interactions.join(' ') : item.drug_interactions,
      pediatricUse: Array.isArray(item.pediatric_use) ? item.pediatric_use.join(' ') : item.pediatric_use,
      pregnancyCategory: item.pregnancy_category,
      storageHandling: Array.isArray(item.storage_and_handling) ? item.storage_and_handling.join(' ') : item.storage_and_handling,
      route: item.openfda?.route || [],
      productType: item.openfda?.product_type?.[0],
      ndc: item.openfda?.product_ndc || [],
      rxcui: item.openfda?.rxcui || [],
      splId: item.spl_id,
      effectiveDate: item.effective_time,
    };
  } catch (error) {
    console.error('OpenFDA API error:', error);
    throw error;
  }
}

/**
 * Search drug adverse events
 */
export async function searchAdverseEvents(params: {
  drugName?: string;
  reaction?: string;
  serious?: boolean;
  limit?: number;
  skip?: number;
}): Promise<DrugSearchResult<DrugAdverseEvent>> {
  const searchParts: string[] = [];

  if (params.drugName) {
    searchParts.push(`patient.drug.medicinalproduct:"${params.drugName}"`);
  }
  if (params.reaction) {
    searchParts.push(`patient.reaction.reactionmeddrapt:"${params.reaction}"`);
  }
  if (params.serious !== undefined) {
    searchParts.push(`serious:${params.serious ? '1' : '2'}`);
  }

  const queryParams = new URLSearchParams({
    search: searchParts.join(' AND ') || '_exists_:safetyreportid',
    limit: String(params.limit || 20),
    skip: String(params.skip || 0),
  });

  const url = buildUrl('/drug/event.json', queryParams);

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      return { results: [], totalCount: 0 };
    }

    if (!response.ok) {
      throw new Error(`OpenFDA API error: ${response.status}`);
    }

    const data = await response.json() as any;

    const results: DrugAdverseEvent[] = (data.results || []).map((item: any) => ({
      safetyReportId: item.safetyreportid,
      receiptDate: item.receiptdate,
      serious: item.serious === '1',
      seriousnessHospitalization: item.seriousnesshospitalization === '1',
      seriousnessLifeThreatening: item.seriousnesslifethreatening === '1',
      seriousnessDeath: item.seriousnessdeath === '1',
      patientAge: item.patient?.patientonsetage,
      patientAgeUnit: item.patient?.patientonsetageunit,
      patientSex: item.patient?.patientsex === '1' ? 'Male' : item.patient?.patientsex === '2' ? 'Female' : undefined,
      patientWeight: item.patient?.patientweight,
      drugs: (item.patient?.drug || []).map((d: any) => ({
        name: d.medicinalproduct,
        indication: d.drugindication,
        route: d.drugadministrationroute,
        dose: d.drugdosagetext,
      })),
      reactions: (item.patient?.reaction || []).map((r: any) => r.reactionmeddrapt),
      outcomes: item.patient?.reaction?.map((r: any) => r.reactionoutcome),
    }));

    return {
      results,
      totalCount: data.meta?.results?.total || results.length,
    };
  } catch (error) {
    console.error('OpenFDA API error:', error);
    throw error;
  }
}

/**
 * Search drug recalls
 */
export async function searchDrugRecalls(params: {
  query?: string;
  firm?: string;
  recallClass?: '1' | '2' | '3';
  status?: 'Ongoing' | 'Completed' | 'Terminated';
  limit?: number;
  skip?: number;
}): Promise<DrugSearchResult<DrugRecall>> {
  const searchParts: string[] = [];

  if (params.query) {
    searchParts.push(params.query);
  }
  if (params.firm) {
    searchParts.push(`recalling_firm:"${params.firm}"`);
  }
  if (params.recallClass) {
    searchParts.push(`classification:"Class ${params.recallClass}"`);
  }
  if (params.status) {
    searchParts.push(`status:"${params.status}"`);
  }

  const queryParams = new URLSearchParams({
    search: searchParts.join(' AND ') || '_exists_:recall_number',
    limit: String(params.limit || 20),
    skip: String(params.skip || 0),
    sort: 'report_date:desc',
  });

  const url = buildUrl('/drug/enforcement.json', queryParams);

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      return { results: [], totalCount: 0 };
    }

    if (!response.ok) {
      throw new Error(`OpenFDA API error: ${response.status}`);
    }

    const data = await response.json() as any;

    const results: DrugRecall[] = (data.results || []).map((item: any) => ({
      recallNumber: item.recall_number,
      recallInitiationDate: item.recall_initiation_date,
      reportDate: item.report_date,
      recallClass: item.classification,
      productDescription: item.product_description,
      reason: item.reason_for_recall,
      status: item.status,
      distribution: item.distribution_pattern,
      firm: item.recalling_firm,
      city: item.city,
      state: item.state,
      country: item.country,
      voluntaryMandated: item.voluntary_mandated,
    }));

    return {
      results,
      totalCount: data.meta?.results?.total || results.length,
    };
  } catch (error) {
    console.error('OpenFDA API error:', error);
    throw error;
  }
}

/**
 * Search for HIE-related medications
 */
export async function searchHIEMedications(options: {
  medicationType?: 'anticonvulsant' | 'neuroprotective' | 'analgesic' | 'all';
  limit?: number;
}): Promise<DrugSearchResult<DrugLabel>> {
  // Common medications used in HIE treatment
  const hieRelatedDrugs: Record<string, string[]> = {
    anticonvulsant: ['phenobarbital', 'levetiracetam', 'phenytoin', 'midazolam', 'lorazepam'],
    neuroprotective: ['erythropoietin', 'melatonin', 'magnesium sulfate', 'allopurinol'],
    analgesic: ['morphine', 'fentanyl', 'acetaminophen'],
    all: [
      'phenobarbital', 'levetiracetam', 'phenytoin', 'midazolam',
      'erythropoietin', 'melatonin', 'morphine', 'fentanyl'
    ],
  };

  const drugs = hieRelatedDrugs[options.medicationType || 'all'];
  const searchQuery = drugs.map(d => `openfda.generic_name:"${d}"`).join(' OR ');

  return searchDrugLabels({
    query: searchQuery,
    limit: options.limit || 20,
  });
}

/**
 * Get drug interactions for a specific drug
 */
export async function getDrugInteractions(drugName: string): Promise<{
  interactions: string | null;
  warnings: string | null;
}> {
  const result = await searchDrugLabels({
    genericName: drugName,
    limit: 1,
  });

  if (result.results.length === 0) {
    // Try brand name
    const brandResult = await searchDrugLabels({
      brandName: drugName,
      limit: 1,
    });

    if (brandResult.results.length === 0) {
      return { interactions: null, warnings: null };
    }

    return {
      interactions: brandResult.results[0].drugInteractions || null,
      warnings: brandResult.results[0].warnings || null,
    };
  }

  return {
    interactions: result.results[0].drugInteractions || null,
    warnings: result.results[0].warnings || null,
  };
}

export default {
  searchDrugLabels,
  getDrugLabel,
  searchAdverseEvents,
  searchDrugRecalls,
  searchHIEMedications,
  getDrugInteractions,
};
