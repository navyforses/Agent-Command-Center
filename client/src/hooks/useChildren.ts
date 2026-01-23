/**
 * useChildren Hook
 * =================
 * Custom hook for managing children data
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface Child {
  id: number;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  diagnosis?: string;
  diagnosisKa?: string;
  diagnosisDate?: string;
  notes?: string;
  notesKa?: string;
  createdAt: string;
}

export interface CreateChildData {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  diagnosis?: string;
  diagnosisKa?: string;
  diagnosisDate?: string;
  notes?: string;
  notesKa?: string;
}

export function useChildren() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all children
  const {
    data: children = [],
    isLoading,
    error,
  } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  // Create child
  const createMutation = useMutation({
    mutationFn: async (data: CreateChildData) => {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create child");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({ title: "შვილი დაემატა" });
    },
    onError: () => {
      toast({
        title: "შეცდომა",
        description: "შვილის დამატება ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  // Update child
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateChildData>;
    }) => {
      const response = await fetch(`/api/children/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update child");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({ title: "ინფორმაცია განახლდა" });
    },
  });

  // Delete child
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/children/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete child");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({ title: "ჩანაწერი წაიშალა" });
    },
  });

  // Get child by ID
  const getChildById = useMemo(() => {
    return (id: number) => children.find((c) => c.id === id);
  }, [children]);

  // Get full name
  const getFullName = useMemo(() => {
    return (child: Child) => `${child.firstName} ${child.lastName}`;
  }, []);

  return {
    // Data
    children,

    // Counts
    count: children.length,
    hasChildren: children.length > 0,

    // Loading states
    isLoading,
    error,

    // Actions
    createChild: createMutation.mutate,
    updateChild: updateMutation.mutate,
    deleteChild: deleteMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Utility functions
    getChildById,
    getFullName,
  };
}

// Hook for fetching single child
export function useChild(id: number) {
  const { data: child, isLoading, error } = useQuery<Child>({
    queryKey: ["/api/children", id],
    enabled: !!id,
  });

  return { child, isLoading, error };
}
