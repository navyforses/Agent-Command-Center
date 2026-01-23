/**
 * Research Alert Service
 * =======================
 * Monitors for new research findings and sends notifications
 * Priority 2 feature: Research Alerts
 */

import { storage } from "../storage";
import { sendEmail } from "../resend";
import type { ResearchMonitor, InsertResearchFinding } from "@shared/schema";

export interface ResearchSource {
  type: "clinical_trial" | "article" | "drug" | "news";
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AlertConfig {
  userId: string;
  keywords: string[];
  conditions: string[];
  monitorClinicalTrials: boolean;
  monitorPubmed: boolean;
  monitorDrugs: boolean;
  monitorNews: boolean;
}

export interface ScanResult {
  success: boolean;
  findingsCount: number;
  newFindings: ResearchSource[];
  error?: string;
}

/**
 * Calculate relevance score based on keyword matches
 */
function calculateRelevanceScore(
  content: string,
  keywords: string[],
  conditions: string[]
): number {
  const lowerContent = content.toLowerCase();
  let score = 0;
  let totalTerms = keywords.length + conditions.length;

  if (totalTerms === 0) return 0.5;

  // Check keyword matches
  for (const keyword of keywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  // Conditions have higher weight
  for (const condition of conditions) {
    if (lowerContent.includes(condition.toLowerCase())) {
      score += 1.5;
    }
  }

  // Normalize to 0-1 range
  return Math.min(score / (totalTerms * 1.25), 1);
}

/**
 * Search PubMed for relevant articles (mock implementation - integrate with pubmedApi.ts)
 */
async function searchPubMed(
  keywords: string[],
  conditions: string[]
): Promise<ResearchSource[]> {
  // This would integrate with the existing pubmedApi.ts service
  // For now, returning structure for when API is integrated
  try {
    const searchQuery = [...keywords, ...conditions].join(" OR ");

    // TODO: Integrate with actual PubMed API from services/pubmedApi.ts
    // const results = await pubmedApi.search(searchQuery);

    return [];
  } catch (error) {
    console.error("PubMed search error:", error);
    return [];
  }
}

/**
 * Search clinical trials for relevant studies
 */
async function searchClinicalTrials(
  keywords: string[],
  conditions: string[]
): Promise<ResearchSource[]> {
  // This would integrate with the existing clinicalTrialsApi.ts service
  try {
    // TODO: Integrate with actual Clinical Trials API from services/clinicalTrialsApi.ts
    // const results = await clinicalTrialsApi.search(conditions, keywords);

    return [];
  } catch (error) {
    console.error("Clinical trials search error:", error);
    return [];
  }
}

/**
 * Search FDA drug information
 */
async function searchDrugs(keywords: string[]): Promise<ResearchSource[]> {
  // This would integrate with the existing openfdaApi.ts service
  try {
    // TODO: Integrate with actual OpenFDA API from services/openfdaApi.ts
    // const results = await openfdaApi.searchDrugs(keywords);

    return [];
  } catch (error) {
    console.error("Drug search error:", error);
    return [];
  }
}

/**
 * Scan for new research based on monitor configuration
 */
export async function scanForNewResearch(
  monitor: ResearchMonitor
): Promise<ScanResult> {
  const allFindings: ResearchSource[] = [];
  const keywords = monitor.searchKeywords || [];
  const conditions = monitor.conditions || [];

  try {
    // Run searches in parallel based on monitor settings
    const searchPromises: Promise<ResearchSource[]>[] = [];

    if (monitor.monitorPubmed) {
      searchPromises.push(searchPubMed(keywords, conditions));
    }

    if (monitor.monitorClinicalTrials) {
      searchPromises.push(searchClinicalTrials(keywords, conditions));
    }

    if (monitor.monitorDrugs) {
      searchPromises.push(searchDrugs(keywords));
    }

    const results = await Promise.all(searchPromises);
    results.forEach((findings) => allFindings.push(...findings));

    // Filter findings by relevance score
    const relevantFindings = allFindings.filter((finding) => {
      const content = `${finding.title} ${finding.summary}`;
      const score = calculateRelevanceScore(content, keywords, conditions);
      return score >= 0.3; // Minimum relevance threshold
    });

    return {
      success: true,
      findingsCount: relevantFindings.length,
      newFindings: relevantFindings,
    };
  } catch (error) {
    console.error("Research scan error:", error);
    return {
      success: false,
      findingsCount: 0,
      newFindings: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Save findings to database
 */
export async function saveFinding(
  monitorId: number,
  finding: ResearchSource
): Promise<boolean> {
  try {
    const findingData: InsertResearchFinding = {
      monitorId,
      findingType: finding.type,
      title: finding.title,
      summary: finding.summary,
      sourceUrl: finding.sourceUrl,
      sourceName: finding.sourceName,
      relevanceScore: 0.5, // Will be calculated properly
      metadata: finding.metadata || {},
      publishedAt: finding.publishedAt || new Date(),
      isRead: false,
      isSaved: false,
      isDismissed: false,
    };

    await storage.createResearchFinding(findingData);
    return true;
  } catch (error) {
    console.error("Failed to save finding:", error);
    return false;
  }
}

/**
 * Send email notification about new findings
 */
export async function sendAlertNotification(
  userEmail: string,
  userName: string,
  findings: ResearchSource[]
): Promise<boolean> {
  if (findings.length === 0) return true;

  const findingsList = findings
    .slice(0, 5) // Limit to 5 in email
    .map(
      (f) =>
        `• <strong>${f.title}</strong><br/>
         <em>${f.sourceName}</em> - ${f.type}<br/>
         ${f.summary.substring(0, 200)}...`
    )
    .join("<br/><br/>");

  const emailBody = `
    <h2>ახალი კვლევები თქვენი მონიტორისთვის</h2>
    <p>გამარჯობა ${userName},</p>
    <p>ვიპოვეთ ${findings.length} ახალი კვლევა თქვენი ინტერესის თემებზე:</p>
    <br/>
    ${findingsList}
    <br/><br/>
    ${findings.length > 5 ? `<p><em>და კიდევ ${findings.length - 5} სხვა...</em></p>` : ""}
    <p>სრული სიის სანახავად ეწვიეთ თქვენს პროფილს.</p>
    <br/>
    <p>HIE Parent Command Center</p>
  `;

  try {
    const result = await sendEmail({
      to: userEmail,
      subject: `🔬 ${findings.length} ახალი კვლევა - HIE Research Alerts`,
      body: emailBody,
    });

    return result.success;
  } catch (error) {
    console.error("Failed to send alert email:", error);
    return false;
  }
}

/**
 * Get unread findings count for a user
 */
export async function getUnreadFindingsCount(userId: string): Promise<number> {
  try {
    const findings = await storage.getUnreadResearchFindings(userId);
    return findings.length;
  } catch (error) {
    console.error("Failed to get unread findings:", error);
    return 0;
  }
}

/**
 * Mark finding as read
 */
export async function markFindingAsRead(
  findingId: number,
  userId: string
): Promise<boolean> {
  try {
    await storage.updateResearchFinding(findingId, userId, { isRead: true });
    return true;
  } catch (error) {
    console.error("Failed to mark finding as read:", error);
    return false;
  }
}

/**
 * Mark finding as saved (bookmarked)
 */
export async function saveFindingToBookmarks(
  findingId: number,
  userId: string,
  saved: boolean
): Promise<boolean> {
  try {
    await storage.updateResearchFinding(findingId, userId, { isSaved: saved });
    return true;
  } catch (error) {
    console.error("Failed to save finding:", error);
    return false;
  }
}

/**
 * Dismiss a finding (won't show again)
 */
export async function dismissFinding(
  findingId: number,
  userId: string
): Promise<boolean> {
  try {
    await storage.updateResearchFinding(findingId, userId, { isDismissed: true });
    return true;
  } catch (error) {
    console.error("Failed to dismiss finding:", error);
    return false;
  }
}

export default {
  scanForNewResearch,
  saveFinding,
  sendAlertNotification,
  getUnreadFindingsCount,
  markFindingAsRead,
  saveFindingToBookmarks,
  dismissFinding,
  calculateRelevanceScore,
};
