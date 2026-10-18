import { useRouter } from 'expo-router';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { groupByDay } from '@/components/finance/insights';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonList, SkeletonListItem } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useTransactions, type TransactionFilters } from '@/features/finance/hooks';
import type { Transaction } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney, monthKey, shiftMonth, todayIso, weekdayShort } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

type MonthFilter = 'all' | 'this' | 'last';

type Edge = 'first' | 'middle' | 'last' | 'only';

type ListRow = { kind: 'day'; key: string; date: string; net: number; showTotal: boolean } | { kind: 'tx'; key: string; tx: Transaction; index: number; edge: Edge };

const keyExtractor = (row: ListRow) => row.key;

/** "Today", "Yesterday", else "Mon · 9 Oct". */
function useDayLabel(date: string) {
  const { t } = useTranslation('finance');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === todayIso()) return t('history.today');
  if (date === todayIso(yesterday)) return t('history.yesterday');
  return t('history.dayLabel', { weekday: weekdayShort(date), date: formatDay(date) });
}

/** Heading above one day's transactions with that day's net (money in minus money out), signed and coloured. */
const DayHeader = memo(function DayHeader({ date, net, showTotal }: { date: string; net: number; showTotal: boolean }) {
  const { t } = useTranslation('finance');
  const label = useDayLabel(date);
  const sign = net > 0 ? '+' : net < 0 ? '-' : '';
  const amount = formatMoney(Math.abs(net));
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={showTotal ? t('history.dayA11y', { day: label, amount: net < 0 ? `-${amount}` : amount }) : label}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
      <Text variant="overline" color="textMuted" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {showTotal ? (
        <Text variant="label" weight="bold" numeric color={net > 0 ? 'successText' : net < 0 ? 'errorText' : 'textSecondary'}>
          {sign}
          {amount}
        </Text>
      ) : null}
    </View>
  );
});

/** One row of a day's table: the rows of a day share one card edge to edge (rounded at the first and last). */
const HistoryItem = memo(function HistoryItem({ tx, index, edge }: { tx: Transaction; index: number; edge: Edge }) {
  const motion = useListMotion(index);
  const { colors } = useTheme();
  const top = edge === 'first' || edge === 'only';
  const bottom = edge === 'last' || edge === 'only';
  return (
    <Animated.View {...motion}>
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderStartWidth: 1,
          borderEndWidth: 1,
          borderTopWidth: top ? 1 : 0,
          borderBottomWidth: bottom ? 1 : 0,
          borderTopStartRadius: top ? radius.lg : 0,
          borderTopEndRadius: top ? radius.lg : 0,
          borderBottomStartRadius: bottom ? radius.lg : 0,
          borderBottomEndRadius: bottom ? radius.lg : 0,
          overflow: 'hidden',
        }}>
        <TransactionRow tx={tx} hideDate divider={!bottom} />
      </View>
    </Animated.View>
  );
});

