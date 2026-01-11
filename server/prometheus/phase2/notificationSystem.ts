/**
 * PROMETHEUS-MIND: Notification System
 * ====================================
 * Real-time alerts for important discoveries and events
 *
 * Dr. Yuki Tanaka-Chen (Chief Medical Domain Expert):
 * "მნიშვნელოვანი აღმოჩენა, რომელიც დროულად არ მიეწოდება მშობელს,
 *  არის დაკარგული შესაძლებლობა."
 * "An important discovery not delivered to the parent in time
 *  is a lost opportunity."
 */

import { db } from "../../db";
import {
  prometheusState,
  prometheusMemory,
  prometheusKnowledgeNodes,
  prometheusErrors,
  prometheusLearningEvents,
  prometheusNotifications,
  users,
  children
} from "../../../shared/schema";
import { eq, and, desc, gte, sql, isNull, or } from "drizzle-orm";

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationPriority = "critical" | "high" | "medium" | "low";
export type NotificationCategory =
  | "breakthrough_discovery"
  | "new_treatment_option"
  | "clinical_trial_match"
  | "prediction_validation"
  | "knowledge_milestone"
  | "verification_complete"
  | "error_detected"
  | "consolidation_complete"
  | "research_update"
  | "cross_child_insight"
  | "system_alert"
  | "weekly_digest";

export interface PrometheusNotification {
  id: number;
  prometheusId: number;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  titleKa?: string;
  message: string;
  messageKa?: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

// Notification subscribers (for real-time updates)
type NotificationCallback = (notification: PrometheusNotification) => void;
const subscribers: Map<string, NotificationCallback[]> = new Map();

// ============================================================================
// NOTIFICATION CREATION
// ============================================================================

/**
 * Create a new notification (persisted to database)
 */
export async function createNotification(
  notification: Omit<PrometheusNotification, "id" | "isRead" | "readAt" | "createdAt">
): Promise<PrometheusNotification> {
  try {
    const [inserted] = await db.insert(prometheusNotifications).values({
      prometheusId: notification.prometheusId,
      userId: notification.userId,
      category: notification.category,
      priority: notification.priority,
      title: notification.title,
      titleKa: notification.titleKa,
      message: notification.message,
      messageKa: notification.messageKa,
      metadata: notification.metadata,
      actionUrl: notification.actionUrl,
      expiresAt: notification.expiresAt,
      isRead: false
    }).returning();

    const newNotification: PrometheusNotification = {
      id: inserted.id,
      prometheusId: inserted.prometheusId!,
      userId: inserted.userId,
      category: inserted.category as NotificationCategory,
      priority: inserted.priority as NotificationPriority,
      title: inserted.title,
      titleKa: inserted.titleKa || undefined,
      message: inserted.message,
      messageKa: inserted.messageKa || undefined,
      metadata: inserted.metadata as Record<string, any> | undefined,
      actionUrl: inserted.actionUrl || undefined,
      isRead: inserted.isRead || false,
      readAt: inserted.readAt || undefined,
      expiresAt: inserted.expiresAt || undefined,
      createdAt: inserted.createdAt || new Date()
    };

    // Notify subscribers
    const userSubscribers = subscribers.get(notification.userId) || [];
    for (const callback of userSubscribers) {
      try {
        callback(newNotification);
      } catch (error) {
        console.error("[PROMETHEUS] Notification callback error:", error);
      }
    }

    console.log(`[PROMETHEUS] Created notification: ${newNotification.title}`);

    return newNotification;
  } catch (error) {
    console.error("[PROMETHEUS] Failed to create notification:", error);
    throw error;
  }
}

/**
 * Subscribe to notifications
 */
export function subscribeToNotifications(
  userId: string,
  callback: NotificationCallback
): () => void {
  const userSubscribers = subscribers.get(userId) || [];
  userSubscribers.push(callback);
  subscribers.set(userId, userSubscribers);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(userId) || [];
    const index = subs.indexOf(callback);
    if (index > -1) {
      subs.splice(index, 1);
    }
  };
}

// ============================================================================
// NOTIFICATION RETRIEVAL
// ============================================================================

/**
 * Get notifications for a specific Prometheus instance
 */
