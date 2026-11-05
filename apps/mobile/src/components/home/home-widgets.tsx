import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ActivitySection } from '@/components/home/activity-section';
import { FocusCard, WorkoutsCard } from '@/components/home/bento-row';
import { DayGauge } from '@/components/home/day-gauge';
import { FocusPrompt } from '@/components/home/focus-prompt';
import { HomeHero } from '@/components/home/hero';
import { MoneyCard } from '@/components/home/money-card';
import { ModuleTiles } from '@/components/home/module-tiles';
import { PinnedNotes } from '@/components/home/pinned-notes';
import { RecentTransactions } from '@/components/home/recent-transactions';
import { TimerStrip } from '@/components/home/timer-strip';
import { UpNext } from '@/components/home/up-next';
import { FashionHomeCard } from '@/components/home/widgets/fashion-card';
import { FoodHomeCard } from '@/components/home/widgets/food-card';
import { SavedHomeCard } from '@/components/home/widgets/saved-card';
import { SkincareHomeCard } from '@/components/home/widgets/skincare-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { homeBlocks, scoreGoals, type HomeLayout } from '@/features/home/layout';
import type { RunningTimer } from '@/features/time/hooks';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

type Props = {
  data: Dashboard;
  layout: HomeLayout;
  timer: RunningTimer | null;
  firstName: string;
};

/**
 * Draws Home from the person's layout. What goes where is decided by `homeBlocks` (pure, unit-tested): the general
 * sections they kept (day score, "Up next", shortcut tiles, activity chart), then one block for each module they follow,
 * in their order. This only turns each block into its component.
 */
export function HomeWidgets({ data, layout, timer, firstName }: Props) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const today = data.today;
  const customize = () => router.push('/home/customize' as never);

  const out: ReactNode[] = [];
  // Blocks that fade in one after another take the next place in line.
  let place = 0;
  const next = () => place++;

  for (const block of homeBlocks(layout, { hasToday: !!today, timerRunning: !!timer })) {
    switch (block.kind) {
      case 'empty':
        out.push(
          <EmptyState key="empty" icon="options-outline" title={t('customize.empty.title')} description={t('customize.empty.body')} actionTitle={t('customize.empty.action')} onAction={customize} />,
        );
        break;
      case 'score':
        if (today) out.push(<DayGauge key="score" today={today} goals={scoreGoals(layout)} />);
        break;
      case 'hero':
        out.push(<HomeHero key="hero" name={firstName} data={data} />);
        break;
      case 'prompt':
        out.push(<FocusPrompt key="prompt" index={next()} />);
        break;
      case 'upNext':
        if (today) out.push(<UpNext key="upNext" today={today} timerRunning={!!timer} index={next()} allowed={block.allowed} />);
        break;
      case 'timer':
        if (timer) out.push(<TimerStrip key="timer" timer={timer} index={next()} />);
        break;
      case 'tiles':
        out.push(<ModuleTiles key="tiles" data={data} modules={layout.modules} index={next()} onCustomize={customize} />);
        break;
      case 'activity':
        out.push(<ActivitySection key="activity" chart={data.chart} index={next()} />);
        break;
      case 'halves':
        if (today) {
          out.push(
            <View key="halves" style={{ flexDirection: 'row', gap: spacing.md }}>
              {block.modules.map((module) => (module === 'time' ? <FocusCard key="time" today={today} timer={timer} /> : <WorkoutsCard key="fitness" today={today} />))}
            </View>,
          );
        }
        break;
      case 'finance':
        out.push(<MoneyCard key="finance" month={data.month} today={today} index={next()} />);
        out.push(<RecentTransactions key="recent" transactions={data.recentTransactions} index={next()} />);
        break;
      case 'food':
        if (today) out.push(<FoodHomeCard key="food" index={next()} food={today.food} />);
        break;
      case 'notes':
        if (today) out.push(<PinnedNotes key="notes" notes={today.pinnedNotes} index={next()} showEmpty />);
        break;
      case 'saved':
        out.push(<SavedHomeCard key="saved" index={next()} />);
        break;
      case 'skincare':
        out.push(<SkincareHomeCard key="skincare" index={next()} />);
        break;
      case 'fashion':
        out.push(<FashionHomeCard key="fashion" index={next()} />);
        break;
    }
  }

  return <>{out}</>;
}
