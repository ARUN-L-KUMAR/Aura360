import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKey } from '@/features/dashboard/use-dashboard';
import { api } from '@/lib/api';

import type { Meal, MealInput, ParsedMeal, MealType } from './types';

export const foodKeys = {
  all: ['food'] as const,
  range: (from: string, to: string) => ['food', 'range', from, to] as const,
};

/** Meals between two days (YYYY-MM-DD, inclusive), newest first. */
export function useMeals(from: string, to: string) {
  return useQuery({
    queryKey: foodKeys.range(from, to),
    queryFn: () => api<Meal[]>('/api/food', { query: { from, to } }),
  });
}

function useInvalidateFood() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: foodKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

export function useSaveMeal() {
  const invalidate = useInvalidateFood();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MealInput }) =>
      id
        ? api<Meal>('/api/food', { method: 'PATCH', query: { id }, body: input })
        : api<Meal>('/api/food', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useSaveMeals() {
  const invalidate = useInvalidateFood();
  return useMutation({
    // Sequential on purpose: keeps the order the items were listed in, and a failure stops early.
    mutationFn: async (inputs: MealInput[]) => {
      for (const input of inputs) await api<Meal>('/api/food', { method: 'POST', body: input });
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMeal() {
  const invalidate = useInvalidateFood();
  return useMutation({
    mutationFn: (id: string) => api('/api/food', { method: 'DELETE', query: { id } }),
    onSuccess: invalidate,
  });
}

export function useParseMeal() {
  return useMutation({
    mutationFn: async ({ mealText, mealType }: { mealText: string; mealType: MealType }) => {
      const result = await api<{ success: boolean; data?: ParsedMeal; error?: string }>('/api/food/ai-nutrition', {
        method: 'POST',
        body: { action: 'parse_natural_meal', params: { mealText, mealType } },
      });
      if (!result.success || !result.data) throw new Error(result.error ?? 'Could not read that meal.');
      return result.data;
    },
  });
}
