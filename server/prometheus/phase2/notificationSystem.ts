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
  users,
  children
} from "../../../shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

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
  | "error_detected"
  | "consolidation_complete"
  | "research_update"
  | "cross_child_insight"
  | "verification_result";

export interface PrometheusNotification {
  id: string;
  prometheusId: number;
  childId: number;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  titleKa?: string;
  message: string;
  messageKa?: string;
  data?: Record<string, any>;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// In-memory notification store (would be database in production)
const notificationStore: Map<string, PrometheusNotification[]> = new Map();

// Notification subscribers (for real-time updates)
type NotificationCallback = (notification: PrometheusNotification) => void;
const subscribers: Map<string, NotificationCallback[]> = new Map();

// ============================================================================
// NOTIFICATION CREATION
// ============================================================================

/**
 * Create a new notification
 */
export async function createNotification(
  notification: Omit<PrometheusNotification, "id" | "read" | "createdAt">
): Promise<PrometheusNotification> {
  const newNotification: PrometheusNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    read: false,
    createdAt: new Date()
  };

  // Store notification
  const userNotifications = notificationStore.get(notification.userId) || [];
  userNotifications.unshift(newNotification);

  // Keep only last 100 notifications per user
  if (userNotifications.length > 100) {
    userNotifications.splice(100);
  }

  notificationStore.set(notification.userId, userNotifications);

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
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    limit?: number;
    childId?: number;
  } = {}
): Promise<PrometheusNotification[]> {
  const { unreadOnly, category, priority, limit = 50, childId } = options;

  let notifications = notificationStore.get(userId) || [];

  if (unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }

  if (category) {
    notifications = notifications.filter(n => n.category === category);
  }

  if (priority) {
    notifications = notifications.filter(n => n.priority === priority);
  }

  if (childId) {
    notifications = notifications.filter(n => n.childId === childId);
  }

  // Filter expired
  const now = new Date();
  notifications = notifications.filter(n => !n.expiresAt || n.expiresAt > now);

  return notifications.slice(0, limit);
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const notifications = notificationStore.get(userId) || [];
  return notifications.filter(n => !n.read).length;
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const notifications = notificationStore.get(userId) || [];
  const notification = notifications.find(n => n.id === notificationId);

  if (notification) {
    notification.read = true;
    return true;
  }

  return false;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const notifications = notificationStore.get(userId) || [];
  let count = 0;

  for (const notification of notifications) {
    if (!notification.read) {
      notification.read = true;
      count++;
    }
  }

  return count;
}

/**
 * Delete notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const notifications = notificationStore.get(userId) || [];
  const index = notifications.findIndex(n => n.id === notificationId);

  if (index > -1) {
    notifications.splice(index, 1);
    return true;
  }

  return false;
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
    childId: prometheus.childId,
    userId: child.userId,
    category: "breakthrough_discovery",
    priority,
    title: `🔬 ${discovery.title}`,
    titleKa: discovery.titleKa ? `🔬 ${discovery.titleKa}` : undefined,
    message: discovery.description,
    messageKa: discovery.descriptionKa,
    data: {
      confidence: discovery.confidence,
      sourceNodeId: discovery.sourceNodeId
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
    childId: prometheus.childId,
    userId: child.userId,
    category: "new_treatment_option",
    priority: "high",
    title: `💊 ახალი მკურნალობის ვარიანტი: ${treatment.name}`,
    titleKa: treatment.nameKa ? `💊 ახალი მკურნალობის ვარიანტი: ${treatment.nameKa}` : undefined,
    message: treatment.description,
    messageKa: treatment.descriptionKa,
    data: {
      treatmentName: treatment.name,
      evidenceLevel: treatment.evidenceLevel
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
    childId: prometheus.childId,
    userId: child.userId,
    category: "clinical_trial_match",
    priority: "critical",
    title: `🏥 კლინიკური კვლევის შესაბამისობა: ${trial.title}`,
    titleKa: `🏥 კლინიკური კვლევის შესაბამისობა`,
    message: `Phase ${trial.phase} trial in ${trial.location}. ${trial.eligibilitySummary}`,
    messageKa: `ფაზა ${trial.phase} კვლევა ${trial.location}-ში.`,
    data: {
      trialId: trial.trialId,
      phase: trial.phase,
      location: trial.location,
      contactInfo: trial.contactInfo
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
    childId: prometheus.childId,
    userId: child.userId,
    category: "prediction_validation",
    priority: prediction.wasCorrect ? "medium" : "high",
    title: `${emoji} პროგნოზი ${status}`,
    message: prediction.statement.slice(0, 200),
    data: {
      predictionId: prediction.predictionId,
      wasCorrect: prediction.wasCorrect,
      lessonsLearned: prediction.lessonsLearned
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
    childId: prometheus.childId,
    userId: child.userId,
    category: "knowledge_milestone",
    priority: "low",
    title: `🎯 ცოდნის მაჩვენებელი: ${milestone.description}`,
    titleKa: milestone.descriptionKa ? `🎯 ${milestone.descriptionKa}` : undefined,
    message: `PROMETHEUS reached ${milestone.value} ${milestone.type.replace(/_/g, " ")}`,
    data: {
      milestoneType: milestone.type,
      value: milestone.value
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
    childId: prometheus.childId,
    userId: child.userId,
    category: "error_detected",
    priority,
    title: `⚠️ შეცდომა აღმოჩენილი: ${error.errorType}`,
    message: `${error.description}${error.autoResolved ? " (ავტომატურად გამოსწორდა)" : ""}`,
    messageKa: error.autoResolved ? "შეცდომა ავტომატურად გამოსწორდა" : "საჭიროებს ყურადღებას",
    data: {
      errorType: error.errorType,
      severity: error.severity,
      autoResolved: error.autoResolved
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
    childId: prometheus.childId,
    userId: child.userId,
    category: "cross_child_insight",
    priority: insight.confidence >= 80 ? "high" : "medium",
    title: `👥 ${insight.title}`,
    titleKa: insight.titleKa ? `👥 ${insight.titleKa}` : undefined,
    message: `${insight.description} (დაფუძნებული ${insight.caseCount} შემთხვევაზე)`,
    messageKa: insight.descriptionKa,
    data: {
      caseCount: insight.caseCount,
      confidence: insight.confidence
    },
    actionUrl: "/prometheus/insights"
  });
}

// ============================================================================
// NOTIFICATION DIGEST
// ============================================================================

export interface NotificationDigest {
  userId: string;
  period: "daily" | "weekly";
  generatedAt: Date;
  summary: {
    totalNotifications: number;
    byPriority: Record<NotificationPriority, number>;
    byCategory: Record<string, number>;
  };
  highlights: PrometheusNotification[];
  recommendations: string[];
}

/**
 * Generate notification digest
 */
export async function generateDigest(
  userId: string,
  period: "daily" | "weekly"
): Promise<NotificationDigest> {
  const cutoffDate = new Date();
  if (period === "daily") {
    cutoffDate.setDate(cutoffDate.getDate() - 1);
  } else {
    cutoffDate.setDate(cutoffDate.getDate() - 7);
  }

  const notifications = (notificationStore.get(userId) || [])
    .filter(n => n.createdAt >= cutoffDate);

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
  const highlights = [...notifications]
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);

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
    generatedAt: new Date(),
    summary: {
      totalNotifications: notifications.length,
      byPriority,
      byCategory
    },
    highlights,
    recommendations
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
