import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import type { Transaction, TransactionType } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { layout, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import { IconTile, type Tone } from './finance-ui';
import { categoryIcon } from './category-icons';
import { categoryLabel, paymentMethodLabel, transactionTypeLabel } from './labels';

function typeTone(type: TransactionType): Tone {
  switch (type) {
    case 'income':
      return 'success';
    case 'expense':
      return 'error';
    case 'investment':
      return 'warning';
    default:
      return 'info';
  }
}

function amountColor(type: TransactionType): keyof ThemeColors {
  switch (type) {
    case 'income':
      return 'successText';
    case 'expense':
      return 'errorText';
    case 'investment':
      return 'warningText';
    default:
      return 'text';
  }
}

/** The server fills an empty description with this English placeholder. */
export const NO_DESCRIPTION = 'No description';

export function openTransaction(router: ReturnType<typeof useRouter>, tx?: Transaction) {
  router.push({ pathname: '/finance/transaction', params: tx ? { tx: JSON.stringify(tx) } : {} });
}

type Props = {
  tx: Transaction;
  divider?: boolean;
  /** Leave the date out of the second line, because a day heading above the row already says it. */
  hideDate?: boolean;
};

/**
 * One transaction as a dense table-style row: the category icon on a tile tinted by the type, description, category /
 * date / method, and the amount with a sign (+ income, - expense) and a colour over a tiny uppercase type label, so
 * direction never relies on colour alone.
 */
export const TransactionRow = memo(function TransactionRow({ tx, divider, hideDate }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation('finance');

  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
  const meta = [categoryLabel(tx.category), hideDate ? null : formatDay(tx.date), tx.paymentMethod ? paymentMethodLabel(tx.paymentMethod) : null]
    .filter(Boolean)
    .join(' · ');
  const amount = formatMoney(tx.amount);
  const description = tx.description === NO_DESCRIPTION ? t('row.noDescription') : tx.description;
  const typeLabel = transactionTypeLabel(tx.type);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('row.label', { description, type: typeLabel, amount, meta })}
      accessibilityHint={t('row.hint')}
      haptic={false}
      scaleTo={0.99}
      ringRadius={radius.md}
      onPress={() => openTransaction(router, tx)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: layout.minTouchTarget + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.border,
      }}>
      <IconTile icon={categoryIcon(tx.category)} tone={typeTone(tx.type)} size={layout.minTouchTarget - spacing.xs} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" weight="semiBold" numberOfLines={1}>
          {description}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text variant="label" weight="bold" numeric numberOfLines={1} color={amountColor(tx.type)}>
          {sign}
          {amount}
        </Text>
        <Text variant="overline" color="textMuted" numberOfLines={1} style={{ opacity: 0.8 }}>
          {typeLabel}
        </Text>
      </View>
    </PressableScale>
  );
});
