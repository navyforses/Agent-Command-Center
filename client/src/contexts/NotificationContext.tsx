/**
 * NotificationContext
 * ====================
 * Manages app-wide notifications including:
 * - Research alerts (new findings)
 * - Appointment reminders
 * - System notifications
 * - Toast-style notifications
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export type NotificationType =
  | "research_alert"
  | "appointment_reminder"
  | "system"
  | "success"
  | "error"
  | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  researchAlertsCount: number;
  appointmentRemindersCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Generate unique ID
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Fetch research alert notifications
  const { data: researchData, isLoading: researchLoading } = useQuery<{
    count: number;
    findings: any[];
  }>({
    queryKey: ["/api/research-alerts/findings/unread"],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch upcoming appointments for reminders
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Convert research findings to notifications
  useEffect(() => {
    if (researchData?.findings) {
      const researchNotifications: Notification[] = researchData.findings.map(
        (finding: any) => ({
          id: `research_${finding.id}`,
          type: "research_alert" as NotificationType,
          title: "ახალი კვლევა",
          message: finding.title,
          timestamp: new Date(finding.foundAt),
          read: finding.isRead,
          actionUrl: finding.sourceUrl,
          actionLabel: "ნახვა",
          metadata: { findingId: finding.id },
        })
      );

      setLocalNotifications((prev) => {
        // Merge with existing non-research notifications
        const nonResearch = prev.filter((n) => n.type !== "research_alert");
        return [...nonResearch, ...researchNotifications];
      });
    }
  }, [researchData]);

  // Check for upcoming appointment reminders
  useEffect(() => {
    if (appointments.length > 0) {
      const now = new Date();
      const upcoming = appointments
        .filter((apt: any) => {
          const aptDate = new Date(apt.appointmentDate);
          const diffHours = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          return diffHours > 0 && diffHours <= 24; // Within next 24 hours
        })
        .map((apt: any) => ({
          id: `appointment_${apt.id}`,
          type: "appointment_reminder" as NotificationType,
          title: "მომავალი ვიზიტი",
          message: apt.title,
          timestamp: new Date(),
          read: false,
          actionUrl: "/calendar",
          actionLabel: "კალენდარი",
          metadata: { appointmentId: apt.id, appointmentDate: apt.appointmentDate },
        }));

      setLocalNotifications((prev) => {
        const nonAppointment = prev.filter((n) => n.type !== "appointment_reminder");
        return [...nonAppointment, ...upcoming];
      });
    }
  }, [appointments]);

  // Add new notification
  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        timestamp: new Date(),
        read: false,
      };

      setLocalNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

  // Mark notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );

      // If it's a research notification, also mark on server
      if (id.startsWith("research_")) {
        const findingId = id.replace("research_", "");
        try {
          await fetch(`/api/research-alerts/findings/${findingId}/read`, {
            method: "PATCH",
            credentials: "include",
          });
          queryClient.invalidateQueries({
            queryKey: ["/api/research-alerts/findings/unread"],
          });
        } catch (error) {
          console.error("Failed to mark finding as read:", error);
        }
      }
    },
    [queryClient]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Mark all research findings as read on server
    try {
      await fetch("/api/research-alerts/findings/mark-all-read", {
        method: "POST",
        credentials: "include",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/research-alerts/findings/unread"],
      });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [queryClient]);

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setLocalNotifications([]);
  }, []);

  // Calculate counts
  const unreadCount = localNotifications.filter((n) => !n.read).length;
  const researchAlertsCount = localNotifications.filter(
    (n) => n.type === "research_alert" && !n.read
  ).length;
  const appointmentRemindersCount = localNotifications.filter(
    (n) => n.type === "appointment_reminder" && !n.read
  ).length;

  const isLoading = researchLoading || appointmentsLoading;

  return (
    <NotificationContext.Provider
      value={{
        notifications: localNotifications.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        ),
        unreadCount,
        researchAlertsCount,
        appointmentRemindersCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearAll,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  }
  return context;
}
