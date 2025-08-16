"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateLessonRequest, LessonResponse } from "@driveflow/contracts";

// Additional interfaces for instructors and services
interface Instructor {
  id: string;
  displayName: string;
  available: boolean;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

// API base URL
const API_BASE = "http://localhost:3001/api";

// Query keys for cache management
export const lessonKeys = {
  all: ["lessons"] as const,
  lists: () => [...lessonKeys.all, "list"] as const,
  list: (filters?: string) => [...lessonKeys.lists(), { filters }] as const,
  details: () => [...lessonKeys.all, "detail"] as const,
  detail: (id: string) => [...lessonKeys.details(), id] as const,
};

export const instructorKeys = {
  all: ["instructors"] as const,
  lists: () => [...instructorKeys.all, "list"] as const,
};

export const serviceKeys = {
  all: ["services"] as const,
  lists: () => [...serviceKeys.all, "list"] as const,
};

// Fetch all lessons
async function fetchLessons(): Promise<LessonResponse[]> {
  const response = await fetch(`${API_BASE}/lessons`);
  if (!response.ok) {
    throw new Error(`Failed to fetch lessons: ${response.status}`);
  }
  return response.json();
}

// Fetch all instructors
async function fetchInstructors(): Promise<Instructor[]> {
  const response = await fetch(`${API_BASE}/instructors`);
  if (!response.ok) {
    throw new Error(`Failed to fetch instructors: ${response.status}`);
  }
  return response.json();
}

// Fetch all services
async function fetchServices(): Promise<Service[]> {
  const response = await fetch(`${API_BASE}/services`);
  if (!response.ok) {
    throw new Error(`Failed to fetch services: ${response.status}`);
  }
  return response.json();
}

// Create a new lesson
async function createLesson(
  lessonData: CreateLessonRequest,
): Promise<LessonResponse> {
  const response = await fetch(`${API_BASE}/lessons`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lessonData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create lesson: ${response.status}`);
  }

  return response.json();
}

// Update lesson status (for demo purposes)
async function updateLessonStatus(
  id: string,
  status: string,
): Promise<LessonResponse> {
  // Since our simple controller doesn't have update endpoint yet,
  // this is a placeholder for future implementation
  const response = await fetch(`${API_BASE}/lessons/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update lesson: ${response.status}`);
  }

  return response.json();
}

// Hook to fetch all lessons
export function useLessons() {
  return useQuery({
    queryKey: lessonKeys.lists(),
    queryFn: fetchLessons,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for live updates
  });
}

// Hook to create a lesson with optimistic updates
export function useCreateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLesson,

    // Optimistic update: immediately add the lesson to cache
    onMutate: async (newLesson) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: lessonKeys.lists() });

      // Snapshot the previous value
      const previousLessons = queryClient.getQueryData<LessonResponse[]>(
        lessonKeys.lists(),
      );

      // Optimistically update to the new value
      if (previousLessons) {
        const optimisticLesson: LessonResponse = {
          id: `temp_${Date.now()}`, // Temporary ID
          studentId: "student_default",
          instructorId: newLesson.instructorId,
          serviceId: newLesson.serviceId,
          startAt: newLesson.startAt,
          endAt: newLesson.endAt,
          pickupAddress: newLesson.pickupAddress,
          dropoffAddress: newLesson.dropoffAddress,
          notes: newLesson.notes,
          status: "requested",
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData<LessonResponse[]>(lessonKeys.lists(), [
          ...previousLessons,
          optimisticLesson,
        ]);
      }

      // Return a context object with the snapshotted value
      return { previousLessons };
    },

    // If the mutation succeeds, use the returned data
    onSuccess: (data) => {
      // Update cache with the real data from server
      queryClient.setQueryData<LessonResponse[]>(lessonKeys.lists(), (old) => {
        if (!old) return [data];
        // Replace the optimistic entry with real data
        return old.map((lesson) =>
          lesson.id.startsWith("temp_") ? data : lesson,
        );
      });
    },

    // If the mutation fails, rollback
    onError: (err, variables, context) => {
      if (context?.previousLessons) {
        queryClient.setQueryData(lessonKeys.lists(), context.previousLessons);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });
    },
  });
}

// Hook to update lesson status (future implementation)
export function useUpdateLessonStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateLessonStatus(id, status),

    // Optimistic update for status changes
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: lessonKeys.lists() });

      const previousLessons = queryClient.getQueryData<LessonResponse[]>(
        lessonKeys.lists(),
      );

      if (previousLessons) {
        queryClient.setQueryData<LessonResponse[]>(
          lessonKeys.lists(),
          previousLessons.map((lesson) =>
            lesson.id === id ? { ...lesson, status } : lesson,
          ),
        );
      }

      return { previousLessons };
    },

    onError: (err, variables, context) => {
      if (context?.previousLessons) {
        queryClient.setQueryData(lessonKeys.lists(), context.previousLessons);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });
    },
  });
}

// Hook to fetch all instructors
export function useInstructors() {
  return useQuery({
    queryKey: instructorKeys.lists(),
    queryFn: fetchInstructors,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchInterval: false, // Don't auto-refetch for instructors (static data)
  });
}

// Hook to fetch all services
export function useServices() {
  return useQuery({
    queryKey: serviceKeys.lists(),
    queryFn: fetchServices,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchInterval: false, // Don't auto-refetch for services (static data)
  });
}

// Export types for use in components
export type { Instructor, Service };
