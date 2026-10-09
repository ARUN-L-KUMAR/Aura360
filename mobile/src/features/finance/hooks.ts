import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKey } from '@/features/dashboard/use-dashboard';
import { api } from '@/lib/api';

import type {
  BalancesResponse,
  BudgetsResponse,
  GoalsResponse,
  Transaction,
  TransactionInput,
  TransactionType,
  TransactionsPage,
} from './types';

export const financeKeys = {
  all: ['finance'] as const,
  transactions: (filters: TransactionFilters) => ['finance', 'transactions', filters] as const,
  balances: ['finance', 'balances'] as const,
  budgets: (month: string) => ['finance', 'budgets', month] as const,
  goals: ['finance', 'goals'] as const,
};

export type TransactionFilters = {
  type: TransactionType | 'all';
  search: string;
  /** YYYY-MM, or 'all' */
  month: string;
};

const PAGE_SIZE = 25;

export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: financeKeys.transactions(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<TransactionsPage>('/api/finance/transactions', {
        query: {
          page: pageParam,
          limit: PAGE_SIZE,
          type: filters.type === 'all' ? undefined : filters.type,
          search: filters.search.trim() || undefined,
          month: filters.month === 'all' ? undefined : filters.month,
        },
      }),
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
  });
}

/** Anything that changes money must refresh every finance view and the home dashboard. */
function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: financeKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

export function useSaveTransaction() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TransactionInput }) =>
      id
        ? api<{ data: Transaction }>(`/api/finance/transactions/${id}`, { method: 'PATCH', body: input })
        : api<{ data: Transaction }>('/api/finance/transactions', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => api(`/api/finance/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useBalances() {
  return useQuery({
    queryKey: financeKeys.balances,
    queryFn: () => api<BalancesResponse>('/api/finance/balances'),
  });
}

export function useSaveBalances() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: { cash_balance: number; account_balance: number }) =>
      api('/api/finance/balances', { method: 'PUT', body: input }),
    onSuccess: invalidate,
  });
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: financeKeys.budgets(month),
    queryFn: () => api<BudgetsResponse>('/api/finance/budgets', { query: { month } }),
  });
}

export function useSaveBudget() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: { category: string; amount: number; month: string; alertThreshold: number }) =>
      api('/api/finance/budgets', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => api('/api/finance/budgets', { method: 'DELETE', query: { id } }),
    onSuccess: invalidate,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: financeKeys.goals,
    queryFn: () => api<GoalsResponse>('/api/finance/goals'),
  });
}

export type GoalInput = {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string | null;
  category: string;
  color: string;
  notes?: string | null;
};

export function useSaveGoal() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: GoalInput }) =>
      id
        ? api('/api/finance/goals', { method: 'PUT', body: { id, ...input } })
        : api('/api/finance/goals', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useContributeToGoal() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api('/api/finance/goals', { method: 'PUT', body: { id, contributeAmount: amount } }),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => api('/api/finance/goals', { method: 'DELETE', query: { id } }),
    onSuccess: invalidate,
  });
}
