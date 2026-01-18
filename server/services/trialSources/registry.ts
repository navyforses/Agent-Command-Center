/**
 * Trial Registry Interface
 * ========================
 * Base interface for clinical trial registry adapters
 * Enables unified multi-registry aggregation
 */

export interface TrialRegistrySource {
  name: string;
  code: string;
  apiEndpoint?: string;
  supportedLanguages: string[];
}

export interface RegistrySearchParams {
  query: string;
  pageSize?: number;
  page?: number;
  status?: string[];
  phase?: string[];
}

export interface RegistryTrial {
  registryId: string;
  registrySource: string;
  title: string;
  briefSummary?: string;
  phase?: string;
  status?: string;
  sponsor?: string;
  startDate?: string;
  completionDate?: string;
  conditions?: string[];
  locations?: any[];
  eligibility?: any;
  gender?: string;
  minimumAge?: string;
  maximumAge?: string;
  url?: string;
}

export interface RegistrySearchResult {
  trials: RegistryTrial[];
  totalCount: number;
  source: string;
}

export interface ITrialRegistry {
  readonly source: TrialRegistrySource;
  search(params: RegistrySearchParams): Promise<RegistrySearchResult>;
  getById(id: string): Promise<RegistryTrial | null>;
}

/**
 * Registry Sources Configuration
 * Add new registries here as they are implemented
 */
export const REGISTRY_SOURCES: TrialRegistrySource[] = [
  {
    name: "ClinicalTrials.gov",
    code: "nct",
    apiEndpoint: "https://clinicaltrials.gov/api/v2",
    supportedLanguages: ["en"],
  },
  {
    name: "EU Clinical Trials Register",
    code: "euctr",
    apiEndpoint: "https://www.clinicaltrialsregister.eu/ctr-search/rest",
    supportedLanguages: ["en", "de", "fr", "es", "it", "nl", "pl"],
  },
  {
    name: "WHO ICTRP",
    code: "ictrp",
    apiEndpoint: "https://trialsearch.who.int/api",
    supportedLanguages: ["en"],
  },
  {
    name: "Japan Registry of Clinical Trials",
    code: "jrct",
    apiEndpoint: "https://jrct.niph.go.jp/en-search",
    supportedLanguages: ["en", "ja"],
  },
  {
    name: "Chinese Clinical Trial Registry",
    code: "chictr",
    apiEndpoint: "http://www.chictr.org.cn/searchproj.aspx",
    supportedLanguages: ["en", "zh"],
  },
  {
    name: "Australian New Zealand Clinical Trials Registry",
    code: "anzctr",
    apiEndpoint: "https://anzctr.org.au/TrialSearch.aspx",
    supportedLanguages: ["en"],
  },
  {
    name: "German Clinical Trials Register",
    code: "drks",
    apiEndpoint: "https://drks.de/drks_web/",
    supportedLanguages: ["en", "de"],
  },
  {
    name: "Netherlands Trial Register",
    code: "ntr",
    apiEndpoint: "https://trialsearch.nl/",
    supportedLanguages: ["en", "nl"],
  },
  {
    name: "Indian Clinical Trials Registry",
    code: "ctri",
    apiEndpoint: "http://ctri.nic.in/Clinicaltrials/advancesearchmain.php",
    supportedLanguages: ["en"],
  },
  {
    name: "Brazilian Clinical Trials Registry",
    code: "rebec",
    apiEndpoint: "http://www.ensaiosclinicos.gov.br/",
    supportedLanguages: ["en", "pt"],
  },
];

/**
 * Get registry source by code
 */
export function getRegistryByCode(code: string): TrialRegistrySource | undefined {
  return REGISTRY_SOURCES.find((r) => r.code === code);
}

/**
 * Get all active registry sources
 */
export function getActiveRegistries(): TrialRegistrySource[] {
  return REGISTRY_SOURCES;
}
