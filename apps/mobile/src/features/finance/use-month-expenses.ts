import { useEffect, useMemo } from 'react';

import { useTransactions } from './hooks';

/** Pages of 25 expenses to read for one month; plenty for a month, and it bounds the requests. */
export const MAX_SPEND_PAGES = 12;

/**
 * Every expense of one month ("YYYY-MM"), loading page after page until there are no more (or the cap is hit). Overview
 * and Analytics share the same cached query, so whichever opens first does the loading for both.
 */
export function useMonthExpenses(month: string) {
  const query = useTransactions({ type: 'expense', search: '', month });
  const { fetchNextPage } = query;
  const pages = query.data?.pages.length ?? 0;
  const loadingMore = !!query.hasNextPage && !query.isFetchNextPageError && pages < MAX_SPEND_PAGES;

  useEffect(() => {
    if (loadingMore && !query.isFetchingNextPage) void fetchNextPage();
  }, [loadingMore, query.isFetchingNextPage, fetchNextPage]);

  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  /** True when the cap or an error stopped loading before the last page: totals are then for the loaded rows only. */
  const partial = !!query.hasNextPage && !loadingMore;

  return { query, rows, loadingMore, partial };
}
