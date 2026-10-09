import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Transaction } from '@/features/finance/types';
import { formatDay, formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const TYPE_CONFIG = {
  income: { icon: 'arrow-down-circle', color: '#22c55e' },
  expense: { icon: 'arrow-up-circle', color: '#ef4444' },
  investment: { icon: 'trending-up', color: '#f59e0b' },
  transfer: { icon: 'swap-horizontal', color: '#3b82f6' },
} as const;

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

export function TransactionRow({ tx, compact }: { tx: Transaction; compact?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();

  const cfg = TYPE_CONFIG[tx.type] ?? { icon: 'cash-outline', color: colors.text };
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
  const meta = [tx.category, formatDay(tx.date), tx.paymentMethod ? PAYMENT_LABEL[tx.paymentMethod] : null].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tx.description}, ${tx.type} of ${formatMoney(tx.amount)}`}
      onPress={() => openTransaction(router, tx)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: compact ? spacing.xs : spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: `${cfg.color}18`,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: `${cfg.color}30`,
        }}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontWeight: '500' }}>
          {tx.description}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text style={{ fontWeight: '700', color: tx.type === 'income' ? colors.success : colors.text }}>
        {sign}
        {formatMoney(tx.amount)}
      </Text>
    </Pressable>
  );
}

