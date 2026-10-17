import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import type { DashboardTransaction } from '@/features/dashboard/use-dashboard';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const TILE = spacing.xxl + spacing.sm; // 40

const TransactionRow = memo(function TransactionRow({ tx, divider }: { tx: DashboardTransaction; divider: boolean }) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const income = tx.type === 'income';
  const typeLabel = income ? t('recent.income') : t('recent.expense');
  const amount = `${income ? '+' : '-'}${formatMoney(tx.amount)}`;
  const title = tx.description || tx.category;
  const day = formatDay(tx.date);

  return (
    <ListItem
      title={title}
      subtitle={t('recent.subtitle', { category: tx.category, day })}
      divider={divider}
      accessibilityLabel={t('recent.rowLabel', { title, category: tx.category, day, type: typeLabel, amount })}
      leading={
        <View
          style={{
            width: TILE,
            height: TILE,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: income ? colors.successContainer : colors.errorContainer,
          }}>
          <Ionicons
            name={income ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={20}
            color={income ? colors.onSuccessContainer : colors.onErrorContainer}
          />
        </View>
      }
      meta={
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text variant="label" weight="semiBold" numeric color={income ? 'successText' : 'errorText'}>
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
export function RecentTransactions({ transactions, index }: { transactions: DashboardTransaction[]; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  return (
    <Section index={index}>
      <SectionHeader
        title={t('recent.title')}
        actionLabel={t('recent.seeAll')}
        actionAccessibilityLabel={t('recent.seeAllLabel')}
        onActionPress={() => router.push('/finance')}
      />
      <Card padding="none" style={{ overflow: 'hidden' }}>
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
          transactions.map((tx, i) => <TransactionRow key={tx.id} tx={tx} divider={i < transactions.length - 1} />)
        )}
      </Card>
    </Section>
  );
}
