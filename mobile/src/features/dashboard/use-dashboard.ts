import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type DashboardTransaction = {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'investment' | 'transfer';
  category: string;
  amount: string;
  description: string;
};

export type Dashboard = {
  profile: { name: string | null; image: string | null };
  totalActivities: number;
  counts: {
    finance: number;
    fitness: number;
    food: number;
    notes: number;
    saved: number;
    fashion: number;
    skincare: number;
    time: number;
  };
  chart: { date: string; activities: number }[];
  month: { income: number; expense: number; investment: number };
  recentTransactions: DashboardTransaction[];
};

export const dashboardKey = ['dashboard'] as const;

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKey,
    queryFn: () => api<Dashboard>('/api/mobile/dashboard'),
  });
}
