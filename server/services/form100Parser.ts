/**
 * Form 100 Parser Service
 * =======================
 * ქართული სამედიცინო ფორმა 100-ის დამუშავება
 *
 * Features:
 * - PDF/Image text extraction
 * - AI-powered Georgian medical document parsing
 * - Patient profile creation from extracted data
 */

import { openai, AI_MODEL } from "../openai";
import { extractTextFromPDF, extractTextFromImage } from "../documentProcessor";
import { db } from "../db";
import { patientProfiles, documents, researchMonitors } from "@shared/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface PersonalInfo {
  fullName: string | null;
  birthDate: string | null; // YYYY-MM-DD
  gender: "male" | "female" | null;
  personalNumber: string | null;
}

export interface MedicalInfo {
  primaryDiagnosis: string | null;
  icd10Codes: string[];
  secondaryDiagnoses: string[];
  diagnosisDate: string | null; // YYYY-MM-DD
}

export interface PhysicianInfo {
  name: string | null;
  institution: string | null;
}

export interface DisabilityInfo {
  status: string | null;
  group: string | null;
}

export interface ConfidenceScores {
  overall: number;
  fields: {
    fullName: number;
    birthDate: number;
    personalNumber: number;
    primaryDiagnosis: number;
    icd10Codes: number;
    diagnosisDate: number;
    physician: number;
  };
}

export interface ParsedForm100 {
  personalInfo: PersonalInfo;
  medicalInfo: MedicalInfo;
  physicianInfo: PhysicianInfo;
  disability: DisabilityInfo;
  additionalInfo: {
    medicalHistory: string | null;
    currentMedications: string[];
    allergies: string[];
  };
  confidence: ConfidenceScores;
  rawText: string;
  warnings: string[];
}

export interface CreateProfileResult {
  success: boolean;
  profile?: any;
  warnings: string[];
  error?: string;
}

// ============================================================================
// AI Prompt for Form 100 Parsing
// ============================================================================

const FORM_100_PARSE_PROMPT = `შენ ხარ ქართული სამედიცინო დოკუმენტების ექსპერტი, სპეციალიზებული ფორმა №100-ის დამუშავებაში.

გაანალიზე მოცემული ტექსტი და ამოიღე ინფორმაცია JSON ფორმატში.

მნიშვნელოვანი:
- თუ ველი არ იკითხება ან არ არსებობს, დააბრუნე null
- თარიღები დააბრუნე YYYY-MM-DD ფორმატში
- ICD-10 კოდები (მაგ: G80.0, P91.6) ამოიღე ცალკე მასივში
- პირადი ნომერი უნდა იყოს 11 ციფრი
- სქესი: "male" ან "female"
- confidence scores: 0.0-დან 1.0-მდე (რამდენად დარწმუნებული ხარ)

დააბრუნე JSON:
{
  "personalInfo": {
    "fullName": "სრული სახელი ან null",
    "birthDate": "YYYY-MM-DD ან null",
    "gender": "male" | "female" | null,
    "personalNumber": "11 ციფრი ან null"
  },
  "medicalInfo": {
    "primaryDiagnosis": "ძირითადი დიაგნოზი ქართულად ან null",
    "icd10Codes": ["G80.0", "P91.6"],
    "secondaryDiagnoses": ["თანმხლები დიაგნოზები"],
    "diagnosisDate": "YYYY-MM-DD ან null"
  },
  "physicianInfo": {
    "name": "ექიმის სახელი ან null",
    "institution": "სამედიცინო დაწესებულება ან null"
  },
  "disability": {
    "status": "შშმ სტატუსი ან null",
    "group": "ჯგუფი ან null"
  },
  "additionalInfo": {
    "medicalHistory": "სამედიცინო ისტორია ან null",
    "currentMedications": ["მედიკამენტები"],
    "allergies": ["ალერგიები"]
  },
  "confidence": {
    "overall": 0.0-1.0,
    "fields": {
      "fullName": 0.0-1.0,
      "birthDate": 0.0-1.0,
      "personalNumber": 0.0-1.0,
      "primaryDiagnosis": 0.0-1.0,
      "icd10Codes": 0.0-1.0,
      "diagnosisDate": 0.0-1.0,
      "physician": 0.0-1.0
    }
  },
  "warnings": ["გაფრთხილებები თუ რამე არ იკითხება კარგად"]
}`;

// ============================================================================
// Document Text Extraction
// ============================================================================

