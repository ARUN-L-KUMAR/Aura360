import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { useScreenPadding } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useInbox, useMarkRead } from '@/features/notifications/hooks';
import { routeForActionUrl, timeAgo } from '@/features/notifications/routes';
import type { AppNotification } from '@/features/notifications/types';
import { radius, spacing, useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<AppNotification['type'], { name: IconName; color: string }> = {
  info: { name: 'information-circle', color: '#3b82f6' },
  success: { name: 'checkmark-circle', color: '#16a34a' },
  warning: { name: 'warning', color: '#d97706' },
  error: { name: 'alert-circle', color: '#dc2626' },
};

/** The in-app notification list: budget alerts, renewals and reminders, newest first. */
export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const padding = useScreenPadding(false);
  const { data, isLoading, isRefetching, refetch } = useInbox();
  const markRead = useMarkRead();

  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  function open(item: AppNotification) {
    if (!item.isRead) markRead.mutate([item.id]);
    // "/" when the alert has no specific screen: just stay on the list
    const route = routeForActionUrl(item.actionUrl);
    if (route !== '/') router.push(route as never);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () =>
            unread > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => markRead.mutate(undefined)} hitSlop={8}>
                <Text variant="label" color="primary">
                  Mark all read
                </Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => router.push('/notifications/settings' as never)} hitSlop={8}>
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </Pressable>
            ),
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[padding, { paddingTop: spacing.md, flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.textMuted} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="notifications-outline"
              title="Nothing yet"
              description="Budget alerts, renewal reminders and your daily reminders show up here."
              actionTitle="Set up reminders"
              onAction={() => router.push('/notifications/settings' as never)}
            />
          )
        }
        renderItem={({ item }) => {
          const icon = ICONS[item.type] ?? ICONS.info;
          return (
            <Pressable accessibilityRole="button" accessibilityHint={item.isRead ? undefined : 'Marks as read'} onPress={() => open(item)}>
              <GlassCard style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, opacity: item.isRead ? 0.75 : 1 }}>
                <Ionicons name={icon.name} size={22} color={icon.color} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: item.isRead ? '500' : '700' }}>{item.title}</Text>
                  <Text variant="caption" muted>
                    {item.message}
                  </Text>
                  <Text variant="caption" muted style={{ marginTop: 2 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead && <View style={{ width: 9, height: 9, borderRadius: radius.pill, backgroundColor: '#3b82f6', marginTop: 6 }} />}
              </GlassCard>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </>
  );
}
