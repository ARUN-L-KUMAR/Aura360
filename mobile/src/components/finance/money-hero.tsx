import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { HeroBanner } from '@/components/illustrations/hero-banner';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
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
  /** Count the headline number up (first view in the session). */
  countUp: boolean;
  onAdjust: () => void;
};

const PILL_ICON = spacing.lg;

type PillProps = { icon: 'arrow-down' | 'arrow-up' | 'trending-up' | 'trending-down'; label: string; value: string; good: boolean; spoken: string };

/** Income / spent / net: an icon, a signed amount and a tinted surface, so the direction is never colour alone. */
function FlowPill({ icon, label, value, good, spoken }: PillProps) {
  const { colors } = useTheme();
  const bg = good ? colors.successContainer : colors.errorContainer;
  const fg = good ? colors.onSuccessContainer : colors.onErrorContainer;
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        flexGrow: 1,
        flexBasis: spacing.xxxl * 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: bg,
      }}>
      <Ionicons name={icon} size={PILL_ICON} color={fg} />
      <View style={{ flexShrink: 1 }}>
        <Text variant="caption" style={{ color: fg }} numberOfLines={1}>
          {label}
        </Text>
        <Text variant="label" weight="bold" numeric style={{ color: fg }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/**
 * The top of the overview: the finance artwork, "Money on hand" as the headline with the total counting up under it,
 * a chip per account balance and this month's income, spending and net as signed pills.
 */
export function MoneyHero({ total, balances, month, monthLoading, countUp, onAdjust }: Props) {
  const { t } = useTranslation('finance');
  const net = month ? month.income - month.expense : 0;

  return (
    <HeroBanner scene="finance-hero" accent="finance" title={t('overview.moneyOnHand')}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <View style={{ flexShrink: 1 }}>
            <AnimatedNumber value={total} from={countUp ? 0 : total} format={(n) => formatMoney(n)} variant="display" accessibilityLabel={t('overview.totalA11y', { amount: formatMoney(total) })} />
          </View>
          <Button
            title={t('overview.adjust')}
            accessibilityLabel={t('overview.adjustA11y')}
            size="sm"
            variant="tertiary"
            leftIcon="create-outline"
            fullWidth={false}
            onPress={onAdjust}
          />
        </View>

        {balances.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {balances.map((b) => (
              <Tag key={b.id} icon="wallet-outline" accent="finance" size="md" label={t('overview.balanceChip', { method: paymentMethodLabel(b.paymentMethod), amount: formatMoney(b.currentBalance) })} />
            ))}
          </View>
        ) : (
          <Text variant="caption" color="textSecondary">
            {t('overview.balancesEmpty')}
          </Text>
        )}

        {monthLoading ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Skeleton height={spacing.xxxl + spacing.sm} style={{ flex: 1 }} />
            <Skeleton height={spacing.xxxl + spacing.sm} style={{ flex: 1 }} />
          </View>
        ) : month ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <FlowPill
              icon="arrow-down"
              label={t('overview.income')}
              value={`+${formatMoney(month.income, { compact: true })}`}
              good
              spoken={t('overview.incomeA11y', { amount: formatMoney(month.income) })}
            />
            <FlowPill
              icon="arrow-up"
              label={t('overview.spent')}
              value={`-${formatMoney(month.expense, { compact: true })}`}
              good={false}
              spoken={t('overview.spentA11y', { amount: formatMoney(month.expense) })}
            />
            <FlowPill
              icon={net >= 0 ? 'trending-up' : 'trending-down'}
              label={t('overview.netSavings')}
              value={`${net >= 0 ? '+' : ''}${formatMoney(net, { compact: true })}`}
              good={net >= 0}
              spoken={net >= 0 ? t('overview.surplusA11y', { amount: formatMoney(net) }) : t('overview.deficitA11y', { amount: formatMoney(Math.abs(net)) })}
            />
          </View>
        ) : null}
      </View>
    </HeroBanner>
  );
}
