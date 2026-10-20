import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { GlassCard } from '@/components/home/glass-card';
import { Section, SectionHead } from '@/components/home/section';
import { pickRoutine, previewOf, routinePartAt, type RoutinePart } from '@/components/home/widgets/skincare-logic';
import { OfflineNote, StatPanel, TILE } from '@/components/home/widgets/widget-parts';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { isWaitingForNetwork, LoadError, RefreshError } from '@/components/ui/load-states';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { useSkincareProducts } from '@/features/skincare/hooks';
import { routineFor, skincareStats, type SkincareProduct } from '@/features/skincare/types';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

/** How many routine steps the card lists before "+N more". */
const STEP_COUNT = 3;

const PART_ICON = { morning: 'sunny-outline', evening: 'moon-outline' } as const satisfies Record<RoutinePart, string>;

/** Category and brand on one line, the way the shelf shows them. */
const detailOf = (product: SkincareProduct) => [product.category, product.brand].filter(Boolean).join(' · ');

/** The hour of day, read again each time Home comes into view so the right routine shows after a morning or an evening away. */
function useHourOnFocus() {
  const [hour, setHour] = useState(() => new Date().getHours());
  useFocusEffect(
    useCallback(() => {
      setHour(new Date().getHours());
    }, []),
  );
  return hour;
}

/** The step's position in a circle, the same mark as on the routine list (here it is not a checkbox). */
function StepNumber({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: TILE,
        height: TILE,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardMuted,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}>
      <Text variant="label" weight="semiBold" numeric>
        {step}
      </Text>
    </View>
  );
}

/** Same blocks as the loaded card (routine header, three steps, shelf panel), announced as one "Loading". */
function SkincareSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Skeleton width={TILE} height={TILE} rounded="md" />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton shape="line" width="55%" />
          <Skeleton shape="line" width="25%" height={spacing.md} />
        </View>
      </View>
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Skeleton shape="circle" size={TILE} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton shape="line" width="70%" />
            <Skeleton shape="line" width="40%" height={spacing.md} />
          </View>
        </View>
      ))}
      <Skeleton height={layout.minTouchTarget * 2} rounded="lg" />
    </SkeletonGroup>
  );
}

/**
 * Skincare on Home: the routine that is next (morning until noon, evening after), its first steps, and a panel for the
 * shelf with what is left to buy and what is finished. The button opens that routine; the panel opens the shelf. When
 * only one routine has steps that one is shown at any hour. Everything comes from the products, nothing is made up.
 */
