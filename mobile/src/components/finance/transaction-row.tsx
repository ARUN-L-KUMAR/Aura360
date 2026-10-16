import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { ListItem } from '@/components/ui/list-item';
import { Text } from '@/components/ui/text';
import type { Transaction, TransactionType } from '@/features/finance/types';
import { formatDay, formatMoney } from '@/lib/format';
import { layout, radius, spacing, useTheme, type ThemeColors } from '@/theme';

const TYPE_ICON = {
  income: 'arrow-down-circle',
  expense: 'arrow-up-circle',
  investment: 'trending-up',
  transfer: 'swap-horizontal',
} as const;

const TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  investment: 'Investment',
  transfer: 'Transfer',
};

function typeTone(type: TransactionType, c: ThemeColors) {
  switch (type) {
    case 'income':
      return { bg: c.successContainer, fg: c.onSuccessContainer };
    case 'expense':
      return { bg: c.errorContainer, fg: c.onErrorContainer };
    case 'investment':
      return { bg: c.warningContainer, fg: c.onWarningContainer };
    default:
      return { bg: c.infoContainer, fg: c.onInfoContainer };
  }
}

const PAYMENT_LABEL: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank',
  other: 'Other',
};

export function openTransaction(router: ReturnType<typeof useRouter>, tx?: Transaction) {
  router.push({ pathname: '/finance/transaction', params: tx ? { tx: JSON.stringify(tx) } : {} });
}

/** One transaction as a list row: type icon, description, category / date / method, signed amount. */
export const TransactionRow = memo(function TransactionRow({ tx, divider }: { tx: Transaction; divider?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();

  const tone = typeTone(tx.type, colors);
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
  const meta = [tx.category, formatDay(tx.date), tx.paymentMethod ? PAYMENT_LABEL[tx.paymentMethod] : null].filter(Boolean).join(' · ');
  const amount = formatMoney(tx.amount);

  return (
    <ListItem
      leading={
        <View
          style={{
            width: layout.minTouchTarget - spacing.xs,
            height: layout.minTouchTarget - spacing.xs,
            borderRadius: radius.md,
            backgroundColor: tone.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name={TYPE_ICON[tx.type] ?? 'cash-outline'} size={22} color={tone.fg} />
        </View>
      }
      title={tx.description}
      subtitle={meta}
      meta={
        <Text variant="label" weight="bold" numeric numberOfLines={1} color={tx.type === 'income' ? 'successText' : 'text'}>
          {sign}
          {amount}
        </Text>
      }
      divider={divider}
      onPress={() => openTransaction(router, tx)}
      chevron={false}
      accessibilityLabel={`${tx.description}, ${TYPE_LABEL[tx.type] ?? 'Transaction'} of ${amount}, ${meta}`}
      accessibilityHint="Opens this transaction"
    />
  );
});