export async function getNotifications(
  prometheusId: number,
  options: {
    unreadOnly?: boolean;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    limit?: number;
  } = {}
): Promise<PrometheusNotification[]> {
  const { unreadOnly = false, category, priority, limit = 50 } = options;

  const conditions = [eq(prometheusNotifications.prometheusId, prometheusId)];

  if (unreadOnly) {
    conditions.push(eq(prometheusNotifications.isRead, false));
  }

  if (category) {
    conditions.push(eq(prometheusNotifications.category, category));
  }

  if (priority) {
    conditions.push(eq(prometheusNotifications.priority, priority));
  }

  // Filter expired
  conditions.push(
    or(
      isNull(prometheusNotifications.expiresAt),
      gte(prometheusNotifications.expiresAt, new Date())
    )!
  );

  const results = await db.query.prometheusNotifications.findMany({
    where: and(...conditions),
    orderBy: [desc(prometheusNotifications.createdAt)],
    limit
  });

  return results.map(r => ({
    id: r.id,
    prometheusId: r.prometheusId!,
    userId: r.userId,
    category: r.category as NotificationCategory,
    priority: r.priority as NotificationPriority,
    title: r.title,
    titleKa: r.titleKa || undefined,
    message: r.message,
    messageKa: r.messageKa || undefined,
    metadata: r.metadata as Record<string, any> | undefined,
    actionUrl: r.actionUrl || undefined,
    isRead: r.isRead || false,
    readAt: r.readAt || undefined,
    expiresAt: r.expiresAt || undefined,
    createdAt: r.createdAt || new Date()
  }));
}

/**
 * Get notifications for a user (across all their children)
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
  } = {}
): Promise<PrometheusNotification[]> {
  const { unreadOnly = false, limit = 50 } = options;

  const conditions = [eq(prometheusNotifications.userId, userId)];

  if (unreadOnly) {
    conditions.push(eq(prometheusNotifications.isRead, false));
  }

  // Filter expired
  conditions.push(
    or(
      isNull(prometheusNotifications.expiresAt),
      gte(prometheusNotifications.expiresAt, new Date())
    )!
  );

  const results = await db.query.prometheusNotifications.findMany({
    where: and(...conditions),
    orderBy: [desc(prometheusNotifications.createdAt)],
    limit
  });

  return results.map(r => ({
    id: r.id,
    prometheusId: r.prometheusId!,
    userId: r.userId,
    category: r.category as NotificationCategory,
    priority: r.priority as NotificationPriority,
    title: r.title,
    titleKa: r.titleKa || undefined,
    message: r.message,
    messageKa: r.messageKa || undefined,
    metadata: r.metadata as Record<string, any> | undefined,
    actionUrl: r.actionUrl || undefined,
    isRead: r.isRead || false,
    readAt: r.readAt || undefined,
    expiresAt: r.expiresAt || undefined,
    createdAt: r.createdAt || new Date()
  }));
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(prometheusNotifications)
    .where(and(
      eq(prometheusNotifications.userId, userId),
      eq(prometheusNotifications.isRead, false),
      or(
        isNull(prometheusNotifications.expiresAt),
        gte(prometheusNotifications.expiresAt, new Date())
      )
    ));

  return result[0]?.count || 0;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  notificationId: number,
  userId: string
): Promise<PrometheusNotification | null> {
  const [updated] = await db.update(prometheusNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(prometheusNotifications.id, notificationId),
      eq(prometheusNotifications.userId, userId)
    ))
    .returning();

  if (!updated) return null;

  return {
    id: updated.id,
    prometheusId: updated.prometheusId!,
    userId: updated.userId,
    category: updated.category as NotificationCategory,
    priority: updated.priority as NotificationPriority,
    title: updated.title,
    titleKa: updated.titleKa || undefined,
    message: updated.message,
    messageKa: updated.messageKa || undefined,
    metadata: updated.metadata as Record<string, any> | undefined,
    actionUrl: updated.actionUrl || undefined,
    isRead: updated.isRead || false,
    readAt: updated.readAt || undefined,
    expiresAt: updated.expiresAt || undefined,
    createdAt: updated.createdAt || new Date()
  };
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(
  prometheusId?: number,
  userId?: string
): Promise<number> {
  const conditions = [eq(prometheusNotifications.isRead, false)];

  if (prometheusId) {
    conditions.push(eq(prometheusNotifications.prometheusId, prometheusId));
  }
  if (userId) {
    conditions.push(eq(prometheusNotifications.userId, userId));
  }

  const result = await db.update(prometheusNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(...conditions));

  return result.rowCount || 0;
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: number,
  userId: string
): Promise<boolean> {
  const result = await db.delete(prometheusNotifications)
    .where(and(
      eq(prometheusNotifications.id, notificationId),
      eq(prometheusNotifications.userId, userId)
    ));

  return (result.rowCount || 0) > 0;
}

// ============================================================================
// AUTOMATED NOTIFICATION TRIGGERS
// ============================================================================

/**
 * Notify about a breakthrough discovery
 */
