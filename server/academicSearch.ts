export interface AcademicPaper {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  publicationDate?: string;
  year?: number;
  journal?: string;
  doi?: string;
  url?: string;
  citationCount?: number;
  openAccessUrl?: string;
  concepts?: string[];
  fields?: string[];
  source: "openalex" | "semantic_scholar" | "pubmed";
}

export interface AcademicSearchResult {
  papers: AcademicPaper[];
  query: string;
  totalResults: number;
  source: string;
  crossDisciplinaryMatches?: AcademicPaper[];
}

export interface UnifiedAcademicSearchResult {
  papers: AcademicPaper[];
  query: string;
  sources: string[];
  totalResults: number;
  crossDisciplinaryInsights?: {
    field: string;
    relevantPapers: AcademicPaper[];
    potentialApplications: string[];
  }[];
}

interface OpenAlexWork {
  id: string;
  title: string;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: { author: { display_name: string } }[];
  publication_date?: string;
  publication_year?: number;
  primary_location?: {
    source?: { display_name: string };
  };
  doi?: string;
  open_access?: {
    oa_url?: string;
    is_oa?: boolean;
  };
  cited_by_count?: number;
  concepts?: { display_name: string; score: number }[];
  topics?: { display_name: string; score: number }[];
}

interface OpenAlexResponse {
  results: OpenAlexWork[];
  meta: {
    count: number;
    page: number;
    per_page: number;
  };
}

// ==================== მულტიდისციპლინური კონფიგურაცია ====================
// Comprehensive Multidisciplinary Configuration for HIE Research

export interface DisciplineConfig {
  name: string;
  nameKa: string;
  category: "clinical" | "support" | "research" | "traditional" | "crossDisciplinary";
  searchTerms: string[];
  hieSpecificTerms: string[];
  potentialApplications: string[];
}

