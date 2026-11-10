import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toIsoDay } from '@/components/ui/date-field';
import { dashboardKey } from '@/features/dashboard/use-dashboard';
import { api } from '@/lib/api';

import type { CoachProgram, CreateFitnessInput, FitnessEntry, FitnessInput, Readiness, Substitution } from './types';

export const fitnessKeys = {
  all: ['fitness'] as const,
  list: (from?: string, to?: string) => ['fitness', 'list', { from, to }] as const,
  readiness: ['fitness', 'readiness'] as const,
};

/** Entries between two days (YYYY-MM-DD, inclusive), newest first. With no dates, every entry. */
export function useFitnessEntries(from?: string, to?: string) {
  return useQuery({
    queryKey: fitnessKeys.list(from, to),
    queryFn: () =>
      api<FitnessEntry[]>('/api/fitness', {
        query: {
          from: from || undefined,
          to: to || undefined,
        },
      }),
  });
}

/** The last `days` days up to today; the key only changes when the calendar day does. */
export function useRecentFitness(days = 120) {
  const to = toIsoDay(new Date());
  const start = new Date();
  start.setDate(start.getDate() - days);
  return useFitnessEntries(toIsoDay(start), to);
}

function useInvalidateFitness() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: fitnessKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

export function useCreateFitnessEntry() {
  const invalidate = useInvalidateFitness();
  return useMutation({
    mutationFn: (body: CreateFitnessInput) =>
      api<FitnessEntry>('/api/fitness', {
        method: 'POST',
        body,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateFitnessEntry() {
  const invalidate = useInvalidateFitness();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateFitnessInput> & { id: string }) =>
      api<FitnessEntry>('/api/fitness', {
        method: 'PATCH',
        query: { id },
        body,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteFitnessEntry() {
  const invalidate = useInvalidateFitness();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ success: boolean }>('/api/fitness', {
        method: 'DELETE',
        query: { id },
      }),
    onSuccess: invalidate,
  });
}

/** Create-or-update in one call (used by the entry form and the live workout). */
export function useSaveFitness() {
  const invalidate = useInvalidateFitness();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: FitnessInput }) =>
      id
        ? api<FitnessEntry>('/api/fitness', { method: 'PATCH', query: { id }, body: input })
        : api<FitnessEntry>('/api/fitness', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteFitness() {
  return useDeleteFitnessEntry();
}

export function useReadiness() {
  return useQuery({
    queryKey: fitnessKeys.readiness,
    queryFn: async () => {
      const result = await api<{ success: boolean; readiness: Readiness }>('/api/fitness/ai-coach', {
        method: 'POST',
        body: { action: 'readiness_check' },
      });
      return result.readiness;
    },
  });
}

export type SplitParams = { goal: string; equipment: string; daysPerWeek: number; experienceLevel: string };

export function useGenerateSplit() {
  return useMutation({
    mutationFn: async (params: SplitParams) => {
      const result = await api<{ success: boolean; split?: CoachProgram; error?: string }>('/api/fitness/ai-coach', {
        method: 'POST',
        body: { action: 'generate_split', params },
      });
      if (!result.success || !result.split) throw new Error(result.error ?? 'Could not build a plan.');
      return result.split;
    },
  });
}

export function useSubstitutes() {
  return useMutation({
    mutationFn: async (params: { exerciseName: string; targetMuscle?: string; availableEquipment?: string }) => {
      const result = await api<{ success: boolean; substitutions: Substitution[] }>('/api/fitness/ai-coach', {
        method: 'POST',
        body: { action: 'substitute_exercise', params },
      });
      return result.substitutions ?? [];
    },
  });
}
