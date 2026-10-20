import { memo, type ComponentType } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ArrowDown, ArrowUp, Banknote, CreditCard, Plus, RefreshCw, Scale, ScanLine, TrendingUp, Wallet } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, useTheme } from '@/theme';

type Props = {
  income: number;
  expense: number;
  investment: number;
  availableBalance: number;
  bankBalance: number;
  cashBalance: number;
  isSyncing?: boolean;
  onSync?: () => void;
  onScanReceipt?: () => void;
  onAddTransaction?: () => void;
  onEditBalances?: () => void;
  onSelectFlowFilter?: (type: 'income' | 'expense' | 'investment') => void;
};

type Glyph = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const BADGE = spacing.xl + spacing.xs;
const GLYPH = spacing.md + 2;
/** Above this system font scale the three figure cards stack, so a label like "INVESTED" is never cut. */
const STACK_FONT_SCALE = 1.15;

/** A tinted rounded square with a glyph, in the colour that reads on it. Decorative. */
function Badge({ icon: Icon, tint, glyph }: { icon: Glyph; tint: string; glyph: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: BADGE, height: BADGE, borderRadius: radius.md, backgroundColor: withAlpha(tint, 0.16), alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={GLYPH} color={glyph} strokeWidth={3} />
    </View>
  );
}

type FlowCardProps = {
  label: string;
  value: string;
  icon: Glyph;
  tint: string;
  glyph: string;
  spoken: string;
  hint: string;
  stacked: boolean;
  onPress: () => void;
};

/** One of the month's figures (income, spent, invested): a small glass card that opens the ledger for it. */
function FlowCard({ label, value, icon, tint, glyph, spoken, hint, stacked, onPress }: FlowCardProps) {
  return (
    <Card
      rounded="lg"
      padding="none"
      accessibilityLabel={spoken}
      accessibilityHint={hint}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={{ flex: stacked ? undefined : 1, minHeight: layout.minTouchTarget, padding: spacing.md, gap: spacing.sm }}>
      <Badge icon={icon} tint={tint} glyph={glyph} />
      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" color="textMuted" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="title" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
      </View>
    </Card>
  );
}

type ActionProps = { label: string; icon: Glyph; filled?: boolean; disabled?: boolean; onPress: () => void };

