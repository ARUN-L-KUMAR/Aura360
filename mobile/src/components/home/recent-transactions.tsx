import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { openTransaction } from '@/components/finance/transaction-row';
import { memo } from 'react';
import { View } from 'react-native';

import { Section, SectionHead } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { Text } from '@/components/ui/text';
import type { DashboardTransaction } from '@/features/dashboard/use-dashboard';
import type { IconName } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { radius, spacing, useTheme, type ThemeColors } from '@/theme';

const TILE = spacing.xxl + spacing.sm; // 40
/** Home shows only the latest few; the Ledger has the rest. */
const RECENT_COUNT = 3;

type Look = { icon: IconName; bg: keyof ThemeColors; fg: keyof ThemeColors; tone: keyof ThemeColors; sign: string; label: 'income' | 'expense' | 'investment' | 'transfer' };

/** Icon chip, amount colour and sign per transaction type. The arrow / sign / word also say the type, not only the colour. */
const LOOKS: Record<DashboardTransaction['type'], Look> = {
  income: { icon: 'arrow-down-outline', bg: 'successContainer', fg: 'onSuccessContainer', tone: 'successText', sign: '+', label: 'income' },
  expense: { icon: 'arrow-up-outline', bg: 'errorContainer', fg: 'onErrorContainer', tone: 'errorText', sign: '-', label: 'expense' },
  investment: { icon: 'trending-up-outline', bg: 'primaryContainer', fg: 'onPrimaryContainer', tone: 'primaryAccent', sign: '-', label: 'investment' },
  transfer: { icon: 'swap-horizontal-outline', bg: 'cardMuted', fg: 'textSecondary', tone: 'textSecondary', sign: '', label: 'transfer' },
};

const TransactionRow = memo(function TransactionRow({ tx, divider, onOpen }: { tx: DashboardTransaction; divider: boolean; onOpen: () => void }) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const look = LOOKS[tx.type] ?? LOOKS.expense;
  const typeLabel = t(`recent.${look.label}`);
  const amount = `${look.sign}${formatMoney(tx.amount)}`;
  const title = tx.description || tx.category;
  const day = formatDay(tx.date);

  return (
    <ListItem
      title={title}
      subtitle={t('recent.subtitle', { category: tx.category, day })}
      divider={divider}
      onPress={onOpen}
      accessibilityLabel={t('recent.rowLabel', { title, category: tx.category, day, type: typeLabel, amount })}
      accessibilityHint={t('recent.rowHint')}
      leading={
        <View
          style={{
            width: TILE,
            height: TILE,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors[look.bg],
          }}>
          <Ionicons name={look.icon} size={20} color={colors[look.fg]} />
        </View>
      }
      meta={
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text variant="label" weight="semiBold" numeric color={look.tone}>
            {amount}
          </Text>
          <Text variant="caption" color="textSecondary">
            {typeLabel}
          </Text>
        </View>
      }
    />
  );
});

/** Latest transactions with a link to Finance, or an empty state with a first action. */
export const RecentTransactions = memo(function RecentTransactions({ transactions, index }: { transactions: DashboardTransaction[]; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const shown = transactions.slice(0, RECENT_COUNT);
  return (
    <Section index={index}>
      <SectionHead
        title={t('recent.title')}
        description={t('recent.description')}
        actionLabel={t('recent.seeAll')}
        actionAccessibilityLabel={t('recent.seeAllLabel')}
        onActionPress={() => router.push('/finance')}
      />
      <Card padding="none" rounded="xl" style={{ overflow: 'hidden' }}>
        {transactions.length === 0 ? (
          <EmptyState
            icon="pulse-outline"
            accent="finance"
            title={t('recent.empty.title')}
            description={t('recent.empty.description')}
            actionTitle={t('recent.empty.action')}
            onAction={() => router.push('/finance/transaction')}
          />
        ) : (
          shown.map((tx, i) => <TransactionRow key={tx.id} tx={tx} divider={i < shown.length - 1} onOpen={() => openTransaction(router, tx)} />)
        )}
      </Card>
    </Section>
  );
});
