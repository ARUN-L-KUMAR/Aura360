import Ionicons from '@expo/vector-icons/Ionicons';
import type { TFunction } from 'i18next';
import { Stack, useRouter } from 'expo-router';
import { memo, useMemo, type ComponentProps } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { useInbox, useMarkRead } from '@/features/notifications/hooks';
import { routeForActionUrl, timeAgo } from '@/features/notifications/routes';
import type { AppNotification } from '@/features/notifications/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { userErrorMessage } from '@/lib/user-error';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme, type ThemeColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type TypeKey = 'info' | 'success' | 'warning' | 'error';

/** Each type has its own icon shape, so severity never relies on colour alone. */
const TYPE_ICONS: Record<TypeKey, IconName> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  error: 'alert-circle',
};

function toneColors(colors: ThemeColors, type: AppNotification['type']) {
  switch (type) {
    case 'success':
      return { bg: colors.successContainer, fg: colors.onSuccessContainer };
    case 'warning':
      return { bg: colors.warningContainer, fg: colors.onWarningContainer };
    case 'error':
      return { bg: colors.errorContainer, fg: colors.onErrorContainer };
    default:
      return { bg: colors.infoContainer, fg: colors.onInfoContainer };
  }
}

type Row = { kind: 'header'; key: string; title: string } | { kind: 'item'; key: string; item: AppNotification };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", or "Mon, 6 Oct" for anything older. */
function dayLabel(iso: string, todayStart: number, t: TFunction<'notifications'>): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t('day.earlier');
  const days = Math.round((todayStart - startOfDay(date)) / 86_400_000);
  if (days <= 0) return t('day.today');
  if (days === 1) return t('day.yesterday');
  return date.toLocaleDateString(getDeviceLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Newest first (as the server sends them), with a header row at each change of day. */
function groupByDay(items: AppNotification[], t: TFunction<'notifications'>): Row[] {
  const todayStart = startOfDay(new Date());
  const rows: Row[] = [];
  let last = '';
  for (const item of items) {
    const label = dayLabel(item.createdAt, todayStart, t);
    if (label !== last) {
      rows.push({ kind: 'header', key: `day-${label}-${item.id}`, title: label });
      last = label;
    }
    rows.push({ kind: 'item', key: item.id, item });
  }
  return rows;
}

const NotificationRow = memo(function NotificationRow({ item, index, onOpen }: { item: AppNotification; index: number; onOpen: (item: AppNotification) => void }) {
  const { t } = useTranslation('notifications');
  const { colors } = useTheme();
  const motion = useListMotion(index);
  const typeKey: TypeKey = item.type in TYPE_ICONS ? item.type : 'info';
  const tone = toneColors(colors, item.type);
  const unread = !item.isRead;
  const when = timeAgo(item.createdAt);
  const label = t(unread ? 'row.labelUnread' : 'row.label', { type: t(`types.${typeKey}`), title: item.title, message: item.message, when });

  return (
    <Animated.View {...motion} style={{ marginBottom: spacing.sm }}>
      <Card
        variant={unread ? 'outlined' : 'flat'}
        padding="sm"
        onPress={() => onOpen(item)}
        accessibilityLabel={label}
        accessibilityHint={unread ? t('row.hint') : undefined}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View
            style={{ width: spacing.xxl + spacing.sm, height: spacing.xxl + spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
            <Ionicons name={TYPE_ICONS[typeKey]} size={22} color={tone.fg} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" weight={unread ? 'bold' : 'medium'}>
              {item.title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {item.message}
            </Text>
            <Text variant="caption" color="textMuted">
              {when}
            </Text>
          </View>
          {unread ? <Badge variant="dot" severity="info" accessibilityLabel={t('row.unread')} style={{ marginTop: spacing.xs }} /> : null}
        </View>
      </Card>
    </Animated.View>
  );
});

/** The in-app notification list: budget alerts, renewals and reminders, newest first. */
export default function NotificationsScreen() {
  const { t } = useTranslation('notifications');
  const router = useRouter();
  const notify = useNotify();
  const padding = useScreenPadding(false);
  const { data, error, isError, isPending, isRefetching, fetchStatus, refetch } = useInbox();
  const markRead = useMarkRead();
  const refreshControl = useRefreshControl({ onRefresh: refetch });

  const items = data?.notifications;
  const unread = data?.unreadCount ?? 0;
  const rows = useMemo(() => groupByDay(items ?? [], t), [items, t]);

  function open(item: AppNotification) {
    if (!item.isRead) markRead.mutate([item.id], { onError: (e) => notify.error(userErrorMessage(e, t('errors.markRead'))) });
    // "/" when the alert has no specific screen: just stay on the list
    const route = routeForActionUrl(item.actionUrl);
    if (route !== '/') router.push(route as never);
  }

  function markAllRead() {
    markRead.mutate(undefined, {
      onSuccess: () => notify.success(t('markedAllRead')),
      onError: (e) => notify.error(userErrorMessage(e, t('errors.markAllRead'))),
    });
  }

  const openSettings = () => router.push('/notifications/settings' as never);

  let empty = null;
  if (!data) {
    if (isError) empty = <ErrorState kind={errorKindFromError(error)} onRetry={() => void refetch()} retrying={isRefetching} />;
    else if (isPending && fetchStatus === 'paused')
      empty = <EmptyState variant="offline" description={t('offline')} actionTitle={t('offlineRetry')} onAction={() => void refetch()} />;
    else empty = <SkeletonList count={6} />;
  } else {
    empty = (
      <EmptyState
        illustration={<SuccessCheck size={72} accessibilityLabel={null} />}
        title={t('empty.title')}
        description={t('empty.description')}
        actionTitle={t('empty.action')}
        onAction={openSettings}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('title'),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {unread > 0 ? <Button title={t('markAllRead')} variant="ghost" size="sm" fullWidth={false} loading={markRead.isPending} onPress={markAllRead} /> : null}
              <IconButton icon="settings-outline" accessibilityLabel={t('settingsLabel')} onPress={openSettings} />
            </View>
          ),
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={[padding, { gap: 0, paddingTop: spacing.md, flexGrow: 1 }]}
        refreshControl={refreshControl}
        ListHeaderComponent={
          isError && data ? <ErrorState size="inline" kind={errorKindFromError(error)} onRetry={() => void refetch()} retrying={isRefetching} style={{ marginBottom: spacing.md }} /> : null
        }
        ListEmptyComponent={empty}
        initialNumToRender={12}
        windowSize={9}
        renderItem={({ item: row, index }) =>
          row.kind === 'header' ? (
            <SectionHeader title={row.title} style={{ paddingTop: spacing.sm, paddingBottom: spacing.sm }} />
          ) : (
            <NotificationRow item={row.item} index={index} onOpen={open} />
          )
        }
      />
    </>
  );
}
