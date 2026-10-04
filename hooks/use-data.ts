/**
 * Aura360 — Custom React Query hooks for data fetching
 *
 * These hooks replace the ad-hoc fetch + useState patterns across
 * client managers with proper caching, background refetch, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  notifications: () => ["notifications"] as const,
  unreadCount: () => ["notifications", "unread"] as const,
  transactions: (filters?: Record<string, any>) => ["transactions", filters] as const,
  notes: (filters?: Record<string, any>) => ["notes", filters] as const,
  fitness: (filters?: Record<string, any>) => ["fitness", filters] as const,
  food: (filters?: Record<string, any>) => ["food", filters] as const,
  timeLogs: (filters?: Record<string, any>) => ["timeLogs", filters] as const,
} as const

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: async () => {
      const res = await fetch(`/api/notifications?limit=30${unreadOnly ? "&unread=true" : ""}`)
      if (!res.ok) throw new Error("Failed to fetch notifications")
      return res.json() as Promise<{ notifications: any[]; unreadCount: number }>
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // poll every 2 min
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      })
      if (!res.ok) throw new Error("Failed to mark as read")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
    },
    onError: () => {
      toast.error("Failed to update notifications")
    },
  })
}

// ─── Time Logs ────────────────────────────────────────────────────────────────

export function useTimeLogs(filters?: { from?: string; to?: string; category?: string }) {
  return useQuery({
    queryKey: queryKeys.timeLogs(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.from) params.set("from", filters.from)
      if (filters?.to) params.set("to", filters.to)
      if (filters?.category) params.set("category", filters.category)
      const res = await fetch(`/api/time?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch time logs")
      return res.json()
    },
    staleTime: 30 * 1000,
  })
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function useNotes(filters?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.notes(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.category) params.set("category", filters.category)
      if (filters?.search) params.set("search", filters.search)
      const res = await fetch(`/api/notes?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch notes")
      return res.json()
    },
    staleTime: 30 * 1000,
  })
}

// ─── Fitness ─────────────────────────────────────────────────────────────────

export function useFitnessLogs(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.fitness(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.from) params.set("from", filters.from)
      if (filters?.to) params.set("to", filters.to)
      const res = await fetch(`/api/fitness?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch fitness logs")
      return res.json()
    },
    staleTime: 30 * 1000,
  })
}

// ─── Generic Optimistic Mutation Helper ───────────────────────────────────────

export function useOptimisticDelete(queryKey: readonly unknown[], deleteFn: (id: string) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFn,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: any) => {
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id)
        if (old?.data && Array.isArray(old.data)) return { ...old, data: old.data.filter((item: any) => item.id !== id) }
        return old
      })
      return { previous }
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(queryKey, context?.previous)
      toast.error("Failed to delete item")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
