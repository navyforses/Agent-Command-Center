/**
 * PROMETHEUS Phase 3: Multi-language Knowledge Base
 *
 * Automatic and human-verified translation system for medical knowledge,
 * with special focus on Georgian language support and medical terminology.
 *
 * "ცოდნას საზღვრები არ აქვს - ენა ხიდია, არა ბარიერი"
 * "Knowledge has no borders - language is a bridge, not a barrier"
 */

import { db } from "../../db";
import {
  prometheusTranslations,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusSharedKnowledge,
  type InsertPrometheusTranslation,
  type PrometheusTranslation,
} from "@shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// ============================================================================
// Types
// ============================================================================

export type SupportedLanguage = "en" | "ka" | "ru" | "de" | "fr" | "es";

export interface TranslationRequest {
  sourceType: "memory" | "knowledge_node" | "shared_knowledge" | "insight";
  sourceId: number;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  text: string;
  context?: string;
  medicalDomain?: string;
}

export interface TranslationResult {
  translatedText: string;
  qualityScore: number;
  medicalTermsFound: string[];
  warnings?: string[];
}

export interface MedicalTerm {
  term: string;
  translations: Record<SupportedLanguage, string>;
  definition?: string;
  category: string;
}

// ============================================================================
// Medical Terminology Dictionary
// ============================================================================

// Core HIE and pediatric neurology terms with verified translations
const MEDICAL_TERMINOLOGY: MedicalTerm[] = [
  {
    term: "Hypoxic-Ischemic Encephalopathy",
    translations: {
      en: "Hypoxic-Ischemic Encephalopathy",
      ka: "ჰიპოქსიურ-იშემიური ენცეფალოპათია",
      ru: "Гипоксически-ишемическая энцефалопатия",
      de: "Hypoxisch-ischämische Enzephalopathie",
      fr: "Encéphalopathie hypoxique-ischémique",
      es: "Encefalopatía hipóxico-isquémica",
    },
    definition: "Brain injury caused by lack of oxygen and blood flow",
    category: "condition",
  },
  {
    term: "HIE",
    translations: {
      en: "HIE",
      ka: "ჰიე",
      ru: "ГИЭ",
      de: "HIE",
      fr: "EHI",
      es: "EHI",
    },
    category: "abbreviation",
  },
  {
    term: "therapeutic hypothermia",
    translations: {
      en: "therapeutic hypothermia",
      ka: "თერაპიული ჰიპოთერმია",
      ru: "терапевтическая гипотермия",
      de: "therapeutische Hypothermie",
      fr: "hypothermie thérapeutique",
      es: "hipotermia terapéutica",
    },
    definition: "Cooling treatment to protect the brain",
    category: "treatment",
  },
  {
    term: "seizure",
    translations: {
      en: "seizure",
      ka: "კრუნჩხვა",
      ru: "судороги",
      de: "Krampfanfall",
      fr: "crise épileptique",
      es: "convulsión",
    },
    category: "symptom",
  },
  {
    term: "cerebral palsy",
    translations: {
      en: "cerebral palsy",
      ka: "ცერებრალური დამბლა",
      ru: "церебральный паралич",
      de: "Zerebralparese",
      fr: "paralysie cérébrale",
      es: "parálisis cerebral",
    },
    category: "condition",
  },
  {
    term: "neurodevelopmental delay",
    translations: {
      en: "neurodevelopmental delay",
      ka: "ნეიროგანვითარების დაყოვნება",
      ru: "задержка нервно-психического развития",
      de: "neurologische Entwicklungsverzögerung",
      fr: "retard neurodéveloppemental",
      es: "retraso del neurodesarrollo",
    },
    category: "condition",
  },
  {
    term: "MRI",
    translations: {
      en: "MRI",
      ka: "მრტ",
      ru: "МРТ",
      de: "MRT",
      fr: "IRM",
      es: "RMN",
    },
    category: "diagnostic",
  },
  {
    term: "EEG",
    translations: {
      en: "EEG",
      ka: "ეეგ",
      ru: "ЭЭГ",
      de: "EEG",
      fr: "EEG",
      es: "EEG",
    },
    category: "diagnostic",
  },
  {
    term: "physical therapy",
    translations: {
      en: "physical therapy",
      ka: "ფიზიკური თერაპია",
      ru: "физиотерапия",
      de: "Physiotherapie",
      fr: "kinésithérapie",
      es: "fisioterapia",
    },
    category: "treatment",
  },
  {
    term: "occupational therapy",
    translations: {
      en: "occupational therapy",
      ka: "ოკუპაციური თერაპია",
      ru: "эрготерапия",
      de: "Ergotherapie",
      fr: "ergothérapie",
      es: "terapia ocupacional",
    },
    category: "treatment",
  },
  {
    term: "speech therapy",
    translations: {
      en: "speech therapy",
      ka: "მეტყველების თერაპია",
      ru: "логопедия",
      de: "Sprachtherapie",
      fr: "orthophonie",
      es: "logopedia",
    },
    category: "treatment",
  },
  {
    term: "neuroprotection",
    translations: {
      en: "neuroprotection",
      ka: "ნეიროპროტექცია",
      ru: "нейропротекция",
      de: "Neuroprotektion",
      fr: "neuroprotection",
      es: "neuroprotección",
    },
    category: "treatment",
  },
  {
    term: "neuroplasticity",
    translations: {
      en: "neuroplasticity",
      ka: "ნეიროპლასტიურობა",
      ru: "нейропластичность",
      de: "Neuroplastizität",
      fr: "neuroplasticité",
      es: "neuroplasticidad",
    },
    category: "concept",
  },
  {
    term: "white matter injury",
    translations: {
      en: "white matter injury",
      ka: "თეთრი ნივთიერების დაზიანება",
      ru: "повреждение белого вещества",
      de: "Schädigung der weißen Substanz",
      fr: "lésion de la substance blanche",
      es: "lesión de la sustancia blanca",
    },
    category: "condition",
  },
  {
    term: "basal ganglia",
    translations: {
      en: "basal ganglia",
      ka: "ბაზალური განგლიები",
      ru: "базальные ганглии",
      de: "Basalganglien",
      fr: "ganglions de la base",
      es: "ganglios basales",
    },
    category: "anatomy",
  },
  {
    term: "Apgar score",
    translations: {
      en: "Apgar score",
      ka: "აპგარის ქულა",
      ru: "оценка по шкале Апгар",
      de: "Apgar-Score",
      fr: "score d'Apgar",
      es: "puntuación de Apgar",
    },
    category: "diagnostic",
  },
  {
    term: "anticonvulsant",
    translations: {
      en: "anticonvulsant",
      ka: "ანტიკონვულსანტი",
      ru: "противосудорожное средство",
      de: "Antikonvulsivum",
      fr: "anticonvulsivant",
      es: "anticonvulsivo",
    },
    category: "medication",
  },
  {
    term: "cord blood",
    translations: {
      en: "cord blood",
      ka: "ჭიპლარის სისხლი",
      ru: "пуповинная кровь",
      de: "Nabelschnurblut",
      fr: "sang de cordon",
      es: "sangre de cordón",
    },
    category: "treatment",
  },
  {
    term: "stem cell therapy",
    translations: {
      en: "stem cell therapy",
      ka: "ღეროვანი უჯრედების თერაპია",
      ru: "терапия стволовыми клетками",
      de: "Stammzelltherapie",
      fr: "thérapie par cellules souches",
      es: "terapia con células madre",
    },
    category: "treatment",
  },
  {
    term: "erythropoietin",
    translations: {
      en: "erythropoietin",
      ka: "ერითროპოეტინი",
      ru: "эритропоэтин",
      de: "Erythropoetin",
      fr: "érythropoïétine",
      es: "eritropoyetina",
    },
    category: "medication",
  },
];

