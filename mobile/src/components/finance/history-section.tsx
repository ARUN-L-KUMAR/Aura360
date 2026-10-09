import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TextInput, View } from 'react-native';

import { TransactionRow } from '@/components/finance/transaction-row';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useScreenPadding } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTransactions, type TransactionFilters } from '@/features/finance/hooks';
import type { Transaction } from '@/features/finance/types';
import { formatMoney, monthKey, shiftMonth } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { radius, spacing, useTheme } from '@/theme';

const TYPES: { value: TransactionFilters['type']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'investment', label: 'Investments' },
];

export function HistorySection({ header }: { header: ReactNode }) {
  const { colors } = useTheme();
  const padding = useScreenPadding();

  const [type, setType] = useState<TransactionFilters['type']>('all');
  const [monthFilter, setMonthFilter] = useState<'all' | 'this' | 'last'>('all');
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText);

  const month = monthFilter === 'all' ? 'all' : monthFilter === 'this' ? monthKey() : shiftMonth(monthKey(), -1);
  const query = useTransactions({ type, search, month });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const total = query.data?.pages[0]?.pagination.total ?? 0;
  const totalAmount = query.data?.pages[0]?.totalAmount ?? 0;

  const listHeader = (
    <View style={{ gap: spacing.md }}>
      {header}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.card,
          paddingHorizontal: spacing.md,
        }}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search description or category"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={{ flex: 1, minHeight: 44, color: colors.text, fontSize: 15 }}
        />
      </View>
      <ChipRow>
        {TYPES.map((t) => (
          <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </ChipRow>
      <ChipRow>
        <Chip label="All time" selected={monthFilter === 'all'} onPress={() => setMonthFilter('all')} />
        <Chip label="This month" selected={monthFilter === 'this'} onPress={() => setMonthFilter('this')} />
        <Chip label="Last month" selected={monthFilter === 'last'} onPress={() => setMonthFilter('last')} />
      </ChipRow>
      {!query.isPending ? (
        <Text variant="caption" muted>
          {total} {total === 1 ? 'transaction' : 'transactions'} · {formatMoney(totalAmount)}
        </Text>
      ) : null}
    </View>
  );

  return (
    <FlatList<Transaction>
      data={items}
      keyExtractor={(tx) => tx.id}
      renderItem={({ item }) => <TransactionRow tx={item} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        query.isPending ? (
          <ActivityIndicator color={colors.textMuted} style={{ marginTop: spacing.xl }} />
        ) : query.isError ? (
          <Text muted>{query.error instanceof Error ? query.error.message : "Couldn't load transactions."}</Text>
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No Transactions Found"
            description={searchText ? `No transactions matching "${searchText}"` : 'Transactions you record will appear here.'}
          />
        )
      }
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.textMuted} /> : null}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.textMuted} />}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[padding, { gap: spacing.xs }]}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}
