import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { memo, useMemo, type ComponentProps } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
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
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme, type ThemeColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Each type has its own icon shape, so severity never relies on colour alone. */
const TYPES: Record<AppNotification['type'], { icon: IconName; label: string }> = {
  info: { icon: 'information-circle', label: 'Info' },
  success: { icon: 'checkmark-circle', label: 'Success' },
  warning: { icon: 'warning', label: 'Warning' },
  error: { icon: 'alert-circle', label: 'Alert' },
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
function dayLabel(iso: string, todayStart: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const days = Math.round((todayStart - startOfDay(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Newest first (as the server sends them), with a header row at each change of day. */
function groupByDay(items: AppNotification[]): Row[] {
  const todayStart = startOfDay(new Date());
  const rows: Row[] = [];
  let last = '';
  for (const item of items) {
    const label = dayLabel(item.createdAt, todayStart);
    if (label !== last) {
      rows.push({ kind: 'header', key: `day-${label}-${item.id}`, title: label });
      last = label;
    }
    rows.push({ kind: 'item', key: item.id, item });
  }
  return rows;
}

const NotificationRow = memo(function NotificationRow({ item, index, onOpen }: { item: AppNotification; index: number; onOpen: (item: AppNotification) => void }) {
  const { colors } = useTheme();
  const motion = useListMotion(index);
  const type = TYPES[item.type] ?? TYPES.info;
  const tone = toneColors(colors, item.type);
  const unread = !item.isRead;
  const when = timeAgo(item.createdAt);

  return (
    <Animated.View {...motion} style={{ marginBottom: spacing.sm }}>
      <Card
        variant={unread ? 'outlined' : 'flat'}
        padding="sm"
        onPress={() => onOpen(item)}
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${type.label}. ${item.title}. ${item.message}. ${when}`}
        accessibilityHint={unread ? 'Marks as read' : undefined}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View
            style={{ width: spacing.xxl + spacing.sm, height: spacing.xxl + spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
            <Ionicons name={type.icon} size={22} color={tone.fg} />
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
          {unread ? <Badge variant="dot" severity="info" accessibilityLabel="Unread" style={{ marginTop: spacing.xs }} /> : null}
        </View>
      </Card>
    </Animated.View>
  );
});

/** The in-app notification list: budget alerts, renewals and reminders, newest first. */
export default function NotificationsScreen() {
  const router = useRouter();
  const notify = useNotify();
  const padding = useScreenPadding(false);
  const { data, error, isError, isPending, isRefetching, fetchStatus, refetch } = useInbox();
  const markRead = useMarkRead();
  const refreshControl = useRefreshControl({ onRefresh: refetch });

  const items = data?.notifications;
  const unread = data?.unreadCount ?? 0;
  const rows = useMemo(() => groupByDay(items ?? []), [items]);

  function open(item: AppNotification) {
    if (!item.isRead) markRead.mutate([item.id]);
    // "/" when the alert has no specific screen: just stay on the list
    const route = routeForActionUrl(item.actionUrl);
    if (route !== '/') router.push(route as never);
  }

  function markAllRead() {
    markRead.mutate(undefined, {
      onSuccess: () => notify.success('All notifications marked as read'),
      onError: (e) => notify.error(e),
    });
  }

  const openSettings = () => router.push('/notifications/settings' as never);

  let empty = null;
  if (!data) {
    if (isError) empty = <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
    else if (isPending && fetchStatus === 'paused') empty = <EmptyState variant="offline" description="Connect to the internet to load your notifications." />;
    else empty = <SkeletonList count={6} />;
  } else {
    empty = (
      <EmptyState
        illustration={<SuccessCheck size={72} accessibilityLabel={null} />}
        title="You're all caught up"
        description="Budget alerts, renewal reminders and your daily reminders show up here."
        actionTitle="Set up reminders"
        onAction={openSettings}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {unread > 0 ? <Button title="Mark all read" variant="ghost" size="sm" fullWidth={false} loading={markRead.isPending} onPress={markAllRead} /> : null}
              <IconButton icon="settings-outline" accessibilityLabel="Notification settings" onPress={openSettings} />
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
          isError && data ? <ErrorState size="inline" error={error} onRetry={() => void refetch()} retrying={isRefetching} style={{ marginBottom: spacing.md }} /> : null
        }
        ListEmptyComponent={empty}
        initialNumToRender={12}
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
