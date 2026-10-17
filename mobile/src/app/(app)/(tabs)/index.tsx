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
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useUnreadCount } from '@/features/notifications/hooks';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { greeting } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { scheme, toggleTheme } = useTheme();
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching, fetchStatus } = useDashboard();
  const { data: unread = 0 } = useUnreadCount();

  const firstName = (data?.profile.name ?? user?.name ?? '').split(' ')[0];
  const title = firstName ? t('greetingWithName', { greeting: greeting(), name: firstName }) : greeting();
  const today = new Date().toLocaleDateString(getDeviceLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const retry = () => {
    void refetch();
  };
  const errorKind = errorKindFromError(error);

  return (
    <Screen
      title={title}
      subtitle={today}
      header={{
        // Four actions would squeeze a centred small title off a narrow iOS bar, so it stays on the leading edge.
        centerTitle: false,
        actions: [
          { icon: 'search-outline', label: t('appBar.search'), onPress: () => router.push('/search' as never) },
          {
            icon: unread > 0 ? 'notifications' : 'notifications-outline',
            label: t('appBar.notifications'),
            badge: unread,
            onPress: () => router.push('/notifications' as Href),
          },
          {
            icon: scheme === 'dark' ? 'sunny-outline' : 'moon-outline',
            label: scheme === 'dark' ? t('appBar.switchToLight') : t('appBar.switchToDark'),
            onPress: () => {
              haptics.select();
              toggleTheme();
            },
          },
          { icon: 'settings-outline', label: t('appBar.settings'), onPress: () => router.push('/settings') },
        ],
      }}
      onRefresh={() => refetch()}
      refreshing={isRefetching}>
      {/* A failed refresh keeps the cached dashboard on screen and adds a retry row above it. */}
      {isError && data ? <ErrorState size="inline" kind={errorKind} onRetry={retry} retrying={isRefetching} /> : null}

      {!data && isError ? (
        <ErrorState kind={errorKind} title={errorKind === 'generic' ? t('error.title') : undefined} onRetry={retry} retrying={isRefetching} />
      ) : null}

      {!data && isPending && !isError ? (
        fetchStatus === 'paused' ? (
          <EmptyState variant="offline" description={t('offline.description')} actionTitle={t('offline.retry')} onAction={retry} />
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