// სამედიცინო კლინიკური სპეციალობები (Medical Clinical Specialties)
export const MEDICAL_CLINICAL_DISCIPLINES: Record<string, DisciplineConfig> = {
  neonatology: {
    name: "Neonatology",
    nameKa: "ნეონატოლოგია",
    category: "clinical",
    searchTerms: ["neonatology", "neonatal intensive care", "NICU", "newborn care", "perinatal medicine"],
    hieSpecificTerms: ["neonatal HIE", "birth asphyxia", "therapeutic hypothermia", "cooling therapy", "neonatal seizures"],
    potentialApplications: [
      "Early intervention protocols for HIE",
      "Hypothermia treatment optimization",
      "Neonatal monitoring techniques",
      "NICU best practices for brain injury",
    ],
  },
  pediatricNeurology: {
    name: "Pediatric Neurology",
    nameKa: "პედიატრიული ნევროლოგია",
    category: "clinical",
    searchTerms: ["pediatric neurology", "child neurology", "developmental neurology", "neuropediatrics"],
    hieSpecificTerms: ["neonatal encephalopathy", "brain injury outcomes", "neurological development", "cerebral palsy prevention"],
    potentialApplications: [
      "Neurological assessment protocols",
      "Long-term outcome prediction",
      "Seizure management in HIE",
      "Developmental trajectory monitoring",
    ],
  },
  neuroradiology: {
    name: "Neuroradiology",
    nameKa: "ნეირორადიოლოგია",
    category: "clinical",
    searchTerms: ["neuroradiology", "brain imaging", "neuroimaging", "MRI brain", "diffusion imaging"],
    hieSpecificTerms: ["MRI HIE patterns", "diffusion weighted imaging", "brain injury biomarkers", "prognostic imaging"],
    potentialApplications: [
      "Early detection of brain injury severity",
      "Prognostic biomarker identification",
      "Treatment response monitoring",
      "Personalized therapy planning",
    ],
  },
  neurophysiology: {
    name: "Neurophysiology",
    nameKa: "ნეიროფიზიოლოგია",
    category: "clinical",
    searchTerms: ["neurophysiology", "EEG", "aEEG", "amplitude-integrated EEG", "brain function monitoring"],
    hieSpecificTerms: ["seizure detection", "background pattern", "burst suppression", "sleep-wake cycling"],
    potentialApplications: [
      "Continuous brain monitoring",
      "Seizure prediction and detection",
      "Recovery pattern analysis",
      "Prognostic EEG markers",
    ],
  },
  rehabilitationMedicine: {
    name: "Physical Medicine & Rehabilitation",
    nameKa: "რეაბილიტაცია/ფიზიკური მედიცინა",
    category: "clinical",
    searchTerms: ["physical medicine", "rehabilitation", "physiotherapy", "physical therapy", "motor rehabilitation"],
    hieSpecificTerms: ["Vojta therapy", "Bobath concept", "CME-Medek", "early intervention", "motor development"],
    potentialApplications: [
      "Evidence-based therapy protocols",
      "Intensive rehabilitation outcomes",
      "Motor function optimization",
      "Family-centered intervention",
    ],
  },
  developmentalPediatrics: {
    name: "Developmental Pediatrics",
    nameKa: "განვითარების პედიატრია",
    category: "clinical",
    searchTerms: ["developmental pediatrics", "child development", "developmental milestones", "early childhood development"],
    hieSpecificTerms: ["developmental delay", "neurodevelopmental outcomes", "early intervention", "developmental screening"],
    potentialApplications: [
      "Milestone tracking and prediction",
      "Early intervention timing",
      "Developmental support strategies",
      "Family guidance protocols",
    ],
  },
  ophthalmology: {
    name: "Ophthalmology",
    nameKa: "ოფთალმოლოგია",
    category: "support",
    searchTerms: ["ophthalmology", "pediatric ophthalmology", "visual development", "cortical visual impairment"],
    hieSpecificTerms: ["CVI", "visual cortex injury", "visual pathway damage", "visual rehabilitation"],
    potentialApplications: [
      "Visual function assessment",
      "Early vision intervention",
      "Cortical visual impairment therapy",
      "Visual stimulation protocols",
    ],
  },
  audiology: {
    name: "Audiology",
    nameKa: "აუდიოლოგია",
    category: "support",
    searchTerms: ["audiology", "hearing development", "auditory processing", "pediatric hearing"],
    hieSpecificTerms: ["auditory neuropathy", "hearing loss HIE", "auditory brainstem response", "cochlear function"],
    potentialApplications: [
      "Hearing screening protocols",
      "Auditory intervention strategies",
      "Communication development support",
      "Assistive technology integration",
    ],
  },
  speechPathology: {
    name: "Speech-Language Pathology",
    nameKa: "ლოგოპედია",
    category: "support",
    searchTerms: ["speech pathology", "speech therapy", "language development", "swallowing disorders", "dysphagia"],
    hieSpecificTerms: ["feeding difficulties", "oral motor development", "communication intervention", "AAC"],
    potentialApplications: [
      "Early feeding intervention",
      "Communication system development",
      "Oral motor therapy",
      "Family communication training",
    ],
  },
  occupationalTherapy: {
    name: "Occupational Therapy",
    nameKa: "ოკუპაციური თერაპია",
    category: "support",
    searchTerms: ["occupational therapy", "sensory integration", "fine motor development", "daily living skills"],
    hieSpecificTerms: ["sensory processing", "adaptive equipment", "functional skills", "play-based intervention"],
    potentialApplications: [
      "Sensory integration therapy",
      "Adaptive skill development",
      "Environmental modification",
      "Family activity training",
    ],
  },
  regenerativeMedicine: {
    name: "Regenerative Medicine",
    nameKa: "რეგენერაციული მედიცინა",
    category: "research",
    searchTerms: ["regenerative medicine", "stem cell therapy", "cell therapy", "tissue regeneration", "cord blood"],
    hieSpecificTerms: ["MSC therapy HIE", "umbilical cord blood", "neural stem cells", "Duke EAP", "autologous cells"],
    potentialApplications: [
      "Stem cell treatment protocols",
      "Cord blood banking and use",
      "Neural regeneration strategies",
      "Clinical trial identification",
    ],
  },
  neuropharmacology: {
    name: "Neuropharmacology",
    nameKa: "ნეიროფარმაკოლოგია",
    category: "research",
    searchTerms: ["neuropharmacology", "neuroprotection", "neuroprotective agents", "brain pharmacology"],
    hieSpecificTerms: ["erythropoietin HIE", "melatonin neuroprotection", "xenon therapy", "magnesium sulfate"],
    potentialApplications: [
      "Neuroprotective drug identification",
      "Adjunct therapy optimization",
      "Drug timing and dosing",
      "Combination therapy approaches",
    ],
  },
  neuroimmunology: {
    name: "Neuroimmunology",
    nameKa: "ნეიროიმუნოლოგია",
    category: "research",
    searchTerms: ["neuroimmunology", "neuroinflammation", "brain inflammation", "immune response brain"],
    hieSpecificTerms: ["microglial activation", "cytokine response", "inflammatory cascade", "anti-inflammatory therapy"],
    potentialApplications: [
      "Inflammation monitoring",
      "Anti-inflammatory interventions",
      "Immune modulation therapy",
      "Biomarker development",
    ],
  },
  nutritionalNeuroscience: {
    name: "Nutritional Neuroscience",
    nameKa: "კვებითი ნევრომეცნიერება",
    category: "research",
    searchTerms: ["nutritional neuroscience", "brain nutrition", "DHA", "omega-3 fatty acids", "neuroprotective nutrition"],
    hieSpecificTerms: ["breast milk brain", "lipid supplementation", "micronutrient neuroprotection", "ketogenic diet"],
    potentialApplications: [
      "Nutritional supplementation protocols",
      "Breast milk optimization",
      "DHA/EPA dosing strategies",
      "Metabolic support therapy",
    ],
  },
  geneticsEpigenetics: {
    name: "Genetics & Epigenetics",
    nameKa: "გენეტიკა/ეპიგენეტიკა",
    category: "research",
    searchTerms: ["genetics", "epigenetics", "gene expression", "pharmacogenomics", "gene therapy"],
    hieSpecificTerms: ["genetic susceptibility HIE", "epigenetic modification", "gene therapy brain", "CRISPR neurology"],
    potentialApplications: [
      "Genetic risk assessment",
      "Personalized treatment selection",
      "Gene therapy potential",
      "Epigenetic intervention",
    ],
  },
  neuropsychology: {
    name: "Neuropsychology",
    nameKa: "ნეიროფსიქოლოგია",
    category: "support",
    searchTerms: ["neuropsychology", "cognitive assessment", "neurocognitive development", "brain-behavior"],
    hieSpecificTerms: ["cognitive outcomes HIE", "executive function development", "memory development", "attention disorders"],
    potentialApplications: [
      "Cognitive assessment protocols",
      "Early cognitive intervention",
      "Educational planning",
      "Family cognitive training",
    ],
  },
};

