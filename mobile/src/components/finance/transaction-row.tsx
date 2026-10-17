import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { ListItem } from '@/components/ui/list-item';
import { Text } from '@/components/ui/text';
import type { Transaction, TransactionType } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { layout, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import { categoryIcon } from './category-icons';
import { categoryLabel, paymentMethodLabel, transactionTypeLabel } from './labels';

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
 * One transaction as a list row: the category icon on a tile tinted by the type, description, category / date / method,
 * and the amount with a sign (+ income, - expense) and a colour, so direction never relies on colour alone.
 */
export const TransactionRow = memo(function TransactionRow({ tx, divider, hideDate }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation('finance');

  const tone = typeTone(tx.type, colors);
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
  const meta = [categoryLabel(tx.category), hideDate ? null : formatDay(tx.date), tx.paymentMethod ? paymentMethodLabel(tx.paymentMethod) : null]
    .filter(Boolean)
    .join(' · ');
  const amount = formatMoney(tx.amount);
  const description = tx.description === NO_DESCRIPTION ? t('row.noDescription') : tx.description;

  return (
    <ListItem
      leading={
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: layout.minTouchTarget - spacing.xs,
            height: layout.minTouchTarget - spacing.xs,
            borderRadius: radius.md,
            backgroundColor: tone.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name={categoryIcon(tx.category)} size={22} color={tone.fg} />
        </View>
      }
      title={description}
      subtitle={meta}
      meta={
        <Text variant="label" weight="bold" numeric numberOfLines={1} color={amountColor(tx.type)}>
          {sign}
          {amount}
        </Text>
      }
      divider={divider}
      onPress={() => openTransaction(router, tx)}
      chevron={false}
      accessibilityLabel={t('row.label', { description, type: transactionTypeLabel(tx.type), amount, meta })}
      accessibilityHint={t('row.hint')}
    />
  );
});