/** A pill-shaped action of the toolbar. Grows to share the row; wraps onto a second row on a narrow phone. */
function Action({ label, icon: Icon, filled, disabled, onPress }: ActionProps) {
  const { colors } = useTheme();
  const fg = filled ? colors.primaryText : colors.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      ringRadius={radius.pill}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={{
        flexGrow: 1,
        minHeight: layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: filled ? colors.primary : colors.border,
        backgroundColor: filled ? colors.primary : colors.card,
      }}>
      <Icon size={GLYPH + 2} color={fg} />
      <Text variant="label" weight="bold" numberOfLines={1} style={{ color: fg }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Under the balance hero: the toolbar (scan a receipt, sync, new entry), the month's income / spent / invested as three
 * small glass cards (each opens the ledger filtered to it), the balance the month's flow implies, and where the money sits.
 * The available balance and the net flow live in the hero.
 */
export const FinanceMetricsGrid = memo(function FinanceMetricsGrid({
  income,
  expense,
  investment,
  availableBalance,
  bankBalance,
  cashBalance,
  isSyncing,
  onSync,
  onScanReceipt,
  onAddTransaction,
  onEditBalances,
  onSelectFlowFilter,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation('finance');
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > STACK_FONT_SCALE;

  const requiredBalance = availableBalance - (income - expense);
  const hint = t('metrics.tapToFilter');

  return (
    <View style={styles.container}>
      {onScanReceipt || onSync || onAddTransaction ? (
        <View style={styles.toolbar}>
          {onScanReceipt ? <Action label={t('metrics.scanReceipt')} icon={ScanLine} onPress={onScanReceipt} /> : null}
          {onSync ? <Action label={isSyncing ? t('metrics.syncing') : t('metrics.syncData')} icon={RefreshCw} disabled={isSyncing} onPress={onSync} /> : null}
          {onAddTransaction ? <Action label={t('metrics.newEntry')} icon={Plus} filled onPress={onAddTransaction} /> : null}
        </View>
      ) : null}

      <View style={{ flexDirection: stacked ? 'column' : 'row', gap: spacing.md }}>
        <FlowCard
          label={t('metrics.income')}
          value={formatMoney(income, { compact: true })}
          icon={ArrowUp}
          tint={colors.success}
          glyph={colors.successText}
          spoken={`${t('metrics.totalIncome')}: ${formatMoney(income)}`}
          hint={hint}
          stacked={stacked}
          onPress={() => onSelectFlowFilter?.('income')}
        />
        <FlowCard
          label={t('metrics.spent')}
          value={formatMoney(expense, { compact: true })}
          icon={ArrowDown}
          tint={colors.error}
          glyph={colors.errorText}
          spoken={`${t('metrics.totalExpenses')}: ${formatMoney(expense)}`}
          hint={hint}
          stacked={stacked}
          onPress={() => onSelectFlowFilter?.('expense')}
        />
        <FlowCard
          label={t('metrics.invested')}
          value={formatMoney(investment, { compact: true })}
          icon={TrendingUp}
          tint={colors.warning}
          glyph={colors.warningText}
          spoken={`${t('metrics.investments')}: ${formatMoney(investment)}`}
          hint={hint}
          stacked={stacked}
          onPress={() => onSelectFlowFilter?.('investment')}
        />
      </View>

      <Card
        rounded="lg"
        padding="none"
        accessible
        accessibilityLabel={`${t('metrics.requiredBalance')}: ${formatMoney(requiredBalance)}. ${t('metrics.requiredSubtitle')}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}>
        <Badge icon={Scale} tint={colors.warning} glyph={colors.warningText} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" weight="semiBold" numberOfLines={2}>
            {t('metrics.requiredBalance')}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {t('metrics.requiredSubtitle')}
          </Text>
        </View>
        <Text variant="title" weight="bold" numeric numberOfLines={1} color={requiredBalance < 0 ? 'warningText' : 'text'} style={{ flexShrink: 0 }}>
          {formatMoney(requiredBalance, { compact: true })}
        </Text>
      </Card>

      <Card rounded="lg" padding="none" style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={styles.breakdownHeader}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Wallet size={GLYPH + 2} color={colors.primaryAccent} />
            <Text variant="label" weight="bold" numberOfLines={2} accessibilityRole="header" style={{ flexShrink: 1 }}>
              {t('metrics.balanceBreakdown')}
            </Text>
          </View>
          {onEditBalances ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('metrics.manageBalances')}
              haptic="select"
              ringRadius={radius.pill}
              onPress={onEditBalances}
              style={styles.manage}>
              <Text variant="caption" weight="bold" color="primaryAccent">
                {t('metrics.manage')}
              </Text>
            </PressableScale>
          ) : null}
        </View>

        <View style={styles.tiles}>
          <View accessible accessibilityLabel={`${t('metrics.bankUpi')}: ${formatMoney(bankBalance)}`} style={[styles.tile, { backgroundColor: colors.cardMuted }]}>
            <View style={[styles.tileIcon, { backgroundColor: colors.accent }]}>
              <CreditCard size={GLYPH} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textSecondary" numberOfLines={2}>
                {t('metrics.bankUpi')}
              </Text>
              <Text variant="label" weight="bold" numeric numberOfLines={1}>
                {formatMoney(bankBalance)}
              </Text>
            </View>
          </View>

          <View accessible accessibilityLabel={`${t('metrics.cashInHand')}: ${formatMoney(cashBalance)}`} style={[styles.tile, { backgroundColor: colors.cardMuted }]}>
            <View style={[styles.tileIcon, { backgroundColor: colors.accent }]}>
              <Banknote size={GLYPH} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textSecondary" numberOfLines={2}>
                {t('metrics.cashInHand')}
              </Text>
              <Text variant="label" weight="bold" numeric numberOfLines={1}>
                {formatMoney(cashBalance)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  manage: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    // The padding makes the touch target; pull it back so the word lines up with the card's content edge.
    marginEnd: -spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: spacing.xxxl * 2 + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  tileIcon: {
    width: BADGE,
    height: BADGE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