// ტრადიციული/ხალხური მედიცინა (Traditional/Folk Medicine)
export const TRADITIONAL_MEDICINE_DISCIPLINES: Record<string, DisciplineConfig> = {
  acupuncture: {
    name: "Acupuncture",
    nameKa: "აკუპუნქტურა",
    category: "traditional",
    searchTerms: ["acupuncture", "electroacupuncture", "scalp acupuncture", "pediatric acupuncture"],
    hieSpecificTerms: ["acupuncture cerebral palsy", "acupuncture brain injury", "acupuncture neuroprotection", "Jin's three-needle"],
    potentialApplications: [
      "Complementary motor therapy",
      "Pain management",
      "Neurological stimulation",
      "Muscle tone regulation",
    ],
  },
  traditionalChineseMedicine: {
    name: "Traditional Chinese Medicine",
    nameKa: "ტრადიციული ჩინური მედიცინა (TCM)",
    category: "traditional",
    searchTerms: ["traditional Chinese medicine", "TCM", "Chinese herbal medicine", "Chinese medicine pediatric"],
    hieSpecificTerms: ["TCM brain injury", "Chinese herbs neuroprotection", "Qi circulation brain", "TCM rehabilitation"],
    potentialApplications: [
      "Herbal neuroprotective formulas",
      "Energy balance restoration",
      "Complementary rehabilitation",
      "Holistic wellness support",
    ],
  },
  ayurveda: {
    name: "Ayurveda",
    nameKa: "აიურვედა",
    category: "traditional",
    searchTerms: ["Ayurveda", "Ayurvedic medicine", "Panchakarma", "Ayurvedic herbs", "Rasayana"],
    hieSpecificTerms: ["Ayurveda brain", "Medhya Rasayana", "Brahmi", "Ashwagandha neuroprotection", "Shirodhara"],
    potentialApplications: [
      "Herbal neuroprotective compounds",
      "Detoxification protocols",
      "Nervous system rejuvenation",
      "Holistic developmental support",
    ],
  },
  kampoMedicine: {
    name: "Kampo Medicine",
    nameKa: "კამპო მედიცინა",
    category: "traditional",
    searchTerms: ["Kampo", "Japanese herbal medicine", "Kampo formulas", "Japanese traditional medicine"],
    hieSpecificTerms: ["Kampo neuroprotection", "Japanese herbs brain", "Kampo pediatric", "Kampo rehabilitation"],
    potentialApplications: [
      "Evidence-based herbal formulas",
      "Complementary neuroprotection",
      "Immune system support",
      "Recovery enhancement",
    ],
  },
  tibetanMedicine: {
    name: "Tibetan Medicine",
    nameKa: "ტიბეტური მედიცინა",
    category: "traditional",
    searchTerms: ["Tibetan medicine", "Sowa-Rigpa", "Tibetan herbs", "Tibetan healing"],
    hieSpecificTerms: ["Tibetan medicine brain", "Tibetan neuroprotection", "energy healing pediatric"],
    potentialApplications: [
      "Holistic healing approaches",
      "Mind-body integration",
      "Herbal compound research",
      "Energy balance therapy",
    ],
  },
  koreanMedicine: {
    name: "Korean Medicine",
    nameKa: "კორეული მედიცინა",
    category: "traditional",
    searchTerms: ["Korean medicine", "Korean traditional medicine", "Sasang", "Korean acupuncture", "moxibustion"],
    hieSpecificTerms: ["Korean medicine brain", "Sasang constitution", "Korean herbs neuroprotection"],
    potentialApplications: [
      "Constitutional treatment approach",
      "Moxibustion therapy",
      "Herbal compound research",
      "Personalized traditional treatment",
    ],
  },
  homeopathy: {
    name: "Homeopathy",
    nameKa: "ჰომეოპათია",
    category: "traditional",
    searchTerms: ["homeopathy", "homeopathic medicine", "homeopathic treatment", "potentized remedies"],
    hieSpecificTerms: ["homeopathy brain injury", "homeopathy cerebral palsy", "homeopathic neuroprotection"],
    potentialApplications: [
      "Complementary supportive care",
      "Constitutional treatment",
      "Gentle intervention approach",
      "Family wellness support",
    ],
  },
  naturopathy: {
    name: "Naturopathy",
    nameKa: "ნატუროპათია",
    category: "traditional",
    searchTerms: ["naturopathy", "naturopathic medicine", "natural medicine", "holistic medicine"],
    hieSpecificTerms: ["naturopathy brain", "natural neuroprotection", "holistic pediatric care", "integrative neurology"],
    potentialApplications: [
      "Natural healing protocols",
      "Nutritional optimization",
      "Lifestyle medicine integration",
      "Complementary care coordination",
    ],
  },
  anthroposophicMedicine: {
    name: "Anthroposophic Medicine",
    nameKa: "ანთროპოსოფიული მედიცინა",
    category: "traditional",
    searchTerms: ["anthroposophic medicine", "Steiner medicine", "Weleda", "eurythmy therapy"],
    hieSpecificTerms: ["anthroposophic neurology", "eurythmy rehabilitation", "rhythmical massage", "artistic therapy"],
    potentialApplications: [
      "Artistic therapy integration",
      "Rhythmical movement therapy",
      "Holistic developmental support",
      "Body-soul-spirit integration",
    ],
  },
  phytotherapy: {
    name: "Phytotherapy",
    nameKa: "ფიტოთერაპია",
    category: "traditional",
    searchTerms: ["phytotherapy", "herbal medicine", "botanical medicine", "medicinal plants"],
    hieSpecificTerms: ["neuroprotective herbs", "herbal brain", "botanical neuroprotection", "plant medicine pediatric"],
    potentialApplications: [
      "Evidence-based herbal compounds",
      "Natural neuroprotective agents",
      "Antioxidant herbal therapy",
      "Complementary brain support",
    ],
  },
  osteopathy: {
    name: "Osteopathy",
    nameKa: "ოსტეოპათია",
    category: "traditional",
    searchTerms: ["osteopathy", "osteopathic medicine", "cranial osteopathy", "pediatric osteopathy"],
    hieSpecificTerms: ["cranial osteopathy infant", "osteopathy brain injury", "osteopathic manipulation pediatric"],
    potentialApplications: [
      "Cranial manipulation therapy",
      "Structural alignment",
      "Nervous system regulation",
      "Complementary motor therapy",
    ],
  },
  craniosacralTherapy: {
    name: "Craniosacral Therapy",
    nameKa: "კრანიოსაკრალური თერაპია",
    category: "traditional",
    searchTerms: ["craniosacral therapy", "CST", "craniosacral treatment", "cranial rhythm"],
    hieSpecificTerms: ["craniosacral infant", "CST brain injury", "craniosacral cerebral palsy", "craniosacral pediatric"],
    potentialApplications: [
      "Gentle cranial manipulation",
      "Nervous system calming",
      "Cerebrospinal fluid dynamics",
      "Complementary infant therapy",
    ],
  },
  aromatherapy: {
    name: "Aromatherapy",
    nameKa: "არომათერაპია",
    category: "traditional",
    searchTerms: ["aromatherapy", "essential oils", "aromatic medicine", "olfactory therapy"],
    hieSpecificTerms: ["essential oils brain", "aromatherapy neuroprotection", "lavender calming", "sensory stimulation"],
    potentialApplications: [
      "Sensory stimulation protocols",
      "Calming and relaxation",
      "Sleep improvement",
      "Complementary sensory therapy",
    ],
  },
  musicTherapy: {
    name: "Music Therapy",
    nameKa: "მუსიკოთერაპია",
    category: "traditional",
    searchTerms: ["music therapy", "sound therapy", "neurologic music therapy", "acoustic stimulation"],
    hieSpecificTerms: ["music therapy brain injury", "sound stimulation infant", "auditory stimulation NICU", "rhythm therapy"],
    potentialApplications: [
      "Auditory brain stimulation",
      "Rhythmic entrainment therapy",
      "Developmental music intervention",
      "Parent-infant bonding through music",
    ],
  },
  hyperbaricOxygen: {
    name: "Hyperbaric Oxygen Therapy",
    nameKa: "ჰიპერბარული ოქსიგენოთერაპია (HBOT)",
    category: "traditional",
    searchTerms: ["hyperbaric oxygen", "HBOT", "oxygen therapy", "hyperbaric medicine"],
    hieSpecificTerms: ["HBOT brain injury", "hyperbaric cerebral palsy", "oxygen therapy neuroprotection", "HBOT pediatric"],
    potentialApplications: [
      "Oxygen-enhanced brain recovery",
      "Neuroplasticity promotion",
      "Tissue healing acceleration",
      "Complementary rehabilitation",
    ],
  },
  massageTherapy: {
    name: "Massage Therapy",
    nameKa: "მასაჟი თერაპია",
    category: "traditional",
    searchTerms: ["massage therapy", "infant massage", "therapeutic massage", "pediatric massage"],
    hieSpecificTerms: ["infant massage development", "massage cerebral palsy", "tactile stimulation", "touch therapy NICU"],
    potentialApplications: [
      "Tactile stimulation protocols",
      "Parent-infant bonding",
      "Muscle tone regulation",
      "Relaxation and comfort",
    ],
  },
  reflexology: {
    name: "Reflexology",
    nameKa: "რეფლექსოლოგია",
    category: "traditional",
    searchTerms: ["reflexology", "zone therapy", "foot reflexology", "reflex therapy"],
    hieSpecificTerms: ["reflexology pediatric", "reflexology neurological", "foot massage infant"],
    potentialApplications: [
      "Complementary relaxation therapy",
      "Sensory stimulation",
      "Circulation enhancement",
      "Holistic wellness support",
    ],
  },
  chiropractic: {
    name: "Chiropractic",
    nameKa: "ქიროპრაქტიკა",
    category: "traditional",
    searchTerms: ["chiropractic", "spinal manipulation", "pediatric chiropractic", "subluxation"],
    hieSpecificTerms: ["chiropractic pediatric neurology", "spinal alignment infant", "chiropractic cerebral palsy"],
    potentialApplications: [
      "Spinal alignment therapy",
      "Nervous system optimization",
      "Complementary motor therapy",
      "Postural support",
    ],
  },
  yogaTherapy: {
    name: "Yoga Therapy",
    nameKa: "იოგა თერაპია",
    category: "traditional",
    searchTerms: ["yoga therapy", "pediatric yoga", "therapeutic yoga", "yoga rehabilitation"],
    hieSpecificTerms: ["yoga cerebral palsy", "yoga developmental delay", "yoga neuroplasticity", "parent-child yoga"],
    potentialApplications: [
      "Movement therapy integration",
      "Breathing exercises",
      "Mind-body coordination",
      "Family wellness practice",
    ],
  },
  aquaticTherapy: {
    name: "Aquatic Therapy",
    nameKa: "აკვათერაპია",
    category: "traditional",
    searchTerms: ["aquatic therapy", "hydrotherapy", "water therapy", "aquatic rehabilitation"],
    hieSpecificTerms: ["aquatic therapy cerebral palsy", "hydrotherapy infant", "water rehabilitation pediatric"],
    potentialApplications: [
      "Low-impact movement therapy",
      "Muscle relaxation",
      "Sensory integration",
      "Motor skill development",
    ],
  },
};

