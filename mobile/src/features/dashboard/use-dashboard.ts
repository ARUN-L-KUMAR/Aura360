import { useQuery } from '@tanstack/react-query';

import type { Transaction } from '@/features/finance/types';
import type { Note } from '@/features/notes/types';
import { api } from '@/lib/api';
import { todayIso } from '@/lib/format';

/** The server sends whole transaction rows, so a row can open the transaction editor directly. */
export type DashboardTransaction = Transaction;

/** The phone's day in numbers: what Home shows under "Today". Absent when the server predates it. */
export type DashboardToday = {
  date: string;
  food: { calories: number; protein: number; carbs: number; fats: number; meals: number };
  fitness: { minutesToday: number; minutesWeek: number; workoutsToday: number; workoutsWeek: number; activeDaysWeek: number };
  time: { minutesToday: number; topCategory: string | null };
  finance: { spentToday: number; budgetTotal: number; budgetSpent: number; budgetCount: number };
  /** Pinned, unarchived notes: the full note (so the editor can open) plus a short preview and checklist progress. */
  pinnedNotes: (Note & { preview: string; checklistDone: number | null; checklistTotal: number | null })[];
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
  today?: DashboardToday;
};

/** Prefix of every dashboard query, so one invalidation refreshes whichever day is cached. */
export const dashboardKey = ['dashboard'] as const;

export function useDashboard() {
  // The phone's own day goes to the server, so "today" is right in any timezone and rolls over at local midnight.
  const date = todayIso();
  return useQuery({
    queryKey: [...dashboardKey, date],
    queryFn: () => api<Dashboard>('/api/mobile/dashboard', { query: { date } }),
  });
}
