/**
 * UserPreferencesContext
 * =======================
 * Manages user preferences that affect the UI and behavior
 * Syncs with backend for persistent storage
 */

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UserPreferences {
  // Notification preferences
  emailNotifications: boolean;
  appointmentReminders: boolean;
  clinicalTrialAlerts: boolean;
  researchAlerts: boolean;

  // Privacy preferences
  dataSharing: boolean;

  // Display preferences
  language: "ka" | "en" | "ru";
  theme: "light" | "dark" | "system";

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: "small" | "medium" | "large";

  // Dashboard customization
  dashboardLayout: "compact" | "comfortable" | "spacious";
  showAIDailyBrief: boolean;
  showQuickLog: boolean;
  showResearchAlerts: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  appointmentReminders: true,
  clinicalTrialAlerts: true,
  researchAlerts: true,
  dataSharing: false,
  language: "ka",
  theme: "light",
  reducedMotion: false,
  highContrast: false,
  fontSize: "medium",
  dashboardLayout: "comfortable",
  showAIDailyBrief: true,
  showQuickLog: true,
  showResearchAlerts: true,
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(
  undefined
);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user preferences from API
  const { data: serverPrefs, isLoading } = useQuery<Partial<UserPreferences>>({
    queryKey: ["/api/profile/preferences"],
    enabled: isAuthenticated,
  });

  // Merge server preferences with defaults
  const preferences: UserPreferences | null = serverPrefs
    ? { ...DEFAULT_PREFERENCES, ...serverPrefs }
    : isAuthenticated
    ? DEFAULT_PREFERENCES
    : null;

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const response = await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/preferences"] });
    },
    onError: (error: Error) => {
      toast({
        title: "შეცდომა",
        description: "პარამეტრების შენახვა ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      await updateMutation.mutateAsync(updates);
    },
    [updateMutation]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    await updateMutation.mutateAsync(DEFAULT_PREFERENCES);
    toast({
      title: "პარამეტრები აღდგენილია",
      description: "ნაგულისხმევი პარამეტრები აღდგა",
    });
  }, [updateMutation, toast]);

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        updatePreferences,
        resetToDefaults,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error(
      "useUserPreferences must be used within UserPreferencesProvider"
    );
  }
  return context;
}

export { DEFAULT_PREFERENCES };