export async function notifyBreakthroughDiscovery(
  prometheusId: number,
  discovery: {
    title: string;
    titleKa?: string;
    description: string;
    descriptionKa?: string;
    confidence: number;
    sourceNodeId?: number;
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  const priority: NotificationPriority =
    discovery.confidence >= 90 ? "critical" :
    discovery.confidence >= 75 ? "high" : "medium";

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "breakthrough_discovery",
    priority,
    title: `🔬 ${discovery.title}`,
    titleKa: discovery.titleKa ? `🔬 ${discovery.titleKa}` : undefined,
    message: discovery.description,
    messageKa: discovery.descriptionKa,
    metadata: {
      confidence: discovery.confidence,
      sourceNodeId: discovery.sourceNodeId,
      childId: prometheus.childId
    },
    actionUrl: `/research?nodeId=${discovery.sourceNodeId}`
  });
}

/**
 * Notify about new treatment option
 */
export async function notifyNewTreatmentOption(
  prometheusId: number,
  treatment: {
    name: string;
    nameKa?: string;
    description: string;
    descriptionKa?: string;
    evidenceLevel: string;
    sourceUrl?: string;
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "new_treatment_option",
    priority: "high",
    title: `💊 ახალი მკურნალობის ვარიანტი: ${treatment.name}`,
    titleKa: treatment.nameKa ? `💊 ახალი მკურნალობის ვარიანტი: ${treatment.nameKa}` : undefined,
    message: treatment.description,
    messageKa: treatment.descriptionKa,
    metadata: {
      treatmentName: treatment.name,
      evidenceLevel: treatment.evidenceLevel,
      childId: prometheus.childId
    },
    actionUrl: treatment.sourceUrl || "/treatments"
  });
}

/**
 * Notify about clinical trial match
 */
export async function notifyClinicalTrialMatch(
  prometheusId: number,
  trial: {
    trialId: string;
    title: string;
    phase: string;
    location: string;
    eligibilitySummary: string;
    contactInfo?: string;
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "clinical_trial_match",
    priority: "critical",
    title: `🏥 კლინიკური კვლევის შესაბამისობა: ${trial.title}`,
    titleKa: `🏥 კლინიკური კვლევის შესაბამისობა`,
    message: `Phase ${trial.phase} trial in ${trial.location}. ${trial.eligibilitySummary}`,
    messageKa: `ფაზა ${trial.phase} კვლევა ${trial.location}-ში.`,
    metadata: {
      trialId: trial.trialId,
      phase: trial.phase,
      location: trial.location,
      contactInfo: trial.contactInfo,
      childId: prometheus.childId
    },
    actionUrl: `https://clinicaltrials.gov/study/${trial.trialId}`
  });
}

/**
 * Notify about prediction validation result
 */
export async function notifyPredictionValidation(
  prometheusId: number,
  prediction: {
    predictionId: number;
    statement: string;
    wasCorrect: boolean;
    lessonsLearned: string[];
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  const emoji = prediction.wasCorrect ? "✅" : "❌";
  const status = prediction.wasCorrect ? "დადასტურდა" : "არ დადასტურდა";

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "prediction_validation",
    priority: prediction.wasCorrect ? "medium" : "high",
    title: `${emoji} პროგნოზი ${status}`,
    message: prediction.statement.slice(0, 200),
    metadata: {
      predictionId: prediction.predictionId,
      wasCorrect: prediction.wasCorrect,
      lessonsLearned: prediction.lessonsLearned,
      childId: prometheus.childId
    },
    actionUrl: `/prometheus/predictions?id=${prediction.predictionId}`
  });
}

/**
 * Notify about knowledge milestone
 */
export async function notifyKnowledgeMilestone(
  prometheusId: number,
  milestone: {
    type: "nodes_count" | "confidence_increase" | "first_verification";
    value: number;
    description: string;
    descriptionKa?: string;
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "knowledge_milestone",
    priority: "low",
    title: `🎯 ცოდნის მაჩვენებელი: ${milestone.description}`,
    titleKa: milestone.descriptionKa ? `🎯 ${milestone.descriptionKa}` : undefined,
    message: `PROMETHEUS reached ${milestone.value} ${milestone.type.replace(/_/g, " ")}`,
    metadata: {
      milestoneType: milestone.type,
      value: milestone.value,
      childId: prometheus.childId
    }
  });
}

/**
 * Notify about detected error
 */
