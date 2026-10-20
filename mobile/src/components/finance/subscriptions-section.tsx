import { useRouter } from 'expo-router';
import { Calendar, CheckCircle2, Clock, Repeat, Zap } from 'lucide-react-native';
import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { paymentMethodLabel } from '@/components/finance/labels';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { renderPaymentLucideIcon } from '@/components/finance/lucide-category-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useRenewSubscription, useSubscriptions } from '@/features/finance/hooks';
import type { Subscription } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  header: ReactNode;
};

export function openSubscription(router: ReturnType<typeof useRouter>, sub?: Subscription) {
  router.push({ pathname: '/finance/subscription', params: sub ? { sub: JSON.stringify(sub) } : {} });
}

/** Whole days until the next billing date as the server worked them out, or null when there is no date. */
function daysUntil(sub: Subscription): number | null {
  return typeof sub.daysUntilRenewal === 'number' ? sub.daysUntilRenewal : null;
}

const SubscriptionCard = memo(function SubscriptionCard({ sub, index }: { sub: Subscription; index: number }) {
  const motion = useListMotion(index);
  const router = useRouter();
  const notify = useNotify();
  const { colors } = useTheme();
  const { t } = useTranslation('finance');
  const renew = useRenewSubscription();

  const active = sub.status === 'active';
  const days = daysUntil(sub);
  const overdue = active && days !== null && days < 0;
  const dueSoon = active && days !== null && days >= 0 && days <= 7;
  const alert = overdue || dueSoon;
  const tone = overdue ? colors.errorText : dueSoon ? colors.warningText : colors.textSecondary;

  // A paused or cancelled subscription has no renewal to count down to: show its date only.
  const when =
    days === null || !active
      ? t('subList.noDate')
      : days === 0
        ? t('subList.today')
        : days > 0
          ? t('subList.inDays', { count: days })
          : t('subList.overdueBy', { count: Math.abs(days) });
  const statusText = active ? (overdue ? t('subList.overdue') : t('subList.active')) : sub.status === 'pending' ? t('subList.paused') : sub.status === 'cancelled' ? t('subList.cancelled') : t('subList.ended');
  const cycle = t(`subList.cycle.${sub.billingCycle}`);

  async function markRenewed() {
    try {
      await renew.mutateAsync(sub.id);
      haptics.success();
      notify.success(t('subList.renewed'));
    } catch {
      notify.error(t('errors.update'));
    }
  }

  return (
    <Animated.View {...motion}>
      <Card
        onPress={() => openSubscription(router, sub)}
        accessibilityLabel={t('subList.cardLabel', { name: sub.name, amount: formatMoney(sub.amount), cycle, status: statusText, when })}
        accessibilityHint={t('subList.rowHint')}
        style={[styles.card, { borderColor: alert ? tone : colors.border, opacity: active ? 1 : 0.75 }]}>
        <View style={styles.cardTop}>
          <View style={styles.nameRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
              <Repeat size={16} color={colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" weight="bold" numberOfLines={1}>
                {sub.name}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {sub.category || t('categories.other')} · {cycle}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="label" weight="bold" numeric>
              {formatMoney(sub.amount)}
            </Text>
            <Text variant="overline" color="textMuted">
              {t(`subList.perCycle.${sub.billingCycle}`)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardBottom, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.metaRow}>
            <Calendar size={12} color={alert ? tone : colors.textMuted} />
            <Text variant="caption" numeric style={{ color: tone }}>
              {sub.nextBillingDate ? (active ? `${formatDay(sub.nextBillingDate)} · ${when}` : formatDay(sub.nextBillingDate)) : when}
            </Text>
          </View>

          <View style={styles.metaRow}>
            {renderPaymentLucideIcon(sub.paymentMethod, { size: 12, color: colors.textMuted })}
            <Text variant="caption" color="textMuted">
              {sub.paymentMethod ? paymentMethodLabel(sub.paymentMethod) : t('subList.auto')}
            </Text>
            <Badge severity={active ? (overdue ? 'error' : 'success') : 'warning'} label={statusText} size="sm" />
          </View>
        </View>

        {alert ? (
          <Button title={t('subList.renew')} size="sm" variant="secondary" leftIcon="checkmark-done-outline" onPress={markRenewed} loading={renew.isPending} accessibilityHint={t('subList.renewHint')} />
        ) : null}
      </Card>
    </Animated.View>
  );
});

export function SubscriptionsSection({ header }: Props) {
  const { colors, shades } = useTheme();
  const { t } = useTranslation('finance');
  const router = useRouter();
  const heroMotion = useBlockMotion();
  const subscriptions = useSubscriptions();

  const data = useMemo(() => subscriptions.data?.data ?? [], [subscriptions.data]);
  const live = useMemo(() => data.filter((s) => s.status === 'active'), [data]);
  const inactive = useMemo(() => data.filter((s) => s.status !== 'active'), [data]);
  const summary = subscriptions.data?.summary;
  // Only active subscriptions count towards the burn rate; without a summary add up each one's monthly equivalent.
  const burnRate = summary?.monthlyBurnRate ?? live.reduce((acc, s) => acc + (s.monthlyEquivalent ?? s.amount), 0);
  const dueCount = summary?.dueIn7DaysCount ?? live.filter((s) => s.isDueSoon).length;
  const overdueCount = summary?.overdueCount ?? live.filter((s) => s.isOverdue).length;
  const attention = dueCount + overdueCount;

  if (subscriptions.isPending) {
    const offline = subscriptions.fetchStatus === 'paused';
    return (
      <Screen contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
        {header}
        {offline ? (
          <OfflineState description={t('offline.finance')} onRetry={() => void subscriptions.refetch()} />
        ) : (
          <>
            <SkeletonCard lines={2} />
            <SkeletonList count={3} />
          </>
        )}
      </Screen>
    );
  }

  if (subscriptions.isError && !subscriptions.data) {
    return (
      <Screen onRefresh={() => subscriptions.refetch()} refreshing={subscriptions.isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
        {header}
        <LoadError error={subscriptions.error} title={t('subList.errorTitle')} onRetry={() => void subscriptions.refetch()} retrying={subscriptions.isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => subscriptions.refetch()} refreshing={subscriptions.isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      {subscriptions.isError ? <RefreshError error={subscriptions.error} onRetry={() => void subscriptions.refetch()} retrying={subscriptions.isRefetching} /> : null}

      {data.length > 0 ? (
        <Animated.View {...heroMotion}>
          <Card style={[styles.heroCard, { backgroundColor: colors.heroSurface }]}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Zap size={14} color={shades.warning[400]} />
                  <Text variant="overline" style={{ color: colors.onHeroMuted }}>
                    {t('subList.burnRate')}
                  </Text>
                </View>
                <Text variant="hero" style={{ color: colors.onHero }}>
                  {formatMoney(burnRate)}
                </Text>
                <Text variant="caption" style={{ color: colors.onHeroMuted }}>
                  {t('subList.activeServicesCount', { count: live.length })} · {t('subList.yearlyCost', { amount: formatMoney(summary?.yearlyBurnRate ?? burnRate * 12, { compact: true }) })}
                </Text>
              </View>

              <View style={[styles.alertBadge, { backgroundColor: (attention > 0 ? shades.warning[500] : shades.success[500]) + '26' }]}>
                {attention > 0 ? <Clock size={16} color={shades.warning[400]} /> : <CheckCircle2 size={16} color={shades.success[400]} />}
                <Text variant="caption" weight="bold" style={{ color: attention > 0 ? shades.warning[400] : shades.success[400] }}>
                  {overdueCount > 0 ? t('subList.overdueCount', { count: overdueCount }) : dueCount > 0 ? t('subList.dueSoonCount', { count: dueCount }) : t('subList.allClear')}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {data.length === 0 ? (
        <EmptyState
          accent="finance"
          icon="repeat-outline"
          title={t('subList.emptyTitle')}
          description={t('subList.emptyDesc')}
          actionTitle={t('subList.emptyAction')}
          onAction={() => openSubscription(router)}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            <View style={styles.sectionHeader}>
              <Text variant="label" weight="bold" accessibilityRole="header">
                {t('subList.activeTitle')}
              </Text>
              <Text variant="caption" color="textMuted" numeric>
                {live.length}
              </Text>
            </View>
            {live.map((sub, idx) => (
              <SubscriptionCard key={sub.id} sub={sub} index={idx} />
            ))}
          </View>

          {inactive.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              <View style={styles.sectionHeader}>
                <Text variant="label" weight="bold" accessibilityRole="header">
                  {t('subList.inactiveTitle')}
                </Text>
                <Text variant="caption" color="textMuted" numeric>
                  {inactive.length}
                </Text>
              </View>
              {inactive.map((sub, idx) => (
                <SubscriptionCard key={sub.id} sub={sub} index={idx} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