// ============================================================================
// Translation Engine
// ============================================================================

/**
 * Initialize AI clients for translation
 */
function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/**
 * Get language name in English
 */
function getLanguageName(code: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    en: "English",
    ka: "Georgian",
    ru: "Russian",
    de: "German",
    fr: "French",
    es: "Spanish",
  };
  return names[code];
}

/**
 * Find medical terms in text and get their translations
 */
export function findMedicalTerms(
  text: string,
  sourceLanguage: SupportedLanguage
): Array<{ term: MedicalTerm; found: string }> {
  const found: Array<{ term: MedicalTerm; found: string }> = [];
  const lowerText = text.toLowerCase();

  for (const term of MEDICAL_TERMINOLOGY) {
    const sourceTerm = term.translations[sourceLanguage]?.toLowerCase();
    if (sourceTerm && lowerText.includes(sourceTerm)) {
      found.push({ term, found: sourceTerm });
    }
  }

  return found;
}

/**
 * Replace medical terms with verified translations
 */
function applyTerminologyTranslations(
  text: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage
): { text: string; replacements: number } {
  let result = text;
  let replacements = 0;

  for (const term of MEDICAL_TERMINOLOGY) {
    const sourceTerm = term.translations[sourceLanguage];
    const targetTerm = term.translations[targetLanguage];

    if (sourceTerm && targetTerm) {
      // Case-insensitive replacement preserving original case pattern
      const regex = new RegExp(sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const newResult = result.replace(regex, targetTerm);

      if (newResult !== result) {
        result = newResult;
        replacements++;
      }
    }
  }

  return { text: result, replacements };
}

/**
 * Translate text using AI with medical context
 */
export async function translateWithAI(
  request: TranslationRequest
): Promise<TranslationResult> {
  const openai = getOpenAIClient();
  const gemini = getGeminiClient();

  if (!openai && !gemini) {
    throw new Error("No AI translation service available");
  }

  // Find medical terms in source text
  const medicalTerms = findMedicalTerms(request.text, request.sourceLanguage);

  // Build translation prompt
  const systemPrompt = `You are a medical translator specializing in pediatric neurology and neonatal conditions.
Translate the following text from ${getLanguageName(request.sourceLanguage)} to ${getLanguageName(request.targetLanguage)}.

Important guidelines:
1. Maintain medical accuracy - use proper medical terminology
2. Preserve the meaning and tone of the original
3. If the target is Georgian (ka), use proper Georgian medical terms
4. Do not translate proper nouns (drug brand names, institution names)
5. Keep abbreviations in their standard form for the target language

${request.medicalDomain ? `Medical domain context: ${request.medicalDomain}` : ""}
${request.context ? `Additional context: ${request.context}` : ""}

Known medical terms in this text (use these translations):
${medicalTerms.map(t => `- ${t.term.translations[request.sourceLanguage]} → ${t.term.translations[request.targetLanguage]}`).join("\n")}`;

  let translatedText = "";
  let qualityScore = 0.8;

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.text },
        ],
        temperature: 0.3,
      });

      translatedText = response.choices[0]?.message?.content || "";
      qualityScore = 0.85;
    } catch (error) {
      console.error("OpenAI translation failed:", error);
    }
  }

  if (!translatedText && gemini) {
    try {
      const result = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `${systemPrompt}\n\nText to translate:\n${request.text}`,
      });
      translatedText = result.text || "";
      qualityScore = 0.8;
    } catch (error) {
      console.error("Gemini translation failed:", error);
    }
  }

  if (!translatedText) {
    throw new Error("Translation failed with all available services");
  }

  // Apply verified terminology translations
  const { text: finalText, replacements } = applyTerminologyTranslations(
    translatedText,
    request.sourceLanguage,
    request.targetLanguage
  );

  // Boost quality score if we used verified terminology
  if (replacements > 0) {
    qualityScore = Math.min(0.95, qualityScore + replacements * 0.02);
  }

  return {
    translatedText: finalText,
    qualityScore,
    medicalTermsFound: medicalTerms.map(t => t.term.term),
    warnings: medicalTerms.length === 0 ? ["No known medical terms found - manual review recommended"] : undefined,
  };
}