export async function notifyErrorDetected(
  prometheusId: number,
  error: {
    errorType: string;
    severity: string;
    description: string;
    autoResolved: boolean;
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  const priority: NotificationPriority =
    error.severity === "critical" ? "critical" :
    error.severity === "major" ? "high" : "medium";

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "error_detected",
    priority,
    title: `⚠️ შეცდომა აღმოჩენილი: ${error.errorType}`,
    message: `${error.description}${error.autoResolved ? " (ავტომატურად გამოსწორდა)" : ""}`,
    messageKa: error.autoResolved ? "შეცდომა ავტომატურად გამოსწორდა" : "საჭიროებს ყურადღებას",
    metadata: {
      errorType: error.errorType,
      severity: error.severity,
      autoResolved: error.autoResolved,
      childId: prometheus.childId
    }
  });
}

/**
 * Notify about cross-child insight
 */
export async function notifyCrossChildInsight(
  prometheusId: number,
  insight: {
    title: string;
    titleKa?: string;
    description: string;
    descriptionKa?: string;
    caseCount: number;
    confidence: number;
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "cross_child_insight",
    priority: insight.confidence >= 80 ? "high" : "medium",
    title: `👥 ${insight.title}`,
    titleKa: insight.titleKa ? `👥 ${insight.titleKa}` : undefined,
    message: `${insight.description} (დაფუძნებული ${insight.caseCount} შემთხვევაზე)`,
    messageKa: insight.descriptionKa,
    metadata: {
      caseCount: insight.caseCount,
      confidence: insight.confidence,
      childId: prometheus.childId
    },
    actionUrl: "/prometheus/insights"
  });
}

/**
 * Notify about verification completion
 */
export async function notifyVerificationComplete(
  prometheusId: number,
  verification: {
    nodeLabel: string;
    passed: boolean;
    method: string;
    confidence: number;
  }
): Promise<PrometheusNotification | null> {
  const prometheus = await db.query.prometheusState.findFirst({
    where: eq(prometheusState.id, prometheusId)
  });

  if (!prometheus) return null;

  const child = await db.query.children.findFirst({
    where: eq(children.id, prometheus.childId)
  });

  if (!child || !child.userId) return null;

  const emoji = verification.passed ? "✅" : "❌";
  const status = verification.passed ? "დადასტურდა" : "ვერ დადასტურდა";

  return createNotification({
    prometheusId,
    userId: child.userId,
    category: "verification_complete",
    priority: verification.passed ? "low" : "high",
    title: `${emoji} ვერიფიკაცია: ${verification.nodeLabel}`,
    message: `${verification.method}: ${status} (${Math.round(verification.confidence)}% confidence)`,
    metadata: {
      nodeLabel: verification.nodeLabel,
      passed: verification.passed,
      method: verification.method,
      confidence: verification.confidence,
      childId: prometheus.childId
    }
  });
}

/**
 * Check and notify about important discoveries
 */
export async function checkAndNotifyImportantDiscoveries(
  prometheusId: number
): Promise<PrometheusNotification[]> {
  const notifications: PrometheusNotification[] = [];

  // Get high-confidence knowledge nodes that haven't been notified
  const nodes = await db.query.prometheusKnowledgeNodes.findMany({
    where: and(
      eq(prometheusKnowledgeNodes.prometheusId, prometheusId),
      gte(prometheusKnowledgeNodes.confidence, 0.85)
    ),
    orderBy: [desc(prometheusKnowledgeNodes.createdAt)],
    limit: 10
  });

  for (const node of nodes) {
    // Check if we already notified about this node
    const existingNotification = await db.query.prometheusNotifications.findFirst({
      where: and(
        eq(prometheusNotifications.prometheusId, prometheusId),
        eq(prometheusNotifications.category, "breakthrough_discovery"),
        sql`${prometheusNotifications.metadata}->>'sourceNodeId' = ${node.id.toString()}`
      )
    });

    if (!existingNotification) {
      const notification = await notifyBreakthroughDiscovery(prometheusId, {
        title: node.label,
        description: node.description || `High-confidence knowledge: ${node.label}`,
        confidence: Math.round(node.confidence * 100),
        sourceNodeId: node.id
      });

      if (notification) {
        notifications.push(notification);
      }
    }
  }

  return notifications;
}

// ============================================================================
// NOTIFICATION DIGEST
// ============================================================================

export interface NotificationDigest {
  userId: string;
  period: "daily" | "weekly";
  startDate: string;
  endDate: string;
  totalNotifications: number;
  unreadCount: number;
  byPriority: Record<NotificationPriority, number>;
  byCategory: Record<string, number>;
  highlights: PrometheusNotification[];
}

/**
 * Generate notification digest
 */
