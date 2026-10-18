import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { PremiumHero } from '@/components/ui/premium-hero';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { Balance } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';
import { paymentMethodLabel } from './labels';

type Props = {
  /** Total money on hand. */
  total: number;
  /** Balances that are not zero, one chip each. */
  balances: Balance[];
  /** This month's income and spending; `undefined` while loading or when it could not be loaded. */
  month: { income: number; expense: number } | undefined;
  monthLoading: boolean;
  onAdjust: () => void;
  onAddTransaction: () => void;
};

type FlowProps = { icon: 'arrow-down' | 'arrow-up' | 'trending-up' | 'trending-down'; label: string; value: string; good: boolean; spoken: string };

/** Income / spent / net as one cell of the frosted strip: a signed amount under a tiny label, direction by icon and sign. */
function FlowCell({ icon, label, value, good, spoken }: FlowProps) {
  const { colors, shades } = useTheme();
  return (
    <View accessible accessibilityLabel={spoken} style={{ flex: 1, gap: spacing.xs, paddingHorizontal: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons name={icon} size={12} color={good ? shades.success[400] : shades.error[400]} />
        <Text variant="overline" numberOfLines={1} style={{ color: colors.onHeroMuted, flexShrink: 1 }}>
          {label}
        </Text>
      </View>
      <Text variant="label" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: colors.onHero }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The top of the overview, in the web dashboard's hero card: a frosted "Money on hand" chip, the total as the bold
 * headline, a muted line, two pill buttons (add a transaction, adjust balances), a chip per account balance and this
 * month's income, spending and net in a frosted strip.
 */
export function MoneyHero({ total, balances, month, monthLoading, onAdjust, onAddTransaction }: Props) {
  const { t } = useTranslation('finance');
  const { colors } = useTheme();
  const net = month ? month.income - month.expense : 0;
  const amount = formatMoney(total);

  return (
    <PremiumHero
      chip={{ icon: 'wallet', label: t('overview.moneyOnHand') }}
      title={amount}
      subtitle={balances.length > 0 ? t('overview.heroSubtitle', { count: balances.length }) : t('overview.balancesEmpty')}
      actions={[
        { label: t('overview.addEntry'), onPress: onAddTransaction, accessibilityHint: t('overview.addEntryA11y') },
        { label: t('overview.adjust'), variant: 'glass', onPress: onAdjust, accessibilityHint: t('overview.adjustA11y') },
      ]}>
      {balances.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {balances.map((b) => (
            <View
              key={b.id}
              accessible
              accessibilityLabel={t('overview.balanceChip', { method: paymentMethodLabel(b.paymentMethod), amount: formatMoney(b.currentBalance) })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, borderRadius: radius.pill, backgroundColor: colors.heroChip, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 }}>
              <Ionicons name="wallet-outline" size={14} color={colors.onHeroMuted} />
              <Text variant="caption" weight="semiBold" numeric style={{ color: colors.onHero }}>
                {t('overview.balanceChip', { method: paymentMethodLabel(b.paymentMethod), amount: formatMoney(b.currentBalance) })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {monthLoading ? (
        <Skeleton height={spacing.xxxl + spacing.sm} />
      ) : month ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: radius.lg,
            backgroundColor: colors.heroChip,
            borderWidth: 1,
            borderColor: colors.heroChipBorder,
            paddingVertical: spacing.md,
          }}>
          <FlowCell
            icon="arrow-down"
            label={t('overview.income')}
            value={`+${formatMoney(month.income, { compact: true })}`}
            good
            spoken={t('overview.incomeA11y', { amount: formatMoney(month.income) })}
          />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.heroChipBorder }} />
          <FlowCell
            icon="arrow-up"
            label={t('overview.spent')}
            value={`-${formatMoney(month.expense, { compact: true })}`}
            good={false}
            spoken={t('overview.spentA11y', { amount: formatMoney(month.expense) })}
          />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.heroChipBorder }} />
          <FlowCell
            icon={net >= 0 ? 'trending-up' : 'trending-down'}
            label={t('overview.net')}
            value={`${net >= 0 ? '+' : '-'}${formatMoney(Math.abs(net), { compact: true })}`}
            good={net >= 0}
            spoken={net >= 0 ? t('overview.surplusA11y', { amount: formatMoney(net) }) : t('overview.deficitA11y', { amount: formatMoney(Math.abs(net)) })}
          />
        </View>
      ) : null}
    </PremiumHero>
  );
}
