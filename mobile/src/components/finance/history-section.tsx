import { useRouter } from 'expo-router';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonList, SkeletonListItem } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useTransactions, type TransactionFilters } from '@/features/finance/hooks';
import type { Transaction } from '@/features/finance/types';
import { formatMoney, monthKey, shiftMonth } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

const TYPES: { value: TransactionFilters['type']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'investment', label: 'Investments' },
];

type MonthFilter = 'all' | 'this' | 'last';

const MONTHS: { value: MonthFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'this', label: 'This month' },
  { value: 'last', label: 'Last month' },
];

const HistoryItem = memo(function HistoryItem({ tx, index }: { tx: Transaction; index: number }) {
  const motion = useListMotion(index);
  return (
    <Animated.View {...motion}>
      <Card padding="none" rounded="md" style={{ overflow: 'hidden' }}>
        <TransactionRow tx={tx} />
      </Card>
    </Animated.View>
  );
});

export function HistorySection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const padding = useScreenPadding();

  const [type, setType] = useState<TransactionFilters['type']>('all');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [search, setSearch] = useState('');

  const month = monthFilter === 'all' ? 'all' : monthFilter === 'this' ? monthKey() : shiftMonth(monthKey(), -1);
  const query = useTransactions({ type, search, month });
  const refreshControl = useRefreshControl({ onRefresh: () => query.refetch(), refreshing: query.isRefetching && !query.isFetchingNextPage });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const total = query.data?.pages[0]?.pagination.total ?? 0;
  const totalAmount = query.data?.pages[0]?.totalAmount ?? 0;
  const filtered = type !== 'all' || monthFilter !== 'all' || search.trim().length > 0;

  function clearFilters() {
    setType('all');
    setMonthFilter('all');
    setSearch('');
  }

  const listHeader = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
      {header}
      <SearchBar value={search} onChangeText={setSearch} debounceMs={350} placeholder="Search description or category" accessibilityLabel="Search transactions" />
      <ChipRow>
        {TYPES.map((t) => (
          <Chip key={t.value} label={t.label} accent="finance" selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </ChipRow>
      <ChipRow>
        {MONTHS.map((m) => (
          <Chip key={m.value} label={m.label} accent="finance" selected={monthFilter === m.value} onPress={() => setMonthFilter(m.value)} />
        ))}
      </ChipRow>
      {!query.isPending && !query.isError ? (
        <Text variant="caption" numeric color="textSecondary" accessibilityLiveRegion="polite">
          {total} {total === 1 ? 'transaction' : 'transactions'} · {formatMoney(totalAmount)}
        </Text>
      ) : null}
    </View>
  );

  return (
    <FlatList<Transaction>
      data={items}
      keyExtractor={(tx) => tx.id}
      renderItem={({ item, index }) => <HistoryItem tx={item} index={index} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        query.isPending ? (
          <SkeletonList count={6} trailing />
        ) : query.isError ? (
          <ErrorState error={query.error} title="Couldn't load transactions" onRetry={() => query.refetch()} retrying={query.isRefetching} />
        ) : filtered ? (
          <EmptyState
            variant="noResults"
            title="No matching transactions"
            description={search.trim() ? `Nothing found for "${search.trim()}".` : 'Nothing matches these filters.'}
            onClearFilters={clearFilters}
          />
        ) : (
          <EmptyState
            accent="finance"
            icon="receipt-outline"
            title="No transactions yet"
            description="Transactions you record will appear here."
            actionTitle="Add transaction"
            onAction={() => openTransaction(router)}
          />
        )
      }
      ListFooterComponent={query.isFetchingNextPage ? <SkeletonListItem trailing /> : null}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[padding, { gap: spacing.sm, paddingBottom: FAB_CLEARANCE }]}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}
