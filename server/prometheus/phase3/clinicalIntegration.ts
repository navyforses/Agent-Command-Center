/**
 * PROMETHEUS Phase 3: Clinical Integration APIs
 *
 * Secure integration with external clinical systems including EHR,
 * lab results, imaging, and pharmacy systems.
 *
 * "მონაცემების ერთიანობა - უკეთესი მკურნალობა"
 * "Data unity - better treatment"
 */

import { db } from "../../db";
import {
  prometheusClinicalIntegrations,
  prometheusClinicalDataImports,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusState,
  children,
  type InsertPrometheusClinicalIntegration,
  type InsertPrometheusClinicalDataImport,
  type PrometheusClinicalIntegration,
  type PrometheusClinicalDataImport,
} from "@shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { createNotification } from "../phase2/notificationSystem";
import { storeMemory } from "../memoryLayer";
import crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export type IntegrationType = "ehr" | "lab_results" | "imaging" | "pharmacy";
export type ConnectionStatus = "pending" | "active" | "paused" | "disconnected" | "error";
export type SyncFrequency = "realtime" | "hourly" | "daily" | "weekly" | "manual";

export interface IntegrationConfig {
  userId: string;
  childId: number;
  integrationType: IntegrationType;
  providerName: string;
  providerType?: string;
  apiEndpoint?: string;
  dataTypes: string[];
  syncFrequency: SyncFrequency;
  credentials?: Record<string, string>;
}

export interface ClinicalDataRecord {
  type: string;
  date: Date;
  source: string;
  data: Record<string, unknown>;
  rawData?: string;
}

export interface LabResult {
  testName: string;
  testNameKa?: string;
  value: string | number;
  unit: string;
  referenceRange?: string;
  status: "normal" | "abnormal" | "critical";
  date: Date;
  notes?: string;
}

export interface MedicationRecord {
  name: string;
  nameKa?: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy?: string;
  purpose?: string;
  status: "active" | "completed" | "discontinued";
}

export interface ImagingResult {
  type: string; // MRI, CT, X-ray, Ultrasound
  bodyPart: string;
  date: Date;
  findings: string;
  findingsKa?: string;
  impression?: string;
  radiologist?: string;
  imageUrls?: string[];
}

export interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  memoriesCreated: number;
  knowledgeNodesCreated: number;
  errors: string[];
  insights: string[];
}

// ============================================================================
// Encryption Utilities
// ============================================================================

const ENCRYPTION_KEY = process.env.CLINICAL_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ============================================================================
// Integration Management
// ============================================================================

/**
 * Create a new clinical integration
 */
export async function createIntegration(
  config: IntegrationConfig
): Promise<PrometheusClinicalIntegration> {
  // Encrypt credentials if provided
  const encryptedCredentials = config.credentials
    ? encrypt(JSON.stringify(config.credentials))
    : undefined;

  const [integration] = await db
    .insert(prometheusClinicalIntegrations)
    .values({
      userId: config.userId,
      childId: config.childId,
      integrationType: config.integrationType,
      providerName: config.providerName,
      providerType: config.providerType,
      apiEndpoint: config.apiEndpoint,
      dataTypes: config.dataTypes,
      syncFrequency: config.syncFrequency,
      credentials: encryptedCredentials ? { encrypted: encryptedCredentials } : undefined,
      connectionStatus: "pending",
      consentGiven: false,
    })
    .returning();

  // Notify user about pending integration
  await createNotification({
    userId: config.userId,
    category: "system_alert",
    priority: "high",
    title: "Clinical Integration Pending",
    titleKa: "კლინიკური ინტეგრაცია მოლოდინშია",
    message: `Your ${config.providerName} integration is pending consent. Please review and approve data sharing.`,
    messageKa: `თქვენი ${config.providerName} ინტეგრაცია ელოდება თანხმობას. გთხოვთ გადახედოთ და დაამტკიცოთ მონაცემების გაზიარება.`,
    actionUrl: `/settings/integrations/${integration.id}`,
    metadata: { integrationId: integration.id },
  });

  return integration;
}

