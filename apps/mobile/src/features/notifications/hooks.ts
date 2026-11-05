import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { InboxResponse, ServerPrefs, TestResult } from './types';

export const notificationKeys = {
  inbox: ['notifications', 'inbox'] as const,
  prefs: ['notifications', 'prefs'] as const,
};

const loadInbox = () => api<InboxResponse>('/api/notifications', { query: { limit: 50 } });

/** The in-app notification list (what the web bell shows). */
export function useInbox() {
  return useQuery({ queryKey: notificationKeys.inbox, queryFn: loadInbox, refetchInterval: 60_000 });
}

/** Just the unread count, for the bell badge. Shares the inbox request, so it costs nothing extra. */
export function useUnreadCount() {
  return useQuery({ queryKey: notificationKeys.inbox, queryFn: loadInbox, refetchInterval: 60_000, select: (data) => data.unreadCount });
}

/** Mark some notifications as read, or all of them when no ids are given. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api('/api/notifications', { method: 'PATCH', body: ids && ids.length > 0 ? { ids } : {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.inbox }),
  });
}

export function useServerPrefs() {
  return useQuery({
    queryKey: notificationKeys.prefs,
    queryFn: () => api<{ prefs: ServerPrefs; devices: number }>('/api/notifications/preferences'),
  });
}

export function useSaveServerPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: ServerPrefs) => api<{ prefs: ServerPrefs }>('/api/notifications/preferences', { method: 'PUT', body: prefs }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.prefs }),
  });
}

/** Sends a test through the server on every channel that is on (in-app, email, phone push). */
export function useSendTestNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api<{ result: TestResult }>('/api/notifications/test', { method: 'POST' })).result,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.inbox }),
  });
}
