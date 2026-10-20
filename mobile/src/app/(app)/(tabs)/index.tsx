import { useMemo } from 'react';

import { activitySeries, firstNameOf, streakOf, todayIndexOf } from '@/components/home/derive';
import { GreetingBar } from '@/components/home/greeting-bar';
import { HomeSkeleton } from '@/components/home/home-skeleton';
import { HomeWidgets } from '@/components/home/home-widgets';
import { useRunningTimerOnFocus } from '@/components/home/timer-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useHomeLayout } from '@/features/home/use-home-layout';
import { useTranslation } from '@/i18n';
import { todayIso } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { spacing } from '@/theme';

/** Room under the last block for the floating assistant bubble. */
const BOTTOM_CLEARANCE = spacing.xxxl + spacing.lg;

/**
 * Home: a personal dashboard for today, built from what the person chose to focus on (Customize Home, saved on this
 * device). A compact greeting with the streak, then the general sections they kept (the day gauge, the next thing worth
 * doing, shortcut tiles, the week's activity), then one card for each module they follow. Creating things is the bar's
 * "+", so Home does not repeat it. A server without the `today` block gets the older hero. A failed refresh keeps the
 * cached dashboard with a retry row; pull down to refresh.
 */
export default function HomeScreen() {
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching, fetchStatus } = useDashboard();
  const { layout, ready } = useHomeLayout();
  const timer = useRunningTimerOnFocus();

  const firstName = useMemo(() => firstNameOf(data?.profile.name ?? user?.name), [data?.profile.name, user?.name]);
  const streak = useMemo(() => {
    if (!data) return 0;
    const series = activitySeries(data.chart);
    return streakOf(series, todayIndexOf(data.chart, todayIso()));
  }, [data]);
  const retry = () => {
    void refetch();
  };
  const errorKind = errorKindFromError(error);

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: BOTTOM_CLEARANCE }}>
      <GreetingBar name={firstName} streak={streak} />

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

      {/* The saved layout is read in a few milliseconds; waiting for it avoids flashing the default one first. */}
      {data && !ready ? <HomeSkeleton /> : null}
      {data && ready ? <HomeWidgets data={data} layout={layout} timer={timer} firstName={firstName} /> : null}
    </Screen>
  );
}