// კროს-დისციპლინური მიმართულებები (Cross-Disciplinary - არასამედიცინო)
export const CROSS_DISCIPLINARY_SCIENCES: Record<string, DisciplineConfig> = {
  physics: {
    name: "Physics",
    nameKa: "ფიზიკა",
    category: "crossDisciplinary",
    searchTerms: ["physics", "biophysics", "medical physics", "optical physics"],
    hieSpecificTerms: ["photobiomodulation", "transcranial stimulation", "magnetic stimulation", "ultrasound therapy"],
    potentialApplications: [
      "Photobiomodulation therapy",
      "Magnetic stimulation techniques",
      "Ultrasound-based delivery",
      "Optical brain monitoring",
    ],
  },
  engineering: {
    name: "Biomedical Engineering",
    nameKa: "ბიოსამედიცინო ინჟინერია",
    category: "crossDisciplinary",
    searchTerms: ["biomedical engineering", "neural engineering", "rehabilitation engineering", "medical devices"],
    hieSpecificTerms: ["brain-computer interface", "neural prosthetics", "assistive technology", "robotic rehabilitation"],
    potentialApplications: [
      "Assistive device development",
      "Robotic therapy systems",
      "Brain monitoring devices",
      "Wearable sensors",
    ],
  },
  materialsScience: {
    name: "Materials Science",
    nameKa: "მასალათმცოდნეობა",
    category: "crossDisciplinary",
    searchTerms: ["materials science", "biomaterials", "nanomaterials", "drug delivery systems"],
    hieSpecificTerms: ["nanoparticle brain", "drug delivery CNS", "neural scaffold", "biocompatible implant"],
    potentialApplications: [
      "Nanoparticle drug delivery",
      "Neural tissue scaffolds",
      "Biocompatible materials",
      "Targeted therapy delivery",
    ],
  },
  artificialIntelligence: {
    name: "Artificial Intelligence",
    nameKa: "ხელოვნური ინტელექტი",
    category: "crossDisciplinary",
    searchTerms: ["artificial intelligence", "machine learning", "deep learning", "AI healthcare"],
    hieSpecificTerms: ["AI diagnosis brain", "machine learning prognosis", "AI rehabilitation", "predictive modeling HIE"],
    potentialApplications: [
      "Predictive outcome modeling",
      "Personalized treatment AI",
      "Diagnostic assistance",
      "Therapy optimization",
    ],
  },
  systemsBiology: {
    name: "Systems Biology",
    nameKa: "სისტემური ბიოლოგია",
    category: "crossDisciplinary",
    searchTerms: ["systems biology", "network biology", "computational biology", "omics integration"],
    hieSpecificTerms: ["brain network analysis", "multi-omics brain", "systems neuroscience", "pathway analysis"],
    potentialApplications: [
      "Network-based drug discovery",
      "Multi-target therapy design",
      "Biomarker panel development",
      "Personalized medicine",
    ],
  },
};