export async function extractTextFromDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ success: boolean; text: string; error?: string }> {
  try {
    if (mimeType === "application/pdf") {
      const result = await extractTextFromPDF(fileBuffer);
      return {
        success: result.success,
        text: result.text,
        error: result.error,
      };
    }

    if (mimeType.startsWith("image/")) {
      const result = await extractTextFromImage(fileBuffer, mimeType);
      return {
        success: result.success,
        text: result.text,
        error: result.error,
      };
    }

    return {
      success: false,
      text: "",
      error: `Unsupported file type: ${mimeType}`,
    };
  } catch (error) {
    console.error("[Form100 Parser] Text extraction error:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}

// ============================================================================
// AI-Powered Form 100 Parsing
// ============================================================================

export async function parseForm100WithAI(text: string): Promise<ParsedForm100> {
  const defaultResult: ParsedForm100 = {
    personalInfo: {
      fullName: null,
      birthDate: null,
      gender: null,
      personalNumber: null,
    },
    medicalInfo: {
      primaryDiagnosis: null,
      icd10Codes: [],
      secondaryDiagnoses: [],
      diagnosisDate: null,
    },
    physicianInfo: {
      name: null,
      institution: null,
    },
    disability: {
      status: null,
      group: null,
    },
    additionalInfo: {
      medicalHistory: null,
      currentMedications: [],
      allergies: [],
    },
    confidence: {
      overall: 0,
      fields: {
        fullName: 0,
        birthDate: 0,
        personalNumber: 0,
        primaryDiagnosis: 0,
        icd10Codes: 0,
        diagnosisDate: 0,
        physician: 0,
      },
    },
    rawText: text,
    warnings: [],
  };

  if (!text || text.trim().length < 50) {
    defaultResult.warnings.push("ტექსტი ძალიან მოკლეა ან ცარიელია");
    return defaultResult;
  }

  try {
    console.log("[Form100 Parser] Sending to AI for parsing...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: FORM_100_PARSE_PROMPT,
        },
        {
          role: "user",
          content: `გაანალიზე ეს დოკუმენტი:\n\n${text}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    console.log("[Form100 Parser] AI parsing completed");

    return {
      personalInfo: {
        fullName: parsed.personalInfo?.fullName || null,
        birthDate: parsed.personalInfo?.birthDate || null,
        gender: parsed.personalInfo?.gender || null,
        personalNumber: parsed.personalInfo?.personalNumber || null,
      },
      medicalInfo: {
        primaryDiagnosis: parsed.medicalInfo?.primaryDiagnosis || null,
        icd10Codes: parsed.medicalInfo?.icd10Codes || [],
        secondaryDiagnoses: parsed.medicalInfo?.secondaryDiagnoses || [],
        diagnosisDate: parsed.medicalInfo?.diagnosisDate || null,
      },
      physicianInfo: {
        name: parsed.physicianInfo?.name || null,
        institution: parsed.physicianInfo?.institution || null,
      },
      disability: {
        status: parsed.disability?.status || null,
        group: parsed.disability?.group || null,
      },
      additionalInfo: {
        medicalHistory: parsed.additionalInfo?.medicalHistory || null,
        currentMedications: parsed.additionalInfo?.currentMedications || [],
        allergies: parsed.additionalInfo?.allergies || [],
      },
      confidence: {
        overall: parsed.confidence?.overall || 0.5,
        fields: {
          fullName: parsed.confidence?.fields?.fullName || 0.5,
          birthDate: parsed.confidence?.fields?.birthDate || 0.5,
          personalNumber: parsed.confidence?.fields?.personalNumber || 0.5,
          primaryDiagnosis: parsed.confidence?.fields?.primaryDiagnosis || 0.5,
          icd10Codes: parsed.confidence?.fields?.icd10Codes || 0.5,
          diagnosisDate: parsed.confidence?.fields?.diagnosisDate || 0.5,
          physician: parsed.confidence?.fields?.physician || 0.5,
        },
      },
      rawText: text,
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    console.error("[Form100 Parser] AI parsing error:", error);
    defaultResult.warnings.push(
      `AI დამუშავების შეცდომა: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return defaultResult;
  }
}

// ============================================================================
// Patient Profile Creation
// ============================================================================

export async function createPatientProfile(
  userId: string,
  parsedData: ParsedForm100,
  documentId: number | null
): Promise<CreateProfileResult> {
  const warnings: string[] = [...parsedData.warnings];

  // Check confidence and add warnings
  if (parsedData.confidence.overall < 0.5) {
    warnings.push("დოკუმენტის საერთო სანდოობა დაბალია. გთხოვთ შეამოწმოთ მონაცემები.");
  }

  const lowConfidenceFields: string[] = [];
  Object.entries(parsedData.confidence.fields).forEach(([field, score]) => {
    if (score < 0.6) {
      lowConfidenceFields.push(field);
    }
  });

  if (lowConfidenceFields.length > 0) {
    warnings.push(`დაბალი სანდოობის ველები: ${lowConfidenceFields.join(", ")}`);
  }

  try {
    // Check if profile already exists
    const existingProfile = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    const profileData = {
      userId,
      fullName: parsedData.personalInfo.fullName,
      birthDate: parsedData.personalInfo.birthDate,
      gender: parsedData.personalInfo.gender,
      personalNumber: parsedData.personalInfo.personalNumber,
      primaryDiagnosis: parsedData.medicalInfo.primaryDiagnosis,
      icd10Codes: parsedData.medicalInfo.icd10Codes,
      secondaryDiagnoses: parsedData.medicalInfo.secondaryDiagnoses,
      diagnosisDate: parsedData.medicalInfo.diagnosisDate,
      attendingPhysician: parsedData.physicianInfo.name,
      medicalInstitution: parsedData.physicianInfo.institution,
      disabilityStatus: parsedData.disability.status,
      disabilityGroup: parsedData.disability.group,
      medicalHistory: parsedData.additionalInfo.medicalHistory,
      currentMedications: parsedData.additionalInfo.currentMedications,
      allergies: parsedData.additionalInfo.allergies,
      aiExtractedData: parsedData as any,
      extractionConfidence: parsedData.confidence.overall,
      sourceDocumentId: documentId,
    };

    let profile;

    if (existingProfile.length > 0) {
      // Update existing profile
      [profile] = await db
        .update(patientProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(patientProfiles.userId, userId))
        .returning();

      warnings.push("არსებული პროფილი განახლდა ახალი დოკუმენტით");
    } else {
      // Create new profile
      [profile] = await db
        .insert(patientProfiles)
        .values(profileData)
        .returning();
    }

    console.log(`[Form100 Parser] Profile ${existingProfile.length > 0 ? "updated" : "created"} for user ${userId}`);

    return {
      success: true,
      profile,
      warnings,
    };
  } catch (error) {
    console.error("[Form100 Parser] Profile creation error:", error);
    return {
      success: false,
      warnings,
      error: error instanceof Error ? error.message : "Profile creation failed",
    };
  }
}

// ============================================================================
// Generate Search Keywords from Profile
// ============================================================================

export function generateSearchKeywords(parsedData: ParsedForm100): string[] {
  const keywords: string[] = [];

  // Add diagnosis
  if (parsedData.medicalInfo.primaryDiagnosis) {
    keywords.push(parsedData.medicalInfo.primaryDiagnosis);
  }

  // Add ICD-10 codes
  keywords.push(...parsedData.medicalInfo.icd10Codes);

  // Add secondary diagnoses
  keywords.push(...parsedData.medicalInfo.secondaryDiagnoses);

  // Common HIE-related terms if diagnosis suggests it
  const diagnosisLower = (parsedData.medicalInfo.primaryDiagnosis || "").toLowerCase();
  if (
    diagnosisLower.includes("ენცეფალოპათია") ||
    diagnosisLower.includes("encephalopathy") ||
    diagnosisLower.includes("hie") ||
    diagnosisLower.includes("ჰიპოქსი")
  ) {
    keywords.push("hypoxic ischemic encephalopathy");
    keywords.push("neonatal encephalopathy");
    keywords.push("therapeutic hypothermia");
  }

  if (
    diagnosisLower.includes("ცერებრალური") ||
    diagnosisLower.includes("cerebral palsy") ||
    diagnosisLower.includes("პარალიზი")
  ) {
    keywords.push("cerebral palsy");
    keywords.push("motor rehabilitation");
  }

  // Remove duplicates and empty strings
  return [...new Set(keywords.filter((k) => k && k.trim().length > 0))];
}

// ============================================================================
// Full Processing Pipeline
// ============================================================================

export async function processForm100(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{
  success: boolean;
  profile?: any;
  parsedData?: ParsedForm100;
  documentId?: number;
  warnings: string[];
  error?: string;
}> {
  const warnings: string[] = [];

  try {
    // Step 1: Extract text from document
    console.log(`[Form100 Parser] Step 1: Extracting text from ${fileName}`);
    const extraction = await extractTextFromDocument(fileBuffer, mimeType);

    if (!extraction.success) {
      return {
        success: false,
        warnings,
        error: extraction.error || "ტექსტის ამოღება ვერ მოხერხდა",
      };
    }

    // Step 2: Save document to database
    console.log("[Form100 Parser] Step 2: Saving document to database");
    const [savedDocument] = await db
      .insert(documents)
      .values({
        userId,
        title: fileName,
        category: "form_100",
        fileType: mimeType,
        filePath: fileName,
        extractedText: extraction.text,
        processingStatus: "processing",
        documentType: "form_100",
      })
      .returning();

    // Step 3: Parse with AI
    console.log("[Form100 Parser] Step 3: Parsing with AI");
    const parsedData = await parseForm100WithAI(extraction.text);
    warnings.push(...parsedData.warnings);

    // Step 4: Create/Update patient profile
    console.log("[Form100 Parser] Step 4: Creating patient profile");
    const profileResult = await createPatientProfile(userId, parsedData, savedDocument.id);
    warnings.push(...profileResult.warnings);

    // Step 5: Update document status
    await db
      .update(documents)
      .set({ processingStatus: profileResult.success ? "completed" : "failed" })
      .where(eq(documents.id, savedDocument.id));

    if (!profileResult.success) {
      return {
        success: false,
        parsedData,
        documentId: savedDocument.id,
        warnings,
        error: profileResult.error,
      };
    }

    console.log("[Form100 Parser] Processing completed successfully");

    return {
      success: true,
      profile: profileResult.profile,
      parsedData,
      documentId: savedDocument.id,
      warnings,
    };
  } catch (error) {
    console.error("[Form100 Parser] Processing error:", error);
    return {
      success: false,
      warnings,
      error: error instanceof Error ? error.message : "დამუშავების შეცდომა",
    };
  }
}

export default {
  extractTextFromDocument,
  parseForm100WithAI,
  createPatientProfile,
  generateSearchKeywords,
  processForm100,
};