// ============================================================================
// Translation Storage & Retrieval
// ============================================================================

/**
 * Translate and store a translation
 */
export async function createTranslation(
  request: TranslationRequest,
  translatedBy: string = "system"
): Promise<PrometheusTranslation> {
  // Check for existing translation
  const existing = await db.query.prometheusTranslations.findFirst({
    where: and(
      eq(prometheusTranslations.sourceType, request.sourceType),
      eq(prometheusTranslations.sourceId, request.sourceId),
      eq(prometheusTranslations.targetLanguage, request.targetLanguage)
    ),
  });

  if (existing) {
    // Return existing translation
    return existing;
  }

  // Perform translation
  const result = await translateWithAI(request);

  // Store translation
  const [translation] = await db
    .insert(prometheusTranslations)
    .values({
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      originalText: request.text,
      translatedText: result.translatedText,
      translationMethod: translatedBy === "system" ? "ai_auto" : "human",
      translatedBy,
      qualityScore: result.qualityScore,
      medicalTermsVerified: result.medicalTermsFound.length > 0,
      metadata: {
        medicalTermsFound: result.medicalTermsFound,
        warnings: result.warnings,
      },
    })
    .returning();

  return translation;
}

/**
 * Get translation for a source
 */
export async function getTranslation(
  sourceType: string,
  sourceId: number,
  targetLanguage: SupportedLanguage
): Promise<PrometheusTranslation | null> {
  return db.query.prometheusTranslations.findFirst({
    where: and(
      eq(prometheusTranslations.sourceType, sourceType),
      eq(prometheusTranslations.sourceId, sourceId),
      eq(prometheusTranslations.targetLanguage, targetLanguage)
    ),
  });
}

/**
 * Get all translations for a source
 */
export async function getAllTranslations(
  sourceType: string,
  sourceId: number
): Promise<PrometheusTranslation[]> {
  return db.query.prometheusTranslations.findMany({
    where: and(
      eq(prometheusTranslations.sourceType, sourceType),
      eq(prometheusTranslations.sourceId, sourceId)
    ),
  });
}

/**
 * Update/verify a translation
 */