// ყველა დისციპლინის გაერთიანება
export const ALL_DISCIPLINES: Record<string, DisciplineConfig> = {
  ...MEDICAL_CLINICAL_DISCIPLINES,
  ...TRADITIONAL_MEDICINE_DISCIPLINES,
  ...CROSS_DISCIPLINARY_SCIENCES,
};

// დისციპლინების სიები კატეგორიების მიხედვით
export const DISCIPLINE_CATEGORIES = {
  clinical: Object.keys(MEDICAL_CLINICAL_DISCIPLINES).filter(
    (k) => MEDICAL_CLINICAL_DISCIPLINES[k].category === "clinical"
  ),
  support: Object.keys(MEDICAL_CLINICAL_DISCIPLINES).filter(
    (k) => MEDICAL_CLINICAL_DISCIPLINES[k].category === "support"
  ),
  research: Object.keys(MEDICAL_CLINICAL_DISCIPLINES).filter(
    (k) => MEDICAL_CLINICAL_DISCIPLINES[k].category === "research"
  ),
  traditional: Object.keys(TRADITIONAL_MEDICINE_DISCIPLINES),
  crossDisciplinary: Object.keys(CROSS_DISCIPLINARY_SCIENCES),
};

// ყველა დისციპლინის სახელების სია ძიებისთვის
export function getAllDisciplineSearchTerms(): string[] {
  return Object.values(ALL_DISCIPLINES).flatMap((d) => [...d.searchTerms, ...d.hieSpecificTerms]);
}

export function getDisciplinesByCategory(category: DisciplineConfig["category"]): DisciplineConfig[] {
  return Object.values(ALL_DISCIPLINES).filter((d) => d.category === category);
}