export function HistorySection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation('finance');
  const padding = useScreenPadding();

  const [type, setType] = useState<TransactionFilters['type']>('all');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [search, setSearch] = useState('');

  const month = monthFilter === 'all' ? 'all' : monthFilter === 'this' ? monthKey() : shiftMonth(monthKey(), -1);
  const query = useTransactions({ type, search, month });
  const refreshControl = useRefreshControl({ onRefresh: () => query.refetch(), refreshing: query.isRefetching && !query.isFetchingNextPage });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const rows = useMemo<ListRow[]>(() => {
    const out: ListRow[] = [];
    let index = 0;
    const groups = groupByDay(items);
    groups.forEach((group, g) => {
      // The last day on screen may continue on the next page, so its total is held back until the rest has loaded.
      const complete = !(g === groups.length - 1 && query.hasNextPage);
      out.push({ kind: 'day', key: `day-${group.date}`, date: group.date, net: group.net, showTotal: complete });
      group.items.forEach((tx, i) => {
        const edge: Edge = group.items.length === 1 ? 'only' : i === 0 ? 'first' : i === group.items.length - 1 ? 'last' : 'middle';
        out.push({ kind: 'tx', key: tx.id, tx, index: index++, edge });
      });
    });
    return out;
  }, [items, query.hasNextPage]);
  const total = query.data?.pages[0]?.pagination.total ?? 0;
  const totalAmount = query.data?.pages[0]?.totalAmount ?? 0;
  const filtered = type !== 'all' || monthFilter !== 'all' || search.trim().length > 0;
  const offline = query.isPending && query.fetchStatus === 'paused';
  const loading = query.isPending && !offline;

  const typeOptions: { value: TransactionFilters['type']; label: string }[] = [
    { value: 'all', label: t('types.all') },
    { value: 'expense', label: t('types.expenses') },
    { value: 'income', label: t('types.incomes') },
    { value: 'investment', label: t('types.investments') },
  ];
  const monthOptions: { value: MonthFilter; label: string }[] = [
    { value: 'all', label: t('history.allTime') },
    { value: 'this', label: t('history.thisMonth') },
    { value: 'last', label: t('history.lastMonth') },
  ];

  function clearFilters() {
    setType('all');
    setMonthFilter('all');
    setSearch('');
  }

  const listHeader = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
      {header}
      <SearchBar value={search} onChangeText={setSearch} debounceMs={350} placeholder={t('history.search')} accessibilityLabel={t('history.searchA11y')} />
      <ChipRow>
        {typeOptions.map((option) => (
          <Chip key={option.value} label={option.label} accent="finance" selected={type === option.value} onPress={() => setType(option.value)} />
        ))}
      </ChipRow>
      <ChipRow>
        {monthOptions.map((option) => (
          <Chip key={option.value} label={option.label} accent="finance" selected={monthFilter === option.value} onPress={() => setMonthFilter(option.value)} />
        ))}
      </ChipRow>
      {!query.isPending && !query.isError ? (
        <Text variant="label" weight="semiBold" numeric color="textSecondary" accessibilityLiveRegion="polite">
          {t('history.count', { count: total, amount: formatMoney(totalAmount) })}
        </Text>
      ) : null}
    </View>
  );

  // A refresh or a next page failed while rows are on screen: say so under the list instead of hiding what we have.
  const listFooter = query.isFetchingNextPage ? (
    <SkeletonListItem trailing />
  ) : query.isError && items.length > 0 ? (
    <RefreshError
      error={query.error}
      retrying={query.isRefetching}
      onRetry={() => {
        if (query.isFetchNextPageError) void query.fetchNextPage();
        else void query.refetch();
      }}
    />
  ) : null;

  return (
    <FlatList<ListRow>
      data={rows}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => (item.kind === 'day' ? <DayHeader date={item.date} net={item.net} showTotal={item.showTotal} /> : <HistoryItem tx={item.tx} index={item.index} edge={item.edge} />)}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        loading ? (
          <SkeletonList count={6} trailing />
        ) : offline ? (
          <OfflineState description={t('offline.transactions')} onRetry={() => void query.refetch()} />
        ) : query.isError ? (
          <LoadError error={query.error} title={t('history.error')} onRetry={() => void query.refetch()} retrying={query.isRefetching} />
        ) : filtered ? (
          <EmptyState
            variant="noResults"
            title={t('history.noMatchTitle')}
            description={search.trim() ? t('history.noMatchQuery', { query: search.trim() }) : t('history.noMatchFilters')}
            onClearFilters={clearFilters}
          />
        ) : (
          <EmptyState
            accent="finance"
            icon="receipt-outline"
            title={t('history.emptyTitle')}
            description={t('history.emptyBody')}
            actionTitle={t('actions.addTransaction')}
            onAction={() => openTransaction(router)}
          />
        )
      }
      ListFooterComponent={listFooter}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      initialNumToRender={10}
      windowSize={7}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[padding, { gap: 0, paddingBottom: FAB_CLEARANCE }]}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}
