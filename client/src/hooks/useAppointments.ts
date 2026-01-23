/**
 * useAppointments Hook
 * =====================
 * Custom hook for managing appointments and calendar data
 * Provides easy access to appointment data and actions
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface Appointment {
  id: number;
  userId: string;
  childId?: number;
  title: string;
  description?: string;
  location?: string;
  appointmentDate: string;
  endDate?: string;
  status?: string;
  reminderSent?: boolean;
  createdAt: string;
}

export interface CreateAppointmentData {
  title: string;
  description?: string;
  location?: string;
  appointmentDate: string;
  endDate?: string;
  childId?: number;
  status?: string;
}

export interface ExtractedAppointment {
  title: string;
  description?: string;
  location?: string;
  appointmentDate: string;
  endDate?: string;
  confidence: number;
  validation?: {
    valid: boolean;
    errors: string[];
  };
}

export function useAppointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all appointments
  const {
    data: appointments = [],
    isLoading,
    error,
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Create appointment
  const createMutation = useMutation({
    mutationFn: async (data: CreateAppointmentData) => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "ვიზიტი დაემატა" });
    },
    onError: () => {
      toast({
        title: "შეცდომა",
        description: "ვიზიტის დამატება ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  // Update appointment
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateAppointmentData>;
    }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "ვიზიტი განახლდა" });
    },
  });

  // Delete appointment
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "ვიზიტი წაიშალა" });
    },
  });

  // Extract appointments from email
  const extractMutation = useMutation({
    mutationFn: async ({
      emailText,
      emailSubject,
    }: {
      emailText: string;
      emailSubject?: string;
    }) => {
      const response = await fetch("/api/appointments/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailText, emailSubject }),
      });
      if (!response.ok) throw new Error("Failed to extract appointments");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.appointments.length === 0) {
        toast({
          title: "ვიზიტები ვერ მოიძებნა",
          description: "ტექსტში ვიზიტები ვერ აღმოჩნდა",
        });
      } else {
        toast({
          title: "ვიზიტები აღმოჩენილია",
          description: `ნაპოვნია ${data.appointments.length} ვიზიტი`,
        });
      }
    },
    onError: () => {
      toast({
        title: "შეცდომა",
        description: "ვიზიტების ამოღება ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  // Confirm extracted appointments
  const confirmExtractedMutation = useMutation({
    mutationFn: async ({
      appointments,
      childId,
    }: {
      appointments: ExtractedAppointment[];
      childId?: number;
    }) => {
      const response = await fetch("/api/appointments/extract/confirm-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appointments: appointments.map((apt) => ({
            title: apt.title,
            description: apt.description,
            location: apt.location,
            appointmentDate: apt.appointmentDate,
            endDate: apt.endDate,
          })),
          childId,
        }),
      });
      if (!response.ok) throw new Error("Failed to confirm appointments");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "ვიზიტები შენახულია",
        description: `${data.savedCount} ვიზიტი დაემატა კალენდარში`,
      });
    },
  });

  // Computed values
  const now = new Date();

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((apt) => new Date(apt.appointmentDate) >= now)
        .sort(
          (a, b) =>
            new Date(a.appointmentDate).getTime() -
            new Date(b.appointmentDate).getTime()
        ),
    [appointments, now]
  );

  const pastAppointments = useMemo(
    () =>
      appointments
        .filter((apt) => new Date(apt.appointmentDate) < now)
        .sort(
          (a, b) =>
            new Date(b.appointmentDate).getTime() -
            new Date(a.appointmentDate).getTime()
        ),
    [appointments, now]
  );

  const todayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= today && aptDate < tomorrow;
    });
  }, [appointments]);

  const appointmentsThisWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= today && aptDate < weekLater;
    });
  }, [appointments]);

  // Group appointments by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const dateKey = new Date(apt.appointmentDate).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(apt);
    });
    return groups;
  }, [appointments]);

  return {
    // Data
    appointments,
    upcomingAppointments,
    pastAppointments,
    todayAppointments,
    appointmentsThisWeek,
    groupedByDate,

    // Counts
    totalCount: appointments.length,
    upcomingCount: upcomingAppointments.length,
    todayCount: todayAppointments.length,

    // Loading states
    isLoading,
    error,

    // Actions
    createAppointment: createMutation.mutate,
    updateAppointment: updateMutation.mutate,
    deleteAppointment: deleteMutation.mutate,
    extractFromEmail: extractMutation.mutateAsync,
    confirmExtracted: confirmExtractedMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isExtracting: extractMutation.isPending,
    isConfirming: confirmExtractedMutation.isPending,

    // Extraction results
    extractedAppointments: extractMutation.data?.appointments || [],
  };
}