export function getDisciplineApplications(disciplineKey: string): string[] {
  return ALL_DISCIPLINES[disciplineKey]?.potentialApplications || [];
}

function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | undefined {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
    return undefined;
  }

  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }

  words.sort((a, b) => a[1] - b[1]);
  return words.map(([word]) => word).join(" ");
}

function mapOpenAlexToPaper(work: OpenAlexWork): AcademicPaper {
  return {
    id: work.id,
    title: work.title || "Untitled",
    abstract: reconstructAbstract(work.abstract_inverted_index),
    authors: work.authorships?.map((a) => a.author.display_name) || [],
    publicationDate: work.publication_date,
    year: work.publication_year,
    journal: work.primary_location?.source?.display_name,
    doi: work.doi,
    url: work.doi ? `https://doi.org/${work.doi.replace("https://doi.org/", "")}` : undefined,
    citationCount: work.cited_by_count,
    openAccessUrl: work.open_access?.oa_url,
    concepts: work.concepts?.slice(0, 10).map((c) => c.display_name) || [],
    fields: work.topics?.slice(0, 5).map((t) => t.display_name) || [],
    source: "openalex",
  };
}

export async function searchOpenAlex(
  query: string,
  options: {
    maxResults?: number;
    yearFrom?: number;
    yearTo?: number;
    openAccessOnly?: boolean;
    sortBy?: "relevance" | "cited_by_count" | "publication_date";
  } = {}
): Promise<AcademicSearchResult> {
  const { maxResults = 25, yearFrom, yearTo, openAccessOnly = false, sortBy = "relevance" } = options;

  try {
    const params = new URLSearchParams();
    params.set("search", query);
    params.set("per_page", maxResults.toString());

    const filters: string[] = [];

    if (yearFrom) {
      filters.push(`publication_year:>${yearFrom - 1}`);
    }
    if (yearTo) {
      filters.push(`publication_year:<${yearTo + 1}`);
    }
    if (openAccessOnly) {
      filters.push("open_access.is_oa:true");
    }

    if (filters.length > 0) {
      params.set("filter", filters.join(","));
    }

    if (sortBy === "cited_by_count") {
      params.set("sort", "cited_by_count:desc");
    } else if (sortBy === "publication_date") {
      params.set("sort", "publication_date:desc");
    }

    params.set("mailto", "hie-command-center@replit.app");

    const url = `https://api.openalex.org/works?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "HIE-Parent-Command-Center/1.0 (mailto:hie-command-center@replit.app)",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAlex API error: ${response.status} - ${errorText}`);
      return {
        papers: [],
        query,
        totalResults: 0,
        source: "OpenAlex",
      };
    }

    const data: OpenAlexResponse = await response.json();

    const papers = data.results.map(mapOpenAlexToPaper);

    return {
      papers,
      query,
      totalResults: data.meta.count,
      source: "OpenAlex",
    };
  } catch (error) {
    console.error("OpenAlex search error:", error);
    return {
      papers: [],
      query,
      totalResults: 0,
      source: "OpenAlex",
    };
  }
}

export async function searchOpenAlexCrossDisciplinary(
  medicalQuery: string,
  targetDisciplines: string[] = ["physics", "engineering", "mathematics", "computer science", "materials science"],
  maxResultsPerDiscipline: number = 10
): Promise<AcademicSearchResult> {
  const allPapers: AcademicPaper[] = [];

  const crossDisciplinaryQueries = targetDisciplines.map((discipline) => {
    const conceptualQuery = extractCoreConceptsForCrossDisciplinary(medicalQuery);
    return `${conceptualQuery} ${discipline}`;
  });

  const searchPromises = crossDisciplinaryQueries.map((q) =>
    searchOpenAlex(q, {
      maxResults: maxResultsPerDiscipline,
      sortBy: "relevance",
    })
  );

  const results = await Promise.all(searchPromises);

  for (const result of results) {
    allPapers.push(...result.papers);
  }

  const uniquePapers = deduplicatePapers(allPapers);

  return {
    papers: uniquePapers,
    query: medicalQuery,
    totalResults: uniquePapers.length,
    source: "OpenAlex (Cross-Disciplinary)",
    crossDisciplinaryMatches: uniquePapers,
  };
}

function extractCoreConceptsForCrossDisciplinary(medicalQuery: string): string {
  const medicalToUniversalConcepts: Record<string, string[]> = {
    "hypoxic-ischemic encephalopathy": ["oxygen deprivation", "cellular damage", "neuroprotection", "recovery"],
    "hie": ["hypoxia", "ischemia", "brain injury", "neural repair"],
    "neuroprotection": ["protection mechanisms", "damage prevention", "cellular repair"],
    "neuroplasticity": ["plasticity", "adaptation", "reorganization", "learning"],
    "hypothermia": ["cooling", "temperature regulation", "thermal protection"],
    "rehabilitation": ["recovery", "restoration", "adaptation", "training"],
    "stem cell": ["regeneration", "cell therapy", "tissue repair"],
    "brain injury": ["neural damage", "repair mechanisms", "recovery"],
    "seizure": ["electrical activity", "signal patterns", "control mechanisms"],
    "cerebral palsy": ["motor control", "movement patterns", "coordination"],
    "therapy": ["treatment", "intervention", "improvement"],
    "developmental delay": ["development", "growth patterns", "milestones"],
  };

  let conceptualQuery = medicalQuery.toLowerCase();

  for (const [medical, universal] of Object.entries(medicalToUniversalConcepts)) {
    if (conceptualQuery.includes(medical)) {
      conceptualQuery = universal.join(" OR ");
      break;
    }
  }

  return conceptualQuery;
}

