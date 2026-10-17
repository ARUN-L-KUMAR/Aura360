import { useEffect, useMemo } from 'react';

import { useOutfits, useFashionItems } from '@/features/fashion/hooks';
import { useBudgets, useGoals, useTransactions, type TransactionFilters } from '@/features/finance/hooks';
import { useRecentFitness } from '@/features/fitness/hooks';
import { useMeals } from '@/features/food/hooks';
import { useNotes } from '@/features/notes/hooks';
import { useSavedItems } from '@/features/saved/hooks';
import { useSkincareProducts } from '@/features/skincare/hooks';
import { useTimeLogs } from '@/features/time/hooks';
import { useTranslation } from '@/i18n';
import { monthKey, shiftMonth } from '@/lib/format';

import {
  budgetEntries,
  fashionEntries,
  fitnessEntries,
  goalEntries,
  mealEntries,
  noteEntries,
  outfitEntries,
  productEntries,
  savedEntries,
  timeLogEntries,
  transactionEntries,
} from './entries';
import type { SearchEntry } from './types';

/** Same filters the Finance overview uses, so the first page is usually already in the cache. */
const ALL_TRANSACTIONS: TransactionFilters = { type: 'all', search: '', month: 'all' };
/** Pages of 25 transactions read while a search is open (200 in all). */
const MAX_TRANSACTION_PAGES = 8;

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

type QueryLike = { isPending: boolean; isError: boolean; fetchStatus: string; data: unknown; refetch: () => unknown };

export type SearchSources = {
  entries: SearchEntry[];
  /** Some section has no data yet and is still being fetched. */
  loading: boolean;
  /** Some section failed and has nothing cached, so results may be incomplete. */
  failed: boolean;
  /** Some section is waiting for a connection: results come from saved data. */
  paused: boolean;
  retry: () => void;
};

/**
 * Everything searchable, from the sections' own list hooks (react-query, persisted, so this works offline from the
 * cache). The hooks have no `enabled` switch, so they are simply mounted with the screen; the extra transaction pages
 * are only requested once there is something to search for (`active`).
 */
export function useSearchSources(active: boolean): SearchSources {
  const { t } = useTranslation('search');

  const month = monthKey();
  const previous = shiftMonth(month, -1);

  const notes = useNotes();
  const saved = useSavedItems();
  const fashion = useFashionItems();
  const outfits = useOutfits();
  const transactions = useTransactions(ALL_TRANSACTIONS);
  const budgets = useBudgets(month);
  const goals = useGoals();
  const mealsNow = useMeals(`${month}-01`, lastDayOf(month));
  const mealsBefore = useMeals(`${previous}-01`, lastDayOf(previous));
  const fitness = useRecentFitness();
  const products = useSkincareProducts();
  const timeNow = useTimeLogs(`${month}-01`, lastDayOf(month));
  const timeBefore = useTimeLogs(`${previous}-01`, lastDayOf(previous));

  const pageCount = transactions.data?.pages.length ?? 0;
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = transactions;
  const morePages = hasNextPage && !isFetchNextPageError && pageCount < MAX_TRANSACTION_PAGES;
  useEffect(() => {
    if (active && morePages && !isFetchingNextPage) void fetchNextPage();
  }, [active, morePages, isFetchingNextPage, fetchNextPage]);

  const transactionList = useMemo(() => transactions.data?.pages.flatMap((page) => page.data) ?? [], [transactions.data]);
  const mealList = useMemo(() => [...(mealsNow.data ?? []), ...(mealsBefore.data ?? [])], [mealsNow.data, mealsBefore.data]);
  const timeList = useMemo(() => [...(timeNow.data ?? []), ...(timeBefore.data ?? [])], [timeNow.data, timeBefore.data]);

  const entries = useMemo<SearchEntry[]>(
    () => [
      ...noteEntries(notes.data, t),
      ...savedEntries(saved.data),
      ...transactionEntries(transactionList, t),
      ...budgetEntries(budgets.data?.data, month, t),
      ...goalEntries(goals.data?.data, t),
      ...fashionEntries(fashion.data),
      ...outfitEntries(outfits.data),
      ...mealEntries(mealList, t),
      ...fitnessEntries(fitness.data, t),
      ...productEntries(products.data),
      ...timeLogEntries(timeList, t),
    ],
    [notes.data, saved.data, transactionList, budgets.data, month, goals.data, fashion.data, outfits.data, mealList, fitness.data, products.data, timeList, t],
  );

  const queries: QueryLike[] = [notes, saved, fashion, outfits, transactions, budgets, goals, mealsNow, mealsBefore, fitness, products, timeNow, timeBefore];
  const loading = queries.some((q) => q.isPending && q.fetchStatus !== 'paused') || (active && morePages && transactions.fetchStatus !== 'paused');
  const failed = queries.some((q) => q.isError && q.data === undefined);
  const paused = queries.some((q) => q.fetchStatus === 'paused');

  const retry = () => {
    for (const q of queries) if (q.isError) void q.refetch();
  };

  return { entries, loading, failed, paused, retry };
}
