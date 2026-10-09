import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { dashboardKey } from '@/features/dashboard/use-dashboard';
import { api } from '@/lib/api';

import type { TimeLog, TimeLogInput } from './types';

export const timeKeys = {
  all: ['time'] as const,
  range: (from: string, to: string) => ['time', 'range', from, to] as const,
};

/** Time logs between two days (YYYY-MM-DD, inclusive), newest first. */
export function useTimeLogs(from: string, to: string) {
  return useQuery({
    queryKey: timeKeys.range(from, to),
    queryFn: () => api<TimeLog[]>('/api/time', { query: { from, to } }),
  });
}

function useInvalidateTime() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: timeKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

export function useSaveTimeLog() {
  const invalidate = useInvalidateTime();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TimeLogInput }) =>
      id
        ? api<TimeLog>('/api/time', { method: 'PATCH', query: { id }, body: input })
        : api<TimeLog>('/api/time', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteTimeLog() {
  const invalidate = useInvalidateTime();
  return useMutation({
    mutationFn: (id: string) => api('/api/time', { method: 'DELETE', query: { id } }),
    onSuccess: invalidate,
  });
}

// ─── Running timer ────────────────────────────────────────────────────────────

export type RunningTimer = { activity: string; category: string | null; startedAt: number };

const TIMER_KEY = 'aura.time.runningTimer';

/**
 * A stopwatch that keeps running when the app is closed: only the start time is stored,
 * the elapsed time is always worked out from it.
 */
export function useRunningTimer() {
  const [timer, setTimer] = useState<RunningTimer | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(TIMER_KEY)
      .then((raw) => {
        if (!cancelled && raw) setTimer(JSON.parse(raw) as RunningTimer);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback((activity: string, category: string | null) => {
    const next: RunningTimer = { activity, category, startedAt: Date.now() };
    setTimer(next);
    AsyncStorage.setItem(TIMER_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    setTimer(null);
    AsyncStorage.removeItem(TIMER_KEY).catch(() => {});
  }, []);

  return { timer, loaded, start, clear };
}