export async function verifyTranslation(
  translationId: number,
  verifiedBy: string,
  correctedText?: string
): Promise<PrometheusTranslation | null> {
  const updates: Partial<InsertPrometheusTranslation> & { verifiedAt: Date; qualityScore: number } = {
    verifiedBy,
    verifiedAt: new Date(),
    translationMethod: "human_verified",
    qualityScore: 0.95,
  };

  if (correctedText) {
    updates.translatedText = correctedText;
  }

  const [updated] = await db
    .update(prometheusTranslations)
    .set(updates)
    .where(eq(prometheusTranslations.id, translationId))
    .returning();

  return updated || null;
}

// ============================================================================
// Batch Translation
// ============================================================================

/**
 * Translate all content for a Prometheus instance to a target language
 */
export async function translatePrometheusContent(
  prometheusId: number,
  targetLanguage: SupportedLanguage,
  sourceLanguage: SupportedLanguage = "en"
): Promise<{
  memoriesTranslated: number;
  nodesTranslated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let memoriesTranslated = 0;
  let nodesTranslated = 0;

  // Translate memories
  const memories = await db.query.prometheusMemory.findMany({
    where: eq(prometheusMemory.prometheusId, prometheusId),
  });

  for (const memory of memories) {
    try {
      // Check if already translated
      const existing = await getTranslation("memory", memory.id, targetLanguage);
      if (existing) continue;

      await createTranslation({
        sourceType: "memory",
        sourceId: memory.id,
        sourceLanguage,
        targetLanguage,
        text: memory.content,
        context: memory.context ?? undefined,
        medicalDomain: memory.domain ?? undefined,
      });

      memoriesTranslated++;
    } catch (error) {
      errors.push(`Memory ${memory.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Translate knowledge nodes
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
  });

  for (const node of nodes) {
    try {
      const existing = await getTranslation("knowledge_node", node.id, targetLanguage);
      if (existing) continue;

      const text = `${node.label}: ${node.description || ""}`;

      await createTranslation({
        sourceType: "knowledge_node",
        sourceId: node.id,
        sourceLanguage,
        targetLanguage,
        text,
        medicalDomain: node.nodeType ?? undefined,
      });

      nodesTranslated++;
    } catch (error) {
      errors.push(`Node ${node.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { memoriesTranslated, nodesTranslated, errors };
}

/**
 * Get content with translation
 */
export async function getMemoryWithTranslation(
  memoryId: number,
  language: SupportedLanguage
): Promise<{
  content: string;
  contentKa?: string;
  translation?: PrometheusTranslation;
} | null> {
  const memory = await db.query.prometheusMemory.findFirst({
    where: eq(prometheusMemory.id, memoryId),
  });

  if (!memory) return null;

  // If Georgian is requested and we have native Georgian content
  if (language === "ka" && memory.contentKa) {
    return {
      content: memory.content,
      contentKa: memory.contentKa,
    };
  }

  // Try to get translation
  const translation = await getTranslation("memory", memoryId, language);

  return {
    content: memory.content,
    contentKa: memory.contentKa ?? undefined,
    translation: translation ?? undefined,
  };
}

// ============================================================================
// Medical Dictionary API
// ============================================================================

/**
 * Get medical term translation
 */
export function getMedicalTermTranslation(
  term: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage
): string | null {
  const found = MEDICAL_TERMINOLOGY.find(
    t => t.translations[sourceLanguage]?.toLowerCase() === term.toLowerCase()
  );

  return found?.translations[targetLanguage] ?? null;
}

/**
 * Search medical terminology dictionary
 */
export function searchMedicalTerms(
  query: string,
  language: SupportedLanguage = "en"
): MedicalTerm[] {
  const lowerQuery = query.toLowerCase();

  return MEDICAL_TERMINOLOGY.filter(term => {
    const translation = term.translations[language]?.toLowerCase();
    return translation?.includes(lowerQuery) || term.term.toLowerCase().includes(lowerQuery);
  });
}

/**
 * Get all terms by category
 */
export function getMedicalTermsByCategory(category: string): MedicalTerm[] {
  return MEDICAL_TERMINOLOGY.filter(t => t.category === category);
}

/**
 * Get translation quality statistics
 */
export async function getTranslationStats(): Promise<{
  totalTranslations: number;
  byLanguage: Record<string, number>;
  humanVerified: number;
  averageQuality: number;
}> {
  const translations = await db.query.prometheusTranslations.findMany();

  const byLanguage: Record<string, number> = {};
  let humanVerified = 0;
  let totalQuality = 0;

  for (const t of translations) {
    byLanguage[t.targetLanguage] = (byLanguage[t.targetLanguage] || 0) + 1;
    if (t.translationMethod === "human_verified") humanVerified++;
    totalQuality += t.qualityScore ?? 0;
  }

  return {
    totalTranslations: translations.length,
    byLanguage,
    humanVerified,
    averageQuality: translations.length > 0 ? totalQuality / translations.length : 0,
  };
}
