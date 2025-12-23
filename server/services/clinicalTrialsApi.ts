/**
 * ClinicalTrials.gov API Service
 * Documentation: https://clinicaltrials.gov/data-api/api
 *
 * Provides access to clinical trial data from the U.S. National Library of Medicine
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://clinicaltrials.gov/api/v2';

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

/**
 * Parse the raw API response into our structured format
 */
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
  const locations: ClinicalTrialLocation[] = (contacts.locations || []).map((loc: any) => ({
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
  }));

  // Parse central contacts
  const centralContacts: ClinicalTrialContact[] = (contacts.centralContacts || []).map((c: any) => ({
    name: c.name,
    role: c.role,
    phone: c.phone,
    email: c.email,
  }));

  // Parse interventions
  const interventions: string[] = (arms.interventions || []).map((i: any) =>
    `${i.type}: ${i.name}`
  );

  return {
    nctId: identification.nctId || '',
    title: identification.briefTitle || identification.officialTitle || 'Untitled Study',
    officialTitle: identification.officialTitle,
    status: status.overallStatus || 'Unknown',
    phase: design.phases?.join(', ') || undefined,
    studyType: design.studyType,
    conditions: conditions.conditions || [],
    interventions,
    sponsor: sponsor.leadSponsor?.name || 'Unknown Sponsor',
    collaborators: (sponsor.collaborators || []).map((c: any) => c.name),
    locations,
    eligibility: {
      criteria: eligibility.eligibilityCriteria,
      gender: eligibility.sex,
      minAge: eligibility.minimumAge,
      maxAge: eligibility.maximumAge,
      healthyVolunteers: eligibility.healthyVolunteers === 'Yes',
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

/**
 * Search for clinical trials
 */
export async function searchClinicalTrials(
  params: ClinicalTrialsSearchParams
): Promise<ClinicalTrialsSearchResult> {
  const queryParams = new URLSearchParams();

  // Build query string
  const queryParts: string[] = [];
  if (params.condition) {
    queryParts.push(`CONDITION:${params.condition}`);
  }
  if (params.term) {
    queryParts.push(params.term);
  }
  if (queryParts.length > 0) {
    queryParams.set('query.term', queryParts.join(' AND '));
  }

  // Location filter
  if (params.location) {
    queryParams.set('query.locn', params.location);
  }

  // Status filter
  if (params.status && params.status.length > 0) {
    queryParams.set('filter.overallStatus', params.status.join(','));
  }

  // Phase filter
  if (params.phase && params.phase.length > 0) {
    queryParams.set('filter.phase', params.phase.join(','));
  }

  // Pagination
  queryParams.set('pageSize', String(params.pageSize || 10));
  if (params.pageToken) {
    queryParams.set('pageToken', params.pageToken);
  }

  // Sort
  if (params.sort) {
    queryParams.set('sort', params.sort);
  }

  // Request fields we need
  queryParams.set('fields', [
    'NCTId',
    'BriefTitle',
    'OfficialTitle',
    'OverallStatus',
    'Phase',
    'StudyType',
    'Condition',
    'InterventionName',
    'InterventionType',
    'LeadSponsorName',
    'CollaboratorName',
    'LocationFacility',
    'LocationCity',
    'LocationState',
    'LocationCountry',
    'LocationStatus',
    'CentralContactName',
    'CentralContactPhone',
    'CentralContactEMail',
    'EligibilityCriteria',
    'Gender',
    'MinimumAge',
    'MaximumAge',
    'HealthyVolunteers',
    'StartDate',
    'CompletionDate',
    'EnrollmentCount',
    'BriefSummary',
    'DetailedDescription',
    'LastUpdateSubmitDate',
  ].join(','));

  const url = `${BASE_URL}/studies?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      studies: (data.studies || []).map(parseStudy),
      totalCount: data.totalCount || 0,
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.error('ClinicalTrials.gov API error:', error);
    throw error;
  }
}

/**
 * Get a specific clinical trial by NCT ID
 */
export async function getClinicalTrial(nctId: string): Promise<ClinicalTrialStudy | null> {
  const url = `${BASE_URL}/studies/${nctId}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    return parseStudy(data);
  } catch (error) {
    console.error('ClinicalTrials.gov API error:', error);
    throw error;
  }
}

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
    'hypoxic ischemic encephalopathy',
    'HIE',
    'neonatal encephalopathy',
    'perinatal asphyxia',
    'cerebral palsy',
    'therapeutic hypothermia',
  ];

  const result = await searchClinicalTrials({
    condition: hieTerms.join(' OR '),
    location: options.location,
    status: options.status || ['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING'],
    pageSize: options.pageSize || 20,
  });

  // If child age is provided, filter and score by eligibility
  if (options.childAge !== undefined) {
    result.studies = result.studies.map(study => {
      // Add eligibility score based on age match
      const minAgeMonths = parseAgeToMonths(study.eligibility.minAge);
      const maxAgeMonths = parseAgeToMonths(study.eligibility.maxAge);

      let eligible = true;
      if (minAgeMonths !== null && options.childAge! < minAgeMonths) eligible = false;
      if (maxAgeMonths !== null && options.childAge! > maxAgeMonths) eligible = false;

      return {
        ...study,
        _eligibilityScore: eligible ? 100 : 50,
      };
    });

    // Sort by eligibility score
    result.studies.sort((a: any, b: any) => (b._eligibilityScore || 0) - (a._eligibilityScore || 0));
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
    case 'year': return value * 12;
    case 'month': return value;
    case 'week': return Math.floor(value / 4);
    case 'day': return Math.floor(value / 30);
    default: return null;
  }
}

export default {
  searchClinicalTrials,
  getClinicalTrial,
  searchHIETrials,
};