function deduplicatePapers(papers: AcademicPaper[]): AcademicPaper[] {
  const seen = new Set<string>();
  return papers.filter((paper) => {
    const key = paper.doi || paper.title.toLowerCase().substring(0, 100);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  authors?: { name: string }[];
  publicationDate?: string;
  year?: number;
  venue?: string;
  externalIds?: { DOI?: string };
  url?: string;
  citationCount?: number;
  isOpenAccess?: boolean;
  openAccessPdf?: { url: string };
  fieldsOfStudy?: string[];
}

interface SemanticScholarResponse {
  total: number;
  data: SemanticScholarPaper[];
}

function mapSemanticScholarToPaper(paper: SemanticScholarPaper): AcademicPaper {
  return {
    id: paper.paperId,
    title: paper.title || "Untitled",
    abstract: paper.abstract,
    authors: paper.authors?.map((a) => a.name) || [],
    publicationDate: paper.publicationDate,
    year: paper.year,
    journal: paper.venue,
    doi: paper.externalIds?.DOI,
    url: paper.url || (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : undefined),
    citationCount: paper.citationCount,
    openAccessUrl: paper.openAccessPdf?.url,
    fields: paper.fieldsOfStudy || [],
    source: "semantic_scholar",
  };
}

export async function searchSemanticScholar(
  query: string,
  options: {
    maxResults?: number;
    yearFrom?: number;
    yearTo?: number;
    openAccessOnly?: boolean;
    fieldsOfStudy?: string[];
  } = {}
): Promise<AcademicSearchResult> {
  const { maxResults = 25, yearFrom, yearTo, openAccessOnly = false, fieldsOfStudy } = options;

  try {
    const params = new URLSearchParams();
    params.set("query", query);
    params.set("limit", maxResults.toString());
    params.set(
      "fields",
      "paperId,title,abstract,authors,publicationDate,year,venue,externalIds,url,citationCount,isOpenAccess,openAccessPdf,fieldsOfStudy"
    );

    if (yearFrom || yearTo) {
      const yearFilter = `${yearFrom || 1900}-${yearTo || new Date().getFullYear()}`;
      params.set("year", yearFilter);
    }

    if (openAccessOnly) {
      params.set("openAccessPdf", "");
    }

    if (fieldsOfStudy && fieldsOfStudy.length > 0) {
      params.set("fieldsOfStudy", fieldsOfStudy.join(","));
    }

    const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Semantic Scholar API error: ${response.status} - ${errorText}`);
      return {
        papers: [],
        query,
        totalResults: 0,
        source: "Semantic Scholar",
      };
    }

    const data: SemanticScholarResponse = await response.json();

    if (!data || !data.data || !Array.isArray(data.data)) {
      return {
        papers: [],
        query,
        totalResults: 0,
        source: "Semantic Scholar",
      };
    }

    const papers = data.data.map(mapSemanticScholarToPaper);

    return {
      papers,
      query,
      totalResults: data.total,
      source: "Semantic Scholar",
    };
  } catch (error) {
    console.error("Semantic Scholar search error:", error);
    return {
      papers: [],
      query,
      totalResults: 0,
      source: "Semantic Scholar",
    };
  }
}

export async function searchSemanticScholarRecommendations(
  paperIds: string[],
  maxResults: number = 20
): Promise<AcademicPaper[]> {
  if (paperIds.length === 0) {
    return [];
  }

  try {
    const recommendations: AcademicPaper[] = [];

    for (const paperId of paperIds.slice(0, 3)) {
      const url = `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paperId}?limit=${Math.ceil(maxResults / paperIds.length)}&fields=paperId,title,abstract,authors,year,venue,citationCount,fieldsOfStudy`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recommendedPapers) {
          recommendations.push(...data.recommendedPapers.map(mapSemanticScholarToPaper));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return deduplicatePapers(recommendations);
  } catch (error) {
    console.error("Semantic Scholar recommendations error:", error);
    return [];
  }
}

export async function searchAcademicSources(
  query: string,
  options: {
    maxResults?: number;
    yearFrom?: number;
    yearTo?: number;
    openAccessOnly?: boolean;
    includeCrossDisciplinary?: boolean;
    targetDisciplines?: string[];
  } = {}
): Promise<UnifiedAcademicSearchResult> {
  const {
    maxResults = 20,
    yearFrom,
    yearTo,
    openAccessOnly = false,
    includeCrossDisciplinary = true,
    targetDisciplines = ["physics", "engineering", "mathematics", "computer science"],
  } = options;

  const searchPromises: Promise<AcademicSearchResult>[] = [
    searchOpenAlex(query, { maxResults, yearFrom, yearTo, openAccessOnly, sortBy: "relevance" }),
    searchSemanticScholar(query, { maxResults, yearFrom, yearTo, openAccessOnly }),
  ];

  if (includeCrossDisciplinary) {
    searchPromises.push(
      searchOpenAlexCrossDisciplinary(query, targetDisciplines, Math.ceil(maxResults / targetDisciplines.length))
    );
  }

  const results = await Promise.all(searchPromises);

  const allPapers: AcademicPaper[] = [];
  const sources: string[] = [];

  for (const result of results) {
    if (result.papers.length > 0) {
      allPapers.push(...result.papers);
      if (!sources.includes(result.source)) {
        sources.push(result.source);
      }
    }
  }

  const uniquePapers = deduplicatePapers(allPapers);

  uniquePapers.sort((a, b) => {
    const aScore = (a.citationCount || 0) * 0.7 + (a.year || 2000) * 0.3;
    const bScore = (b.citationCount || 0) * 0.7 + (b.year || 2000) * 0.3;
    return bScore - aScore;
  });

  const crossDisciplinaryInsights = includeCrossDisciplinary
    ? extractCrossDisciplinaryInsights(uniquePapers, targetDisciplines)
    : undefined;

  return {
    papers: uniquePapers.slice(0, maxResults * 2),
    query,
    sources,
    totalResults: uniquePapers.length,
    crossDisciplinaryInsights,
  };
}

function extractCrossDisciplinaryInsights(
  papers: AcademicPaper[],
  targetDisciplines: string[]
): {
  field: string;
  relevantPapers: AcademicPaper[];
  potentialApplications: string[];
}[] {
  const insights: {
    field: string;
    relevantPapers: AcademicPaper[];
    potentialApplications: string[];
  }[] = [];

  for (const discipline of targetDisciplines) {
    const relevantPapers = papers.filter((paper) => {
      const fieldsLower = (paper.fields || []).map((f) => f.toLowerCase());
      const conceptsLower = (paper.concepts || []).map((c) => c.toLowerCase());
      const allTerms = [...fieldsLower, ...conceptsLower];
      return allTerms.some((term) => term.includes(discipline.toLowerCase()));
    });

    if (relevantPapers.length > 0) {
      insights.push({
        field: discipline,
        relevantPapers: relevantPapers.slice(0, 5),
        potentialApplications: generatePotentialApplications(discipline, relevantPapers),
      });
    }
  }

  return insights;
}

function generatePotentialApplications(discipline: string, papers: AcademicPaper[]): string[] {
  // First check if discipline exists in ALL_DISCIPLINES
  const disciplineLower = discipline.toLowerCase();
  
  // Try to find the discipline in the comprehensive config
  for (const [key, config] of Object.entries(ALL_DISCIPLINES)) {
    if (key.toLowerCase() === disciplineLower || 
        config.name.toLowerCase() === disciplineLower ||
        config.searchTerms.some(t => t.toLowerCase() === disciplineLower)) {
      return config.potentialApplications;
    }
  }
  
  // Fallback legacy mappings for backwards compatibility
  const legacyApplications: Record<string, string[]> = {
    physics: [
      "Magnetic stimulation techniques for neural repair",
      "Ultrasound-based therapeutic delivery",
      "Biophysical modeling of brain injury recovery",
      "Optical imaging for monitoring neural activity",
    ],
    engineering: [
      "Biomedical device development for therapy",
      "Signal processing for brain monitoring",
      "Robotic rehabilitation systems",
      "Wearable sensors for progress tracking",
    ],
    mathematics: [
      "Predictive modeling of treatment outcomes",
      "Statistical analysis of recovery patterns",
      "Optimization of therapy schedules",
      "Network analysis of neural connectivity",
    ],
    "computer science": [
      "AI-assisted diagnosis and prognosis",
      "Machine learning for treatment optimization",
      "Digital therapeutics and apps",
      "Data-driven personalized medicine",
    ],
    "materials science": [
      "Biocompatible materials for implants",
      "Drug delivery systems",
      "Neural interface materials",
      "Tissue engineering scaffolds",
    ],
  };

  return legacyApplications[disciplineLower] || [
    `Potential applications from ${discipline} research`,
  ];
}

export function formatAcademicResultsForAI(result: UnifiedAcademicSearchResult): string {
  if (result.papers.length === 0) {
    return "No academic papers found.";
  }

  let formatted = `Found ${result.totalResults} papers from: ${result.sources.join(", ")}\n\n`;

  formatted += "## Key Papers\n\n";
  for (const paper of result.papers.slice(0, 10)) {
    formatted += `### ${paper.title}\n`;
    formatted += `- Authors: ${paper.authors.slice(0, 3).join(", ")}${paper.authors.length > 3 ? " et al." : ""}\n`;
    formatted += `- Year: ${paper.year || "N/A"} | Citations: ${paper.citationCount || 0}\n`;
    if (paper.journal) {
      formatted += `- Journal: ${paper.journal}\n`;
    }
    if (paper.abstract) {
      formatted += `- Abstract: ${paper.abstract.substring(0, 300)}...\n`;
    }
    if (paper.url) {
      formatted += `- URL: ${paper.url}\n`;
    }
    formatted += "\n";
  }

  if (result.crossDisciplinaryInsights && result.crossDisciplinaryInsights.length > 0) {
    formatted += "\n## Cross-Disciplinary Insights\n\n";
    for (const insight of result.crossDisciplinaryInsights) {
      formatted += `### ${insight.field}\n`;
      formatted += `Found ${insight.relevantPapers.length} relevant papers\n`;
      formatted += "Potential applications:\n";
      for (const app of insight.potentialApplications) {
        formatted += `- ${app}\n`;
      }
      formatted += "\n";
    }
  }

  return formatted;
}
