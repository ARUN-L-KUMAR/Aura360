import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { RoutineStepRow, ShelfRow } from '@/components/skincare/product-row';
import { Card } from '@/components/ui/card';
import { CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useBlockMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { useSkincareProducts } from '@/features/skincare/hooks';
import { routineFor, type SkincareProduct } from '@/features/skincare/types';
import { haptics } from '@/lib/haptics';
import { spacing, useTheme } from '@/theme';

type Section = 'morning' | 'evening' | 'shelf';

export default function SkincareScreen() {
  const { colors, accent } = useTheme();
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
    { value: 'morning', label: `Morning (${morning.length})` },
    { value: 'evening', label: `Evening (${evening.length})` },
    { value: 'shelf', label: `Shelf (${products.length})` },
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
    if (last.section === section && !last.complete && complete) haptics.success();
    lastRef.current = { section, complete };
  }, [section, complete]);

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      <CategoryHeader module="skincare" sections={sections} section={section} onSectionChange={setSection} />

      {query.isPending ? (
        <SkeletonCard lines={1} />
      ) : isRoutine && total > 0 ? (
        <Animated.View {...heroMotion}>
          <Card variant="tinted" accent="skincare" gradient="skincare" style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={section === 'evening' ? 'moon-outline' : 'sunny-outline'} size={20} color={a.text} accessibilityElementsHidden importantForAccessibility="no" />
              <Text variant="title" style={{ flex: 1 }}>
                {section === 'evening' ? 'Evening routine' : 'Morning routine'}
              </Text>
              <Tag label={`${doneCount} of ${total} done`} accent="skincare" />
            </View>
            <ProgressBar percent={percent} accent="skincare" label={`${section === 'evening' ? 'Evening' : 'Morning'} routine progress`} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {remaining === 0 ? <SuccessCheck size={24} accessibilityLabel={null} /> : null}
              <Text variant="caption" color={remaining === 0 ? 'successText' : 'textSecondary'} accessibilityLiveRegion="polite">
                {remaining === 0 ? 'Routine complete. Nice work.' : `${remaining} ${remaining === 1 ? 'step' : 'steps'} to go`}
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
        keyExtractor={(p) => p.id}
        renderItem={({ item, index }) =>
          isRoutine ? (
            <RoutineStepRow product={item} step={index + 1} index={index} done={!!completed[`${section}:${item.id}`]} onToggle={toggle} />
          ) : (
            <ShelfRow product={item} index={index} />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          query.isPending ? (
            <SkeletonList count={5} />
          ) : query.isError ? (
            <ErrorState error={query.error} title="Couldn't load your products" onRetry={() => query.refetch()} retrying={query.isRefetching} />
          ) : products.length === 0 ? (
            <EmptyState
              accent="skincare"
              icon="sparkles-outline"
              title="Your shelf is empty"
              description="Add cleansers, serums, moisturisers or SPF on the Aura360 web app and they will show up here."
              actionTitle="Refresh"
              onAction={() => query.refetch()}
            />
          ) : (
            <EmptyState
              accent="skincare"
              icon={section === 'evening' ? 'moon-outline' : 'sunny-outline'}
              title={`No ${section} steps yet`}
              description="Products set to this routine appear here, in the order you chose."
              actionTitle="View shelf"
              onAction={() => setSection('shelf')}
            />
          )
        }
        refreshControl={refreshControl}
        contentContainerStyle={[padding, { gap: spacing.sm }]}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </CategoryFrame>
  );
}