export async function generateDigest(
  userId: string,
  period: "daily" | "weekly"
): Promise<NotificationDigest> {
  const cutoffDate = new Date();
  const endDate = new Date();
  if (period === "daily") {
    cutoffDate.setDate(cutoffDate.getDate() - 1);
  } else {
    cutoffDate.setDate(cutoffDate.getDate() - 7);
  }

  // Fetch notifications from database
  const dbNotifications = await db.query.prometheusNotifications.findMany({
    where: and(
      eq(prometheusNotifications.userId, userId),
      gte(prometheusNotifications.createdAt, cutoffDate)
    ),
    orderBy: [desc(prometheusNotifications.createdAt)]
  });

  const notifications: PrometheusNotification[] = dbNotifications.map(n => ({
    id: n.id,
    prometheusId: n.prometheusId!,
    userId: n.userId,
    category: n.category as NotificationCategory,
    priority: n.priority as NotificationPriority,
    title: n.title,
    titleKa: n.titleKa || undefined,
    message: n.message,
    messageKa: n.messageKa || undefined,
    metadata: n.metadata as Record<string, any> | undefined,
    actionUrl: n.actionUrl || undefined,
    isRead: n.isRead || false,
    readAt: n.readAt || undefined,
    expiresAt: n.expiresAt || undefined,
    createdAt: n.createdAt || new Date()
  }));

  // Count by priority
  const byPriority: Record<NotificationPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  // Count by category
  const byCategory: Record<string, number> = {};

  for (const n of notifications) {
    byPriority[n.priority]++;
    byCategory[n.category] = (byCategory[n.category] || 0) + 1;
  }

  // Get highlights (top 5 by priority)
  const priorityOrder: Record<NotificationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const highlights = [...notifications]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);

  // Count unread
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (byPriority.critical > 0) {
    recommendations.push(`${byPriority.critical} კრიტიკული შეტყობინება საჭიროებს დაუყოვნებელ ყურადღებას`);
  }

  if (byCategory["clinical_trial_match"]) {
    recommendations.push("გაეცანით კლინიკური კვლევების შესაბამისობებს");
  }

  if (byCategory["new_treatment_option"]) {
    recommendations.push("განიხილეთ ახალი მკურნალობის ვარიანტები ექიმთან");
  }

  return {
    userId,
    period,
    startDate: cutoffDate.toISOString(),
    endDate: endDate.toISOString(),
    totalNotifications: notifications.length,
    unreadCount,
    byPriority,
    byCategory,
    highlights
  };
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export interface NotificationPreferences {
  userId: string;
  enabledCategories: NotificationCategory[];
  minPriority: NotificationPriority;
  emailDigest: "none" | "daily" | "weekly";
  pushEnabled: boolean;
  quietHours?: {
    start: string; // "22:00"
    end: string;   // "08:00"
  };
}

// Default preferences store
const preferencesStore: Map<string, NotificationPreferences> = new Map();

/**
 * Get notification preferences
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  return preferencesStore.get(userId) || {
    userId,
    enabledCategories: [
      "breakthrough_discovery",
      "new_treatment_option",
      "clinical_trial_match",
      "prediction_validation",
      "knowledge_milestone",
      "error_detected",
      "consolidation_complete",
      "research_update",
      "cross_child_insight",
      "verification_result"
    ],
    minPriority: "low",
    emailDigest: "daily",
    pushEnabled: true
  };
}

/**
 * Update notification preferences
 */
export async function updatePreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getPreferences(userId);
  const updated = { ...current, ...preferences, userId };
  preferencesStore.set(userId, updated);
  return updated;
}

/**
 * Check if notification should be sent based on preferences
 */
export async function shouldSendNotification(
  userId: string,
  category: NotificationCategory,
  priority: NotificationPriority
): Promise<boolean> {
  const prefs = await getPreferences(userId);

  // Check category
  if (!prefs.enabledCategories.includes(category)) {
    return false;
  }

  // Check priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  if (priorityOrder[priority] > priorityOrder[prefs.minPriority]) {
    return false;
  }

  // Check quiet hours
  if (prefs.quietHours) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    if (prefs.quietHours.start <= prefs.quietHours.end) {
      // Same day quiet hours (e.g., 08:00-18:00)
      if (currentTime >= prefs.quietHours.start && currentTime <= prefs.quietHours.end) {
        return priority === "critical"; // Only critical during quiet hours
      }
    } else {
      // Overnight quiet hours (e.g., 22:00-08:00)
      if (currentTime >= prefs.quietHours.start || currentTime <= prefs.quietHours.end) {
        return priority === "critical";
      }
    }
  }

  return true;
}
