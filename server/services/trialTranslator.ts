/**
 * Trial Translator Service
 * ========================
 * AI-powered translation and simplification of clinical trials
 * Supports 40+ languages with Georgian as primary
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import {
  trialTranslations,
  clinicalTrials,
  medicalGlossary,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const LANGUAGE_NAMES: Record<string, string> = {
  ka: "Georgian (ქართული)",
  hy: "Armenian (Հայdelays)",
  az: "Azerbaijani (Azərbaycan)",
  ru: "Russian (Русский)",
  uk: "Ukrainian (Українська)",
  kk: "Kazakh (Қазақша)",
  uz: "Uzbek (O'zbek)",
  tr: "Turkish (Türkçe)",
  de: "German (Deutsch)",
  fr: "French (Français)",
  es: "Spanish (Español)",
  pt: "Portuguese (Português)",
  it: "Italian (Italiano)",
  pl: "Polish (Polski)",
  nl: "Dutch (Nederlands)",
  he: "Hebrew (עברית)",
  ar: "Arabic (العربية)",
  fa: "Persian (فارسی)",
  hi: "Hindi (हिंदी)",
  bn: "Bengali (বাংলা)",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  zh: "Chinese (中文)",
};

export interface TranslationResult {
  titleTranslated: string;
  summaryTranslated: string;
  eligibilityTranslated?: string;
  simplifiedSummary: string;
  translationQuality: number;
}

export async function translateTrial(
  trialId: number,
  targetLanguage: string,
  forceRefresh: boolean = false
): Promise<TranslationResult | null> {
  if (targetLanguage === "en") return null;

  if (!forceRefresh) {
    const existing = await db
      .select()
      .from(trialTranslations)
      .where(
        and(
          eq(trialTranslations.trialId, trialId),
          eq(trialTranslations.languageCode, targetLanguage)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].titleTranslated) {
      return {
        titleTranslated: existing[0].titleTranslated,
        summaryTranslated: existing[0].summaryTranslated || "",
        eligibilityTranslated: existing[0].eligibilityTranslated || undefined,
        simplifiedSummary: existing[0].simplifiedSummary || "",
        translationQuality: existing[0].translationQuality || 0.9,
      };
    }
  }

  const trial = await db
    .select()
    .from(clinicalTrials)
    .where(eq(clinicalTrials.id, trialId))
    .limit(1);

  if (trial.length === 0) return null;

  const t = trial[0];
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const prompt = `You are a medical translator specializing in clinical trials. Translate the following clinical trial information from English to ${languageName}.

IMPORTANT RULES:
1. Use clear, simple language that a non-medical parent can understand
2. Keep medical terms but add simple explanations in parentheses
3. Maintain accuracy - never omit important safety information
4. Create a "simplified summary" that explains the trial in 2-3 sentences for parents

TRIAL INFORMATION:

Title: ${t.titleEn}

Brief Summary: ${t.briefSummaryEn || "Not provided"}

Eligibility Criteria: ${t.eligibilityCriteriaEn || "Not provided"}

Phase: ${t.phase || "Not specified"}
Status: ${t.status || "Unknown"}
Conditions: ${(t.conditions as string[])?.join(", ") || "Not specified"}

Please provide the translation in this exact JSON format:
{
  "titleTranslated": "translated title",
  "summaryTranslated": "translated brief summary", 
  "eligibilityTranslated": "translated eligibility criteria",
  "simplifiedSummary": "2-3 sentence explanation for parents in plain language"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as TranslationResult;
    parsed.translationQuality = 0.95;

    await db
      .insert(trialTranslations)
      .values({
        trialId,
        languageCode: targetLanguage,
        titleTranslated: parsed.titleTranslated,
        summaryTranslated: parsed.summaryTranslated,
        eligibilityTranslated: parsed.eligibilityTranslated,
        simplifiedSummary: parsed.simplifiedSummary,
        translationQuality: parsed.translationQuality,
        translatedBy: "ai",
      })
      .onConflictDoUpdate({
        target: [trialTranslations.trialId, trialTranslations.languageCode],
        set: {
          titleTranslated: parsed.titleTranslated,
          summaryTranslated: parsed.summaryTranslated,
          eligibilityTranslated: parsed.eligibilityTranslated,
          simplifiedSummary: parsed.simplifiedSummary,
          translationQuality: parsed.translationQuality,
          translatedAt: new Date(),
        },
      });

    return parsed;
  } catch (error) {
    console.error(`[Translator] Error translating trial ${trialId}:`, error);
    return null;
  }
}

export async function translateText(
  text: string,
  targetLanguage: string,
  context: string = "medical"
): Promise<string> {
  if (!text || targetLanguage === "en") return text;

  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Translate the following ${context} text to ${languageName}. Keep it simple and clear. Only respond with the translation, nothing else.

Text: ${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text;
    }
    return text;
  } catch (error) {
    console.error("[Translator] Error:", error);
    return text;
  }
}

export async function getGlossaryTerm(
  termEnglish: string,
  languageCode: string
): Promise<{ term: string; definition?: string } | null> {
  const term = await db
    .select()
    .from(medicalGlossary)
    .where(
      and(
        eq(medicalGlossary.termEnglish, termEnglish.toLowerCase()),
        eq(medicalGlossary.languageCode, languageCode)
      )
    )
    .limit(1);

  if (term.length === 0) return null;

  return {
    term: term[0].termTranslated,
    definition: term[0].definitionTranslated || undefined,
  };
}

export async function addGlossaryTerm(
  termEnglish: string,
  languageCode: string,
  termTranslated: string,
  definitionTranslated?: string,
  category?: string
): Promise<void> {
  await db
    .insert(medicalGlossary)
    .values({
      termEnglish: termEnglish.toLowerCase(),
      languageCode,
      termTranslated,
      definitionTranslated,
      category,
      verified: false,
    })
    .onConflictDoNothing();
}

export async function batchTranslateTrials(
  trialIds: number[],
  targetLanguage: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const trialId of trialIds) {
    try {
      const result = await translateTrial(trialId, targetLanguage);
      if (result) success++;
      else failed++;

      await new Promise((r) => setTimeout(r, 500));
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

export async function seedGeorgianGlossary(): Promise<void> {
  const terms = [
    { en: "hypoxic-ischemic encephalopathy", ka: "ჰიპოქსიურ-იშემიური ენცეფალოპათია", def: "ტვინის დაზიანება ჟანგბადის და სისხლის მიწოდების ნაკლებობით", cat: "disease" },
    { en: "HIE", ka: "ჰიე", def: "ჰიპოქსიურ-იშემიური ენცეფალოპათია (შემოკლება)", cat: "disease" },
    { en: "therapeutic hypothermia", ka: "თერაპიული ჰიპოთერმია", def: "სხეულის გაციება მკურნალობის მიზნით", cat: "treatment" },
    { en: "clinical trial", ka: "კლინიკური კვლევა", def: "სამედიცინო კვლევა პაციენტებზე", cat: "procedure" },
    { en: "randomized", ka: "რანდომიზებული", def: "შემთხვევითი შერჩევის პრინციპით", cat: "procedure" },
    { en: "placebo", ka: "პლაცებო", def: "მოჩვენებითი წამალი, რომელიც აქტიურ ნივთიერებას არ შეიცავს", cat: "treatment" },
    { en: "stem cell", ka: "ღეროვანი უჯრედი", def: "უჯრედი, რომელსაც შეუძლია სხვადასხვა ტიპის უჯრედად გადაქცევა", cat: "treatment" },
    { en: "neonatal", ka: "ნეონატალური", def: "ახალშობილთან დაკავშირებული (პირველი 28 დღე)", cat: "anatomy" },
    { en: "cerebral palsy", ka: "ცერებრალური დამბლა", def: "ტვინის დაზიანებით გამოწვეული მოძრაობის დარღვევა", cat: "disease" },
    { en: "erythropoietin", ka: "ერითროპოეტინი", def: "ჰორმონი, რომელიც ხელს უწყობს წითელი უჯრედების წარმოებას", cat: "treatment" },
    { en: "MRI", ka: "მაგნიტურ-რეზონანსული ტომოგრაფია", def: "ტვინის გამოსახულების მიღების მეთოდი", cat: "procedure" },
    { en: "EEG", ka: "ელექტროენცეფალოგრაფია", def: "ტვინის ელექტრული აქტივობის ჩაწერა", cat: "procedure" },
    { en: "recruiting", ka: "მონაწილეებს იღებს", def: "კვლევა აქტიურად იღებს ახალ მონაწილეებს", cat: "procedure" },
    { en: "phase I", ka: "ფაზა I", def: "უსაფრთხოების შემოწმება მცირე ჯგუფზე", cat: "procedure" },
    { en: "phase II", ka: "ფაზა II", def: "ეფექტურობის შემოწმება საშუალო ჯგუფზე", cat: "procedure" },
    { en: "phase III", ka: "ფაზა III", def: "ფართომასშტაბიანი კვლევა დიდ ჯგუფზე", cat: "procedure" },
  ];

  for (const term of terms) {
    await addGlossaryTerm(term.en, "ka", term.ka, term.def, term.cat);
  }

  console.log("[Translator] Georgian medical glossary seeded");
}
