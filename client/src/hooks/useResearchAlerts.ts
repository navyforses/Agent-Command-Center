/**
 * useResearchAlerts Hook
 * =======================
 * Custom hook for managing research alerts and monitors
 * Provides easy access to research alert data and actions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface ResearchMonitor {
  id: number;
  userId: string;
  patientProfileId?: number;
  isActive: boolean;
  searchKeywords: string[];
  conditions: string[];
  monitorClinicalTrials: boolean;
  monitorPubmed: boolean;
  monitorDrugs: boolean;
  monitorNews: boolean;
  emailNotifications: boolean;
  notificationFrequency: string;
  lastScanAt?: string;
  createdAt: string;
}

export interface ResearchFinding {
  id: number;
  monitorId: number;
  findingType: "clinical_trial" | "article" | "drug" | "news";
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  relevanceScore: number;
  isRead: boolean;
  isSaved: boolean;
  isDismissed: boolean;
  publishedAt?: string;
  foundAt: string;
}

export interface CreateMonitorData {
  searchKeywords: string[];
  conditions: string[];
  monitorClinicalTrials?: boolean;
  monitorPubmed?: boolean;
  monitorDrugs?: boolean;
  monitorNews?: boolean;
  emailNotifications?: boolean;
  notificationFrequency?: string;
}

export function useResearchAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all monitors
  const {
    data: monitors = [],
    isLoading: monitorsLoading,
    error: monitorsError,
  } = useQuery<ResearchMonitor[]>({
    queryKey: ["/api/research-alerts/monitors"],
  });

  // Fetch all findings
  const {
    data: findings = [],
    isLoading: findingsLoading,
    error: findingsError,
  } = useQuery<ResearchFinding[]>({
    queryKey: ["/api/research-alerts/findings"],
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{
    count: number;
    findings: ResearchFinding[];
  }>({
    queryKey: ["/api/research-alerts/findings/unread"],
  });

  // Create monitor
  const createMonitorMutation = useMutation({
    mutationFn: async (data: CreateMonitorData) => {
      const response = await fetch("/api/research-alerts/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, isActive: true }),
      });
      if (!response.ok) throw new Error("Failed to create monitor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/monitors"] });
      toast({ title: "მონიტორი შეიქმნა" });
    },
    onError: () => {
      toast({
        title: "შეცდომა",
        description: "მონიტორის შექმნა ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  // Delete monitor
  const deleteMonitorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/research-alerts/monitors/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete monitor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/monitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
      toast({ title: "მონიტორი წაიშალა" });
    },
  });

  // Toggle monitor active state
  const toggleMonitorMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/research-alerts/monitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to update monitor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/monitors"] });
    },
  });

  // Scan for new research
  const scanMutation = useMutation({
    mutationFn: async (monitorId: number) => {
      const response = await fetch(
        `/api/research-alerts/monitors/${monitorId}/scan`,
        { method: "POST", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to scan");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/research-alerts/findings/unread"],
      });
      toast({
        title: "სკანირება დასრულდა",
        description: `ნაპოვნია ${data.findingsCount} ახალი კვლევა`,
      });
    },
  });

  // Mark finding as read
  const markAsReadMutation = useMutation({
    mutationFn: async (findingId: number) => {
      const response = await fetch(
        `/api/research-alerts/findings/${findingId}/read`,
        { method: "PATCH", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/research-alerts/findings/unread"],
      });
    },
  });

  // Save/unsave finding
  const saveFindingMutation = useMutation({
    mutationFn: async ({ id, saved }: { id: number; saved: boolean }) => {
      const response = await fetch(`/api/research-alerts/findings/${id}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ saved }),
      });
      if (!response.ok) throw new Error("Failed to save finding");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
    },
  });

  // Dismiss finding
  const dismissFindingMutation = useMutation({
    mutationFn: async (findingId: number) => {
      const response = await fetch(
        `/api/research-alerts/findings/${findingId}/dismiss`,
        { method: "PATCH", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to dismiss");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/research-alerts/findings/unread"],
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        "/api/research-alerts/findings/mark-all-read",
        { method: "POST", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/research-alerts/findings/unread"],
      });
      toast({ title: "ყველა წაკითხულია" });
    },
  });

  // Computed values
  const unreadFindings = findings.filter((f) => !f.isRead && !f.isDismissed);
  const savedFindings = findings.filter((f) => f.isSaved);
  const activeMonitors = monitors.filter((m) => m.isActive);

  return {
    // Data
    monitors,
    findings,
    unreadFindings,
    savedFindings,
    activeMonitors,
    unreadCount: unreadData?.count || 0,

    // Loading states
    isLoading: monitorsLoading || findingsLoading,
    monitorsLoading,
    findingsLoading,

    // Errors
    error: monitorsError || findingsError,

    // Actions
    createMonitor: createMonitorMutation.mutate,
    deleteMonitor: deleteMonitorMutation.mutate,
    toggleMonitor: toggleMonitorMutation.mutate,
    scanForResearch: scanMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    saveFinding: saveFindingMutation.mutate,
    dismissFinding: dismissFindingMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,

    // Mutation states
    isCreating: createMonitorMutation.isPending,
    isDeleting: deleteMonitorMutation.isPending,
    isScanning: scanMutation.isPending,
  };
}
