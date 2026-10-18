import { useMemo } from 'react';

import { ActivitySection } from '@/components/home/activity-section';
import { firstNameOf } from '@/components/home/derive';
import { HomeHero } from '@/components/home/hero';
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
import { useTranslation } from '@/i18n';
import { useAuth } from '@/providers/auth';
import { spacing } from '@/theme';

/** Room under the last block for the floating assistant bubble. */
const BOTTOM_CLEARANCE = spacing.xxxl + spacing.lg;

/**
 * Home: the web dashboard's layout. The persistent tab header sits above; below it the hero (greeting, the two main
 * actions, a few figures), the stat cards, quick actions, the week's activity, the month's money, every module and the
 * latest transactions. A failed refresh keeps the cached dashboard on screen with a retry row; pull down to refresh.
 */
export default function HomeScreen() {
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching, fetchStatus } = useDashboard();

  const firstName = useMemo(() => firstNameOf(data?.profile.name ?? user?.name), [data?.profile.name, user?.name]);
  const retry = () => {
    void refetch();
  };
  const errorKind = errorKindFromError(error);

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: BOTTOM_CLEARANCE }}>
      <HomeHero name={firstName} data={data} />

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
          <OverviewStats data={data} index={0} />
          <QuickActions index={1} />
          <ActivitySection chart={data.chart} index={2} />
          <MonthSummary month={data.month} index={3} />
          <ModulesGrid counts={data.counts} index={4} />
          <RecentTransactions transactions={data.recentTransactions} index={5} />
          <Shortcuts index={6} />
        </>
      ) : null}
    </Screen>
  );
}
