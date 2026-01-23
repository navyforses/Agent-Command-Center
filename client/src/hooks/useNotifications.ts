/**
 * useNotifications Hook
 * ======================
 * Simplified hook for notification management
 * Wraps NotificationContext with additional utility functions
 */

import { useCallback, useMemo } from "react";
import {
  useNotificationContext,
  type Notification,
  type NotificationType,
} from "@/contexts/NotificationContext";

interface NotificationOptions {
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export function useNotifications() {
  const context = useNotificationContext();

  // Filter notifications by type
  const filterByType = useCallback(
    (type: NotificationType) => {
      return context.notifications.filter((n) => n.type === type);
    },
    [context.notifications]
  );

  // Get notifications by type
  const researchAlerts = useMemo(
    () => filterByType("research_alert"),
    [filterByType]
  );

  const appointmentReminders = useMemo(
    () => filterByType("appointment_reminder"),
    [filterByType]
  );

  const systemNotifications = useMemo(
    () => filterByType("system"),
    [filterByType]
  );

  // Convenience methods for adding notifications
  const notifySuccess = useCallback(
    (title: string, message: string, options?: NotificationOptions) => {
      context.addNotification({
        type: "success",
        title,
        message,
        ...options,
      });
    },
    [context]
  );

  const notifyError = useCallback(
    (title: string, message: string, options?: NotificationOptions) => {
      context.addNotification({
        type: "error",
        title,
        message,
        ...options,
      });
    },
    [context]
  );

  const notifyInfo = useCallback(
    (title: string, message: string, options?: NotificationOptions) => {
      context.addNotification({
        type: "info",
        title,
        message,
        ...options,
      });
    },
    [context]
  );

  const notifySystem = useCallback(
    (title: string, message: string, options?: NotificationOptions) => {
      context.addNotification({
        type: "system",
        title,
        message,
        ...options,
      });
    },
    [context]
  );

  // Get recent notifications
  const recentNotifications = useMemo(() => {
    return context.notifications.slice(0, 5);
  }, [context.notifications]);

  // Get unread notifications only
  const unreadNotifications = useMemo(() => {
    return context.notifications.filter((n) => !n.read);
  }, [context.notifications]);

  // Check if there are unread of specific type
  const hasUnread = useCallback(
    (type?: NotificationType) => {
      if (type) {
        return context.notifications.some((n) => n.type === type && !n.read);
      }
      return context.unreadCount > 0;
    },
    [context.notifications, context.unreadCount]
  );

  // Get notification by ID
  const getNotification = useCallback(
    (id: string): Notification | undefined => {
      return context.notifications.find((n) => n.id === id);
    },
    [context.notifications]
  );

  return {
    // From context
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    researchAlertsCount: context.researchAlertsCount,
    appointmentRemindersCount: context.appointmentRemindersCount,
    isLoading: context.isLoading,

    // Actions from context
    addNotification: context.addNotification,
    markAsRead: context.markAsRead,
    markAllAsRead: context.markAllAsRead,
    dismissNotification: context.dismissNotification,
    clearAll: context.clearAll,

    // Filtered lists
    researchAlerts,
    appointmentReminders,
    systemNotifications,
    recentNotifications,
    unreadNotifications,

    // Convenience methods
    notifySuccess,
    notifyError,
    notifyInfo,
    notifySystem,

    // Utility functions
    filterByType,
    hasUnread,
    getNotification,
  };
}

// Re-export types for convenience
export type { Notification, NotificationType } from "@/contexts/NotificationContext";
