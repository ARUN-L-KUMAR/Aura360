import { useRouter } from 'expo-router';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { Card } from '@/components/ui/card';
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
import { formatMoney, monthKey, shiftMonth } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

type MonthFilter = 'all' | 'this' | 'last';

const keyExtractor = (tx: Transaction) => tx.id;

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
  const { t } = useTranslation('finance');
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
        <Text variant="caption" numeric color="textSecondary" accessibilityLiveRegion="polite">
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
    <FlatList<Transaction>
      data={items}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => <HistoryItem tx={item} index={index} />}
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
      contentContainerStyle={[padding, { gap: spacing.sm, paddingBottom: FAB_CLEARANCE }]}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}