/**
 * Give consent for data sharing
 */
export async function giveConsent(
  integrationId: number,
  userId: string
): Promise<PrometheusClinicalIntegration | null> {
  const integration = await db.query.prometheusClinicalIntegrations.findFirst({
    where: and(
      eq(prometheusClinicalIntegrations.id, integrationId),
      eq(prometheusClinicalIntegrations.userId, userId)
    ),
  });

  if (!integration) return null;

  const [updated] = await db
    .update(prometheusClinicalIntegrations)
    .set({
      consentGiven: true,
      consentGivenAt: new Date(),
      connectionStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(prometheusClinicalIntegrations.id, integrationId))
    .returning();

  // Trigger initial sync
  if (updated) {
    await triggerSync(integrationId);
  }

  return updated;
}

/**
 * Revoke consent and disconnect integration
 */
export async function revokeConsent(
  integrationId: number,
  userId: string
): Promise<boolean> {
  const [updated] = await db
    .update(prometheusClinicalIntegrations)
    .set({
      consentGiven: false,
      connectionStatus: "disconnected",
      credentials: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(prometheusClinicalIntegrations.id, integrationId),
        eq(prometheusClinicalIntegrations.userId, userId)
      )
    )
    .returning();

  return !!updated;
}

/**
 * Update integration connection status
 */
export async function updateConnectionStatus(
  integrationId: number,
  status: ConnectionStatus,
  lastSyncStatus?: string
): Promise<void> {
  await db
    .update(prometheusClinicalIntegrations)
    .set({
      connectionStatus: status,
      lastSyncStatus,
      lastSyncAt: status === "active" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(prometheusClinicalIntegrations.id, integrationId));
}

/**
 * Get user's integrations
 */
export async function getUserIntegrations(
  userId: string,
  childId?: number
): Promise<PrometheusClinicalIntegration[]> {
  const conditions = [eq(prometheusClinicalIntegrations.userId, userId)];

  if (childId) {
    conditions.push(eq(prometheusClinicalIntegrations.childId, childId));
  }

  return db.query.prometheusClinicalIntegrations.findMany({
    where: and(...conditions),
    orderBy: [desc(prometheusClinicalIntegrations.createdAt)],
  });
}

// ============================================================================
// Data Import
// ============================================================================

/**
 * Trigger a sync for an integration
 */
export async function triggerSync(integrationId: number): Promise<number | null> {
  const integration = await db.query.prometheusClinicalIntegrations.findFirst({
    where: eq(prometheusClinicalIntegrations.id, integrationId),
  });

  if (!integration || !integration.consentGiven || integration.connectionStatus !== "active") {
    return null;
  }

  // Get Prometheus state for child
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.childId, integration.childId!),
  });

  if (!prometheus) return null;

  // Create import record
  const [importRecord] = await db
    .insert(prometheusClinicalDataImports)
    .values({
      integrationId,
      prometheusId: prometheus.id,
      importType: "incremental",
      dataType: integration.integrationType,
      status: "pending",
    })
    .returning();

  // Start async import (in production, this would be a background job)
  processImport(importRecord.id).catch(console.error);

  return importRecord.id;
}

/**
 * Process a data import
 */