export const SkincareHomeCard = memo(function SkincareHomeCard({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const { t: tk } = useTranslation('skincare');
  const router = useRouter();
  const hour = useHourOnFocus();
  const query = useSkincareProducts();
  const { data, error, isError, isPending, isRefetching, refetch } = query;

  const products = useMemo<SkincareProduct[]>(() => data ?? [], [data]);
  const stats = useMemo(() => skincareStats(products), [products]);
  const pick = useMemo(() => pickRoutine(routineFor(products, 'morning'), routineFor(products, 'evening'), routinePartAt(hour)), [products, hour]);
  const steps = useMemo(() => (pick ? previewOf(pick.steps, STEP_COUNT) : null), [pick]);

  const offline = isWaitingForNetwork(query);
  const loading = isPending && !offline;
  const failed = isError && data === undefined;
  const refreshFailed = isError && data !== undefined;
  const empty = !isPending && !failed && products.length === 0;
  const ready = !isPending && !failed && products.length > 0;

  const retry = () => {
    void refetch();
  };
  const openRoutine = (part: RoutinePart) => router.push({ pathname: '/skincare', params: { section: part } });
  const openShelf = () => router.push({ pathname: '/skincare', params: { section: 'shelf' } });

  const part = pick?.part ?? routinePartAt(hour);
  const toBuy = t('widgets.skincare.shelf.toBuy', { count: stats.needToBuy });
  const finished = t('widgets.skincare.shelf.finished', { count: stats.finished });
  const shelfSpoken = t('widgets.skincare.shelf.spoken', {
    products: t('widgets.skincare.shelf.productsSpoken', { count: stats.total }),
    toBuy,
    finished,
  });

  return (
    <Section index={index}>
      <SectionHead
        title={t('widgets.skincare.title')}
        description={t('widgets.skincare.description')}
        actionLabel={t('widgets.skincare.seeAll')}
        actionAccessibilityLabel={t('widgets.skincare.seeAllLabel')}
        onActionPress={() => router.push('/skincare')}
      />
      <GlassCard padding={ready || empty ? 0 : spacing.lg} style={{ overflow: 'hidden' }}>
        {offline ? <OfflineNote message={t('widgets.skincare.offline')} retryLabel={t('offline.retry')} onRetry={retry} /> : null}
        {loading ? <SkincareSkeleton label={t('widgets.skincare.loading')} /> : null}
        {failed ? <LoadError size="inline" error={error} title={t('widgets.skincare.error')} retrying={isRefetching} onRetry={retry} /> : null}
        {empty ? (
          <EmptyState
            accent="skincare"
            icon="flask-outline"
            title={t('widgets.skincare.empty.title')}
            description={t('widgets.skincare.empty.description')}
            actionTitle={t('widgets.skincare.empty.action')}
            onAction={retry}
          />
        ) : null}
        {ready ? (
          <>
            {refreshFailed ? (
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
                <RefreshError error={error} retrying={isRefetching} onRetry={retry} />
              </View>
            ) : null}

            <View
              accessible
              accessibilityLabel={pick ? `${t(`widgets.skincare.routine.${part}`)}, ${t('widgets.skincare.routine.steps', { count: pick.steps.length })}` : t('widgets.skincare.routine.none')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, paddingBottom: pick ? spacing.sm : spacing.lg }}>
              <IconTile icon={PART_ICON[part]} accent="skincare" size={TILE} />
              {pick ? (
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label" weight="bold" numberOfLines={1}>
                    {t(`widgets.skincare.routine.${part}`)}
                  </Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {t('widgets.skincare.routine.steps', { count: pick.steps.length })}
                  </Text>
                </View>
              ) : (
                <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
                  {t('widgets.skincare.routine.none')}
                </Text>
              )}
            </View>

            {pick && steps
              ? steps.shown.map((product, i) => {
                  const detail = detailOf(product);
                  return (
                    <ListItem
                      key={product.id}
                      leading={<StepNumber step={i + 1} />}
                      title={product.productName}
                      titleLines={2}
                      subtitle={detail || undefined}
                      chevron={false}
                      divider={i < steps.shown.length - 1}
                      onPress={() => openRoutine(pick.part)}
                      accessibilityLabel={detail ? tk('product.stepLabelDetail', { step: i + 1, name: product.productName, detail }) : tk('product.stepLabel', { step: i + 1, name: product.productName })}
                      accessibilityHint={t('widgets.skincare.routine.stepHint')}
                    />
                  );
                })
              : null}
            {steps && steps.more > 0 ? (
              <Text variant="caption" color="textMuted" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                {t('widgets.skincare.routine.more', { count: steps.more })}
              </Text>
            ) : null}

            <View style={{ padding: spacing.lg }}>
              <StatPanel
                module="skincare"
                value={stats.total}
                unit={t('widgets.skincare.shelf.products', { count: stats.total })}
                lines={[
                  { icon: 'cart-outline', text: toBuy, emphasis: stats.needToBuy > 0 },
                  { icon: 'checkmark-done-outline', text: finished },
                ]}
                label={shelfSpoken}
                hint={t('widgets.skincare.shelf.hint')}
                onPress={openShelf}
              />
            </View>

            {pick ? (
              <>
                <Divider />
                <View style={{ padding: spacing.lg }}>
                  <Button
                    title={pick.other ? t(`widgets.skincare.cta.open.${pick.part}`) : t(`widgets.skincare.cta.start.${pick.part}`)}
                    variant="tertiary"
                    leftIcon={PART_ICON[pick.part]}
                    accessibilityHint={t(`widgets.skincare.cta.hint.${pick.part}`)}
                    onPress={() => openRoutine(pick.part)}
                  />
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </GlassCard>
    </Section>
  );
});
