import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { RoutineStepRow, ShelfRow } from '@/components/skincare/product-row';
import { Heading, HeroChip, HeroChipsSkeleton, MetricCard, MetricCell, MetricGrid, RingCard } from '@/components/skincare/skincare-kit';
import { CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { Divider } from '@/components/ui/divider';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { PremiumHero, type HeroAction } from '@/components/ui/premium-hero';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { ProgressRing } from '@/components/viz/progress-ring';
import { useSkincareProducts } from '@/features/skincare/hooks';
import { routineFor, skincareStats, type SkincareProduct } from '@/features/skincare/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { spacing, useTheme } from '@/theme';

type Section = 'morning' | 'evening' | 'shelf';

const SECTIONS: readonly Section[] = ['morning', 'evening', 'shelf'];
const RING_SIZE = spacing.xxxl * 2 + spacing.lg; // 112
const RING_THICKNESS = spacing.md;

export default function SkincareScreen() {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('skincare');
  // `/skincare?section=shelf` opens a section directly (deep links, previews).
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<Section>(() => SECTIONS.find((value) => value === params.section) ?? 'morning');
  // Steps ticked off this session, keyed by routine and product so a "both" product is tracked per routine.
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const query = useSkincareProducts();
  const products = useMemo<SkincareProduct[]>(() => query.data ?? [], [query.data]);
  const morning = useMemo(() => routineFor(products, 'morning'), [products]);
  const evening = useMemo(() => routineFor(products, 'evening'), [products]);
  const stats = useMemo(() => skincareStats(products), [products]);

  const isRoutine = section !== 'shelf';
  const steps = section === 'morning' ? morning : section === 'evening' ? evening : [];
  const total = steps.length;
  const doneCount = steps.filter((p) => completed[`${section}:${p.id}`]).length;
  const remaining = total - doneCount;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const complete = total > 0 && remaining === 0;

  const sections: CategorySection<Section>[] = [
    { value: 'morning', label: t('sections.morning', { n: morning.length }) },
    { value: 'evening', label: t('sections.evening', { n: evening.length }) },
    { value: 'shelf', label: t('sections.shelf', { n: products.length }) },
  ];

  const toggle = useCallback(
    (id: string) => {
      const key = `${section}:${id}`;
      setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [section],
  );

  // Celebrate the moment a routine becomes complete (a tick that completes it), never on switching sections.
  const lastRef = useRef({ section, complete });
  useEffect(() => {
    const last = lastRef.current;
    if (last.section === section && !last.complete && complete) {
      haptics.success();
      if (section === 'morning' || section === 'evening') analytics.track('skincare_routine_completed', { routine: section });
    }
    lastRef.current = { section, complete };
  }, [section, complete]);

  const skincare = accent('skincare');
  const heroMotion = useBlockMotion(0);
  const mainMotion = useBlockMotion(60);
  const statsMotion = useBlockMotion(120);

  const offline = query.isPending && query.fetchStatus === 'paused';
  const loading = query.isPending && !offline;
  const failed = query.isError && query.data === undefined;
  const ready = !loading && !offline && !failed;
  const shelfEmpty = ready && products.length === 0;

  const toMorning: HeroAction = { label: t('hero.switchMorning'), icon: 'sunny-outline', variant: 'solid', onPress: () => setSection('morning'), accessibilityHint: t('hero.switchMorningHint') };
  const toEvening: HeroAction = { label: t('hero.switchEvening'), icon: 'moon-outline', variant: 'solid', onPress: () => setSection('evening'), accessibilityHint: t('hero.switchEveningHint') };
  const toShelf: HeroAction = { label: t('hero.viewShelf'), icon: 'flask-outline', variant: 'glass', onPress: () => setSection('shelf'), accessibilityHint: t('hero.viewShelfHint') };
  const heroActions: HeroAction[] = section === 'morning' ? [toEvening, toShelf] : section === 'evening' ? [toMorning, toShelf] : [toMorning, { ...toEvening, variant: 'glass' }];

  const heroSubtitle = !isRoutine
    ? products.length > 0
      ? t('hero.shelfSummary', { count: products.length })
      : t('hero.shelfEmpty')
    : total === 0
      ? t('hero.noSteps')
      : complete
        ? t('hero.complete')
        : t('hero.progress', { done: doneCount, total });

  const header = <CategoryHeader module="skincare" eyebrow={t('header.eyebrow')} sections={sections} section={section} onSectionChange={setSection} />;

  const statsBlock = (
    <Animated.View {...statsMotion} style={{ gap: spacing.md }}>
      <Heading overline={t('stats.overline')} title={t('stats.title')} subtitle={t('stats.subtitle')} />
      <MetricGrid>
        <MetricCell>
          <MetricCard label={t('stats.products')} icon="flask-outline" value={stats.total} />
        </MetricCell>
        <MetricCell>
          <MetricCard
            label={t('stats.averageRating')}
            icon="star-outline"
            value={stats.averageRating ?? 0}
            fractionDigits={1}
            caption={stats.averageRating === null ? t('stats.noRatings') : t('stats.ratedCaption', { count: stats.ratedCount })}
          />
        </MetricCell>
        <MetricCell>
          <MetricCard label={t('stats.needToBuy')} icon="cart-outline" value={stats.needToBuy} />
        </MetricCell>
        <MetricCell>
          <MetricCard label={t('stats.finished')} icon="checkmark-done-outline" value={stats.finished} />
        </MetricCell>
      </MetricGrid>
    </Animated.View>
  );

  const routineCard = (
    <Animated.View {...mainMotion}>
      <RingCard>
        <Heading overline={section === 'evening' ? t('routine.eveningOverline') : t('routine.morningOverline')} title={t('routine.title')} subtitle={t('routine.subtitle')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg }}>
          <ProgressRing
            value={doneCount}
            max={total}
            size={RING_SIZE}
            thickness={RING_THICKNESS}
            accent="skincare"
            label={t('routine.progressLabel')}
            valueText={t('routine.progressValue', { done: doneCount, total })}>
            {complete ? (
              <SuccessCheck size={spacing.xxl + spacing.sm} accent="skincare" accessibilityLabel={null} />
            ) : (
              <AnimatedNumber value={percent} format={(n) => t('routine.percent', { value: n })} variant="title" weight="bold" />
            )}
          </ProgressRing>
          <View style={{ flex: 1, flexBasis: 140, gap: spacing.xs }}>
            <Text variant="body" weight="bold" numeric>
              {t('routine.stepsDone', { done: doneCount, total })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name={complete ? 'checkmark-circle' : 'flag-outline'} size={spacing.lg} color={complete ? skincare.text : colors.textSecondary} />
              <Text variant="caption" weight="semiBold" accessibilityLiveRegion="polite" style={{ flexShrink: 1, color: complete ? skincare.text : colors.textSecondary }}>
                {complete ? t('routine.complete') : t('routine.remaining', { count: remaining })}
              </Text>
            </View>
          </View>
        </View>
        <View>
          {steps.map((product, index) => (
            <Fragment key={product.id}>
              {index > 0 ? <Divider /> : null}
              <RoutineStepRow product={product} step={index + 1} done={!!completed[`${section}:${product.id}`]} onToggle={toggle} />
            </Fragment>
          ))}
        </View>
      </RingCard>
    </Animated.View>
  );

  const shelfCard = (
    <Animated.View {...mainMotion}>
      <RingCard style={{ gap: spacing.md }}>
        <Heading overline={t('shelf.overline')} title={t('shelf.title')} subtitle={t('shelf.subtitle')} />
        <View accessibilityLabel={t('shelf.listLabel')}>
          {products.map((product, index) => (
            <Fragment key={product.id}>
              {index > 0 ? <Divider /> : null}
              <ShelfRow product={product} />
            </Fragment>
          ))}
        </View>
      </RingCard>
    </Animated.View>
  );

  return (
    <CategoryFrame>
      <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
        {header}

        {query.isError && query.data !== undefined ? <RefreshError error={query.error} onRetry={() => void query.refetch()} retrying={query.isRefetching} /> : null}

        {!offline && !failed ? (
          <Animated.View {...heroMotion}>
            <PremiumHero
              chip={{ icon: 'sparkles', label: isRoutine ? t('hero.chipRoutine') : t('hero.chipShelf') }}
              title={isRoutine ? (section === 'evening' ? t('hero.eveningTitle') : t('hero.morningTitle')) : t('hero.shelfTitle')}
              accentWord={isRoutine ? t('hero.routineAccent') : t('hero.shelfAccent')}
              subtitle={loading ? undefined : heroSubtitle}
              actions={shelfEmpty ? undefined : heroActions}>
              {loading ? (
                <HeroChipsSkeleton />
              ) : isRoutine && total > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  <HeroChip icon="list-outline" value={total} label={t('hero.chipSteps')} spoken={t('hero.spokenSteps', { count: total })} />
                  <HeroChip icon="checkmark-circle-outline" value={doneCount} label={t('hero.chipDone')} spoken={t('hero.spokenDone', { count: doneCount })} />
                  <HeroChip icon="flag-outline" value={remaining} label={t('hero.chipToGo')} spoken={t('hero.spokenToGo', { count: remaining })} />
                </View>
              ) : null}
            </PremiumHero>
          </Animated.View>
        ) : null}

        {loading ? (
          <RingCard>
            <SkeletonGroup label={t('hero.loading')} style={{ gap: spacing.md }}>
              <Skeleton shape="line" width="40%" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <Skeleton shape="circle" size={RING_SIZE} />
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <Skeleton shape="line" width="60%" />
                  <Skeleton shape="line" width="80%" />
                </View>
              </View>
              <Skeleton shape="box" height={spacing.xxxl + spacing.xl} />
            </SkeletonGroup>
          </RingCard>
        ) : null}

        {offline ? <OfflineState description={t('offline')} onRetry={() => void query.refetch()} /> : null}
        {failed ? <LoadError error={query.error} title={t('errors.load')} onRetry={() => void query.refetch()} retrying={query.isRefetching} /> : null}

        {shelfEmpty ? (
          <EmptyState
            accent="skincare"
            icon="sparkles-outline"
            title={t('empty.shelfTitle')}
            description={t('empty.shelfBody')}
            actionTitle={t('empty.refresh')}
            onAction={() => void query.refetch()}
          />
        ) : null}

        {ready && !shelfEmpty && isRoutine ? (
          <>
            {total > 0 ? (
              routineCard
            ) : (
              <EmptyState
                accent="skincare"
                icon={section === 'evening' ? 'moon-outline' : 'sunny-outline'}
                title={section === 'evening' ? t('empty.eveningTitle') : t('empty.morningTitle')}
                description={t('empty.routineBody')}
                actionTitle={t('empty.viewShelf')}
                onAction={() => setSection('shelf')}
              />
            )}
            {statsBlock}
          </>
        ) : null}

        {ready && !shelfEmpty && !isRoutine ? (
          <>
            {statsBlock}
            {shelfCard}
          </>
        ) : null}
      </Screen>
    </CategoryFrame>
  );
}
