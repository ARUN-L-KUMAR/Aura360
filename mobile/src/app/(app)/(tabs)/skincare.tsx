import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { RoutineStepRow, ShelfRow } from '@/components/skincare/product-row';
import { Card } from '@/components/ui/card';
import { CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { useSkincareProducts } from '@/features/skincare/hooks';
import { routineFor, type SkincareProduct } from '@/features/skincare/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { spacing, useTheme } from '@/theme';

type Section = 'morning' | 'evening' | 'shelf';

const keyExtractor = (p: SkincareProduct) => p.id;

export default function SkincareScreen() {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('skincare');
  const padding = useScreenPadding();
  const [section, setSection] = useState<Section>('morning');
  // Steps ticked off this session, keyed by routine and product so a "both" product is tracked per routine.
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const query = useSkincareProducts();
  const refreshControl = useRefreshControl({ onRefresh: () => query.refetch(), refreshing: query.isRefetching });

  const products = useMemo<SkincareProduct[]>(() => query.data ?? [], [query.data]);
  const morning = useMemo(() => routineFor(products, 'morning'), [products]);
  const evening = useMemo(() => routineFor(products, 'evening'), [products]);

  const isRoutine = section !== 'shelf';
  const list = section === 'morning' ? morning : section === 'evening' ? evening : products;

  const sections: CategorySection<Section>[] = [
    { value: 'morning', label: t('sections.morning', { n: morning.length }) },
    { value: 'evening', label: t('sections.evening', { n: evening.length }) },
    { value: 'shelf', label: t('sections.shelf', { n: products.length }) },
  ];

  const total = isRoutine ? list.length : 0;
  const doneCount = isRoutine ? list.filter((p) => completed[`${section}:${p.id}`]).length : 0;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const remaining = total - doneCount;

  const toggle = useCallback(
    (id: string) => {
      const key = `${section}:${id}`;
      setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [section],
  );

  const a = accent('skincare');
  const heroMotion = useBlockMotion();

  // Celebrate the moment a routine becomes complete (a tick that completes it), never on switching sections.
  const complete = total > 0 && remaining === 0;
  const lastRef = useRef({ section, complete });
  useEffect(() => {
    const last = lastRef.current;
    if (last.section === section && !last.complete && complete) {
      haptics.success();
      if (section === 'morning' || section === 'evening') analytics.track('skincare_routine_completed', { routine: section });
    }
    lastRef.current = { section, complete };
  }, [section, complete]);

  const offline = query.isPending && query.fetchStatus === 'paused';
  const loading = query.isPending && !offline;

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      <CategoryHeader module="skincare" sections={sections} section={section} onSectionChange={setSection} />

      {query.isError && query.data !== undefined ? <RefreshError error={query.error} onRetry={() => void query.refetch()} retrying={query.isRefetching} /> : null}

      {loading ? (
        <SkeletonCard lines={1} />
      ) : isRoutine && total > 0 ? (
        <Animated.View {...heroMotion}>
          <Card variant="tinted" accent="skincare" gradient="skincare" style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={section === 'evening' ? 'moon-outline' : 'sunny-outline'} size={20} color={a.text} accessibilityElementsHidden importantForAccessibility="no" />
              <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                {section === 'evening' ? t('hero.eveningTitle') : t('hero.morningTitle')}
              </Text>
              <Tag label={t('hero.doneCount', { done: doneCount, total })} accent="skincare" />
            </View>
            <ProgressBar percent={percent} accent="skincare" label={section === 'evening' ? t('hero.eveningProgress') : t('hero.morningProgress')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {remaining === 0 ? <SuccessCheck size={24} accessibilityLabel={null} /> : null}
              <Text variant="caption" color={remaining === 0 ? 'successText' : 'textSecondary'} accessibilityLiveRegion="polite" style={{ flex: 1 }}>
                {remaining === 0 ? t('hero.complete') : t('hero.remaining', { count: remaining })}
              </Text>
            </View>
          </Card>
        </Animated.View>
      ) : null}
    </View>
  );

  return (
    <CategoryFrame>
      <FlatList<SkincareProduct>
        data={list}
        extraData={completed}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) =>
          isRoutine ? (
            <RoutineStepRow product={item} step={index + 1} index={index} done={!!completed[`${section}:${item.id}`]} onToggle={toggle} />
          ) : (
            <ShelfRow product={item} index={index} />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={5} />
          ) : offline ? (
            <OfflineState description={t('offline')} onRetry={() => void query.refetch()} />
          ) : query.isError ? (
            <LoadError error={query.error} title={t('errors.load')} onRetry={() => void query.refetch()} retrying={query.isRefetching} />
          ) : products.length === 0 ? (
            <EmptyState
              accent="skincare"
              icon="sparkles-outline"
              title={t('empty.shelfTitle')}
              description={t('empty.shelfBody')}
              actionTitle={t('empty.refresh')}
              onAction={() => void query.refetch()}
            />
          ) : (
            <EmptyState
              accent="skincare"
              icon={section === 'evening' ? 'moon-outline' : 'sunny-outline'}
              title={section === 'evening' ? t('empty.eveningTitle') : t('empty.morningTitle')}
              description={t('empty.routineBody')}
              actionTitle={t('empty.viewShelf')}
              onAction={() => setSection('shelf')}
            />
          )
        }
        refreshControl={refreshControl}
        initialNumToRender={8}
        windowSize={7}
        contentContainerStyle={[padding, { gap: spacing.sm }]}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </CategoryFrame>
  );
}