async function processImport(importId: number): Promise<void> {
  const importRecord = await db.query.prometheusClinicalDataImports.findFirst({
    where: eq(prometheusClinicalDataImports.id, importId),
  });

  if (!importRecord) return;

  // Update status to processing
  await db
    .update(prometheusClinicalDataImports)
    .set({ status: "processing", startedAt: new Date() })
    .where(eq(prometheusClinicalDataImports.id, importId));

  const integration = await db.query.prometheusClinicalIntegrations.findFirst({
    where: eq(prometheusClinicalIntegrations.id, importRecord.integrationId!),
  });

  if (!integration) {
    await db
      .update(prometheusClinicalDataImports)
      .set({ status: "failed", errorLog: "Integration not found" })
      .where(eq(prometheusClinicalDataImports.id, importId));
    return;
  }

  try {
    // Fetch data based on integration type
    const records = await fetchClinicalData(integration);

    let memoriesCreated = 0;
    let knowledgeNodesCreated = 0;
    const errors: string[] = [];
    const insights: string[] = [];

    // Process each record
    for (const record of records) {
      try {
        const result = await processClinicalRecord(
          record,
          importRecord.prometheusId!,
          integration.integrationType
        );
        memoriesCreated += result.memoriesCreated;
        knowledgeNodesCreated += result.knowledgeNodesCreated;
        if (result.insight) insights.push(result.insight);
      } catch (error) {
        errors.push(`Record ${record.type}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Update import record
    await db
      .update(prometheusClinicalDataImports)
      .set({
        status: "completed",
        completedAt: new Date(),
        recordCount: records.length,
        processedCount: records.length - errors.length,
        errorCount: errors.length,
        memoriesCreated,
        knowledgeNodesCreated,
        errorLog: errors.length > 0 ? errors.join("\n") : null,
        insights: insights.length > 0 ? { insights } : null,
      })
      .where(eq(prometheusClinicalDataImports.id, importId));

    // Update integration last sync
    await updateConnectionStatus(integration.id, "active", "success");

    // Notify if important insights found
    if (insights.length > 0) {
      await createNotification({
        userId: integration.userId,
        prometheusId: importRecord.prometheusId ?? undefined,
        category: "breakthrough_discovery",
        priority: "high",
        title: "New Clinical Insights",
        titleKa: "ახალი კლინიკური დასკვნები",
        message: `Imported clinical data revealed ${insights.length} new insight(s): ${insights[0]}`,
        messageKa: `იმპორტირებულმა კლინიკურმა მონაცემებმა გამოავლინა ${insights.length} ახალი დასკვნა: ${insights[0]}`,
        metadata: { importId, insights },
      });
    }
  } catch (error) {
    await db
      .update(prometheusClinicalDataImports)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorLog: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(prometheusClinicalDataImports.id, importId));

    await updateConnectionStatus(integration.id, "error", "import_failed");
  }
}

/**
 * Fetch clinical data from integration source
 * In production, this would connect to real APIs (FHIR, HL7, etc.)
 */
async function fetchClinicalData(
  integration: PrometheusClinicalIntegration
): Promise<ClinicalDataRecord[]> {
  // This is a placeholder - in production, implement actual API calls
  // based on integration type and credentials

  // For demo/development, return mock data structure
  const records: ClinicalDataRecord[] = [];

  switch (integration.integrationType) {
    case "lab_results":
      // Would fetch from lab API
      break;
    case "pharmacy":
      // Would fetch from pharmacy API
      break;
    case "imaging":
      // Would fetch from PACS/imaging API
      break;
    case "ehr":
      // Would fetch from EHR via FHIR/HL7
      break;
  }

  return records;
}

/**
 * Process a clinical record into Prometheus knowledge
 */
async function processClinicalRecord(
  record: ClinicalDataRecord,
  prometheusId: number,
  integrationType: string
): Promise<{ memoriesCreated: number; knowledgeNodesCreated: number; insight?: string }> {
  let memoriesCreated = 0;
  let knowledgeNodesCreated = 0;
  let insight: string | undefined;

  switch (integrationType) {
    case "lab_results": {
      const labResult = record.data as unknown as LabResult;

      // Create memory for lab result
      await storeMemory(prometheusId, {
        content: `Lab Result: ${labResult.testName} = ${labResult.value} ${labResult.unit} (${labResult.status})`,
        contentKa: labResult.testNameKa
          ? `ლაბორატორიული შედეგი: ${labResult.testNameKa} = ${labResult.value} ${labResult.unit} (${labResult.status})`
          : undefined,
        memoryType: "episodic",
        priority: labResult.status === "critical" ? "critical" : labResult.status === "abnormal" ? "high" : "medium",
        domain: "medical",
        context: `Date: ${labResult.date}. Reference range: ${labResult.referenceRange || "N/A"}`,
        confidence: 0.95,
        metadata: {
          source: "clinical_import",
          recordType: "lab_result",
          rawData: labResult,
        },
      });
      memoriesCreated++;

      // Generate insight for critical results
      if (labResult.status === "critical") {
        insight = `Critical lab result: ${labResult.testName} is ${labResult.value} ${labResult.unit}`;
      }
      break;
    }

    case "pharmacy": {
      const medication = record.data as unknown as MedicationRecord;

      await storeMemory(prometheusId, {
        content: `Medication: ${medication.name} ${medication.dosage} ${medication.frequency}`,
        contentKa: medication.nameKa
          ? `მედიკამენტი: ${medication.nameKa} ${medication.dosage} ${medication.frequency}`
          : undefined,
        memoryType: "semantic",
        priority: "high",
        domain: "medical",
        context: `Started: ${medication.startDate}. Purpose: ${medication.purpose || "Not specified"}`,
        confidence: 0.95,
        metadata: {
          source: "clinical_import",
          recordType: "medication",
          rawData: medication,
        },
      });
      memoriesCreated++;
      break;
    }

    case "imaging": {
      const imaging = record.data as unknown as ImagingResult;

      await storeMemory(prometheusId, {
        content: `${imaging.type} of ${imaging.bodyPart}: ${imaging.findings}`,
        contentKa: imaging.findingsKa
          ? `${imaging.type} ${imaging.bodyPart}: ${imaging.findingsKa}`
          : undefined,
        memoryType: "episodic",
        priority: "high",
        domain: "medical",
        context: `Date: ${imaging.date}. Impression: ${imaging.impression || "N/A"}`,
        confidence: 0.9,
        metadata: {
          source: "clinical_import",
          recordType: "imaging",
          rawData: imaging,
        },
      });
      memoriesCreated++;

      if (imaging.impression) {
        insight = `Imaging finding: ${imaging.impression}`;
      }
      break;
    }
  }

  return { memoriesCreated, knowledgeNodesCreated, insight };
}

// ============================================================================
// Manual Data Entry
// ============================================================================

/**
 * Manually import lab results
 */
export async function importLabResults(
  prometheusId: number,
  userId: string,
  results: LabResult[]
): Promise<ImportResult> {
  const errors: string[] = [];
  const insights: string[] = [];
  let memoriesCreated = 0;

  for (const result of results) {
    try {
      const processResult = await processClinicalRecord(
        { type: "lab", date: result.date, source: "manual", data: result as unknown as Record<string, unknown> },
        prometheusId,
        "lab_results"
      );
      memoriesCreated += processResult.memoriesCreated;
      if (processResult.insight) insights.push(processResult.insight);
    } catch (error) {
      errors.push(`${result.testName}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Create import record
  await db.insert(prometheusClinicalDataImports).values({
    prometheusId,
    importType: "manual",
    dataType: "lab_result",
    status: "completed",
    recordCount: results.length,
    processedCount: results.length - errors.length,
    errorCount: errors.length,
    memoriesCreated,
    startedAt: new Date(),
    completedAt: new Date(),
    errorLog: errors.length > 0 ? errors.join("\n") : null,
    insights: insights.length > 0 ? { insights } : null,
  });

  return {
    success: errors.length === 0,
    recordsProcessed: results.length,
    memoriesCreated,
    knowledgeNodesCreated: 0,
    errors,
    insights,
  };
}

/**
 * Manually import medications
 */
export async function importMedications(
  prometheusId: number,
  userId: string,
  medications: MedicationRecord[]
): Promise<ImportResult> {
  const errors: string[] = [];
  const insights: string[] = [];
  let memoriesCreated = 0;

  for (const med of medications) {
    try {
      const processResult = await processClinicalRecord(
        { type: "medication", date: med.startDate, source: "manual", data: med as unknown as Record<string, unknown> },
        prometheusId,
        "pharmacy"
      );
      memoriesCreated += processResult.memoriesCreated;
      if (processResult.insight) insights.push(processResult.insight);
    } catch (error) {
      errors.push(`${med.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  await db.insert(prometheusClinicalDataImports).values({
    prometheusId,
    importType: "manual",
    dataType: "medication",
    status: "completed",
    recordCount: medications.length,
    processedCount: medications.length - errors.length,
    errorCount: errors.length,
    memoriesCreated,
    startedAt: new Date(),
    completedAt: new Date(),
    errorLog: errors.length > 0 ? errors.join("\n") : null,
  });

  return {
    success: errors.length === 0,
    recordsProcessed: medications.length,
    memoriesCreated,
    knowledgeNodesCreated: 0,
    errors,
    insights,
  };
}

// ============================================================================
// Import History & Statistics
// ============================================================================

/**
 * Get import history for a Prometheus instance
 */
export async function getImportHistory(
  prometheusId: number,
  limit: number = 20
): Promise<PrometheusClinicalDataImport[]> {
  return db.query.prometheusClinicalDataImports.findMany({
    where: eq(prometheusClinicalDataImports.prometheusId, prometheusId),
    orderBy: [desc(prometheusClinicalDataImports.createdAt)],
    limit,
  });
}

/**
 * Get clinical data import statistics
 */
export async function getImportStatistics(prometheusId: number): Promise<{
  totalImports: number;
  recordsImported: number;
  memoriesCreated: number;
  lastImportDate: Date | null;
  byDataType: Record<string, number>;
}> {
  const imports = await db.query.prometheusClinicalDataImports.findMany({
    where: eq(prometheusClinicalDataImports.prometheusId, prometheusId),
  });

  const byDataType: Record<string, number> = {};
  let recordsImported = 0;
  let memoriesCreated = 0;
  let lastImportDate: Date | null = null;

  for (const imp of imports) {
    recordsImported += imp.processedCount ?? 0;
    memoriesCreated += imp.memoriesCreated ?? 0;

    byDataType[imp.dataType] = (byDataType[imp.dataType] || 0) + (imp.processedCount ?? 0);

    if (imp.completedAt && (!lastImportDate || imp.completedAt > lastImportDate)) {
      lastImportDate = imp.completedAt;
    }
  }

  return {
    totalImports: imports.length,
    recordsImported,
    memoriesCreated,
    lastImportDate,
    byDataType,
  };
}

// ============================================================================
// FHIR Resource Mapping (for future EHR integration)
// ============================================================================

/**
 * Map FHIR Observation to LabResult
 */
export function mapFHIRObservationToLabResult(observation: Record<string, unknown>): LabResult | null {
  try {
    const code = (observation.code as Record<string, unknown>)?.coding?.[0] as Record<string, string> | undefined;
    const value = observation.valueQuantity as Record<string, unknown> | undefined;

    if (!code || !value) return null;

    return {
      testName: code.display || code.code || "Unknown Test",
      value: value.value as number,
      unit: value.unit as string || "",
      date: new Date(observation.effectiveDateTime as string),
      status: determineLabStatus(observation),
    };
  } catch {
    return null;
  }
}

function determineLabStatus(observation: Record<string, unknown>): "normal" | "abnormal" | "critical" {
  const interpretation = (observation.interpretation as Array<Record<string, unknown>>)?.[0];
  const coding = (interpretation?.coding as Array<Record<string, string>>)?.[0];

  if (!coding) return "normal";

  switch (coding.code) {
    case "H":
    case "L":
    case "A":
      return "abnormal";
    case "HH":
    case "LL":
    case "AA":
      return "critical";
    default:
      return "normal";
  }
}

/**
 * Map FHIR MedicationStatement to MedicationRecord
 */
export function mapFHIRMedicationToRecord(medication: Record<string, unknown>): MedicationRecord | null {
  try {
    const med = (medication.medicationCodeableConcept as Record<string, unknown>)?.coding?.[0] as Record<string, string>;
    const dosage = (medication.dosage as Array<Record<string, unknown>>)?.[0];

    if (!med) return null;

    return {
      name: med.display || med.code || "Unknown Medication",
      dosage: dosage?.text as string || "",
      frequency: (dosage?.timing as Record<string, unknown>)?.code?.text as string || "",
      startDate: new Date((medication.effectivePeriod as Record<string, string>)?.start || Date.now()),
      status: medication.status === "active" ? "active" : "completed",
    };
  } catch {
    return null;
  }
}
