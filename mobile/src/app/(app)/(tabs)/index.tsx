import { useRouter, type Href } from 'expo-router';

import { ActivitySection } from '@/components/home/activity-section';
import { HomeSkeleton } from '@/components/home/home-skeleton';
import { MonthSummary } from '@/components/home/month-summary';
import { ModulesGrid } from '@/components/home/modules-grid';
import { OverviewStats } from '@/components/home/overview-stats';
import { QuickActions } from '@/components/home/quick-actions';
import { RecentTransactions } from '@/components/home/recent-transactions';
import { Shortcuts } from '@/components/home/shortcuts';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useUnreadCount } from '@/features/notifications/hooks';
import { greeting } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { scheme, toggleTheme } = useTheme();
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching, fetchStatus } = useDashboard();
  const { data: unread = 0 } = useUnreadCount();

  const firstName = (data?.profile.name ?? user?.name ?? '').split(' ')[0];
  const title = firstName ? `${greeting()}, ${firstName}` : greeting();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const retry = () => {
    void refetch();
  };

  return (
    <Screen
      title={title}
      subtitle={today}
      header={{
        actions: [
          {
            icon: unread > 0 ? 'notifications' : 'notifications-outline',
            label: 'Notifications',
            badge: unread,
            onPress: () => router.push('/notifications' as Href),
          },
          {
            icon: scheme === 'dark' ? 'sunny-outline' : 'moon-outline',
            label: `Switch to ${scheme === 'dark' ? 'light' : 'dark'} mode`,
            onPress: () => {
              haptics.select();
              toggleTheme();
            },
          },
          { icon: 'settings-outline', label: 'Open settings', onPress: () => router.push('/settings') },
        ],
      }}
      onRefresh={() => refetch()}
      refreshing={isRefetching}>
      {/* A failed refresh keeps the cached dashboard on screen and adds a retry row above it. */}
      {isError && data ? <ErrorState size="inline" error={error} onRetry={retry} retrying={isRefetching} /> : null}

      {!data && isError ? <ErrorState error={error} title="Couldn't load your dashboard" onRetry={retry} retrying={isRefetching} /> : null}

      {!data && isPending && !isError ? (
        fetchStatus === 'paused' ? (
          <EmptyState variant="offline" description="Connect to the internet to load your dashboard." actionTitle="Try again" onAction={retry} />
        ) : (
          <HomeSkeleton />
        )
      ) : null}

      {data ? (
        <>
          <QuickActions index={0} />
          <OverviewStats data={data} index={1} />
          <MonthSummary month={data.month} index={2} />
          <ActivitySection chart={data.chart} index={3} />
          <ModulesGrid counts={data.counts} index={4} />
          <RecentTransactions transactions={data.recentTransactions} index={5} />
          <Shortcuts index={6} />
        </>
      ) : null}
    </Screen>
  );
}
