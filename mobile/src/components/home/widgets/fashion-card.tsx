import { useRouter } from 'expo-router';
import { memo, useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { FashionTile, FASHION_TILE_WIDTH } from '@/components/fashion/fashion-card';
import { GlassCard } from '@/components/home/glass-card';
import { Section, SectionHead } from '@/components/home/section';
import { OfflineNote, StatPanel, type PanelLine } from '@/components/home/widgets/widget-parts';
import { wardrobeStats } from '@/components/home/widgets/wardrobe-stats';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { EmptyState } from '@/components/ui/empty-state';
import { isWaitingForNetwork, LoadError, RefreshError } from '@/components/ui/load-states';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFashionItems } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { layout, spacing } from '@/theme';

const NO_ITEMS: FashionItem[] = [];

/** Same blocks as the loaded card (figures panel, a strip of pieces), announced as one "Loading". */
function FashionSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={{ gap: spacing.lg }}>
      <Skeleton height={layout.minTouchTarget * 2} rounded="lg" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {[0, 1].map((i) => (
          <Skeleton key={i} width={FASHION_TILE_WIDTH} height={FASHION_TILE_WIDTH + spacing.xxl} rounded="xl" />
        ))}
      </View>
    </SkeletonGroup>
  );
}

/**
 * Fashion on Home: what the wardrobe holds (pieces, worth, wears, what waits for a wash), the most worn pieces as photo
 * tiles, and a button to add another piece. Only pieces in the wardrobe count, not the wishlist. A tile or the panel opens
 * the wardrobe. Everything is counted from the items, nothing is made up.
 */
export const FashionHomeCard = memo(function FashionHomeCard({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const query = useFashionItems();
  const { data, error, isError, isPending, isRefetching, refetch } = query;

  const items = data ?? NO_ITEMS;
  const stats = useMemo(() => wardrobeStats(items, 3), [items]);

  const offline = isWaitingForNetwork(query);
  const loading = isPending && !offline;
  const failed = isError && data === undefined;
  const refreshFailed = isError && data !== undefined;
  const empty = !isPending && !failed && stats.pieces === 0;
  const ready = !isPending && !failed && stats.pieces > 0;

  const retry = () => {
    void refetch();
  };
  const add = () => router.push('/fashion/add');
  const openWardrobe = () => router.push('/fashion');

  const worth = t('widgets.fashion.stats.worth', { value: formatMoney(stats.value, { compact: true }) });
  const wears = t('widgets.fashion.stats.wears', { count: stats.wears });
  const needsWash = t('widgets.fashion.stats.needsWash', { count: stats.needsWash });
  const lines: PanelLine[] = [
    { icon: 'pricetag-outline', text: worth, emphasis: true },
    { icon: 'repeat-outline', text: wears },
    ...(stats.needsWash > 0 ? [{ icon: 'water-outline', text: needsWash } as const] : []),
  ];
  const spoken = [t('widgets.fashion.stats.piecesSpoken', { count: stats.pieces }), worth, wears, ...(stats.needsWash > 0 ? [needsWash] : [])].join(', ');

  return (
    <Section index={index}>
      <SectionHead
        title={t('widgets.fashion.title')}
        description={t('widgets.fashion.description')}
        actionLabel={t('widgets.fashion.seeAll')}
        actionAccessibilityLabel={t('widgets.fashion.seeAllLabel')}
        onActionPress={openWardrobe}
      />
      <GlassCard padding={ready || empty ? 0 : spacing.lg} style={{ overflow: 'hidden' }}>
        {offline ? <OfflineNote message={t('widgets.fashion.offline')} retryLabel={t('offline.retry')} onRetry={retry} /> : null}
        {loading ? <FashionSkeleton label={t('widgets.fashion.loading')} /> : null}
        {failed ? <LoadError size="inline" error={error} title={t('widgets.fashion.error')} retrying={isRefetching} onRetry={retry} /> : null}
        {empty ? (
          <EmptyState
            accent="fashion"
            icon="shirt-outline"
            title={t('widgets.fashion.empty.title')}
            description={t('widgets.fashion.empty.description')}
            actionTitle={t('widgets.fashion.add')}
            onAction={add}
          />
        ) : null}
        {ready ? (
          <>
            {refreshFailed ? (
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
                <RefreshError error={error} retrying={isRefetching} onRetry={retry} />
              </View>
            ) : null}
            <View style={{ padding: spacing.lg }}>
              <StatPanel
                module="fashion"
                value={stats.pieces}
                unit={t('widgets.fashion.stats.pieces', { count: stats.pieces })}
                lines={lines}
                label={spoken}
                hint={t('widgets.fashion.openHint')}
                onPress={openWardrobe}
              />
            </View>
            {stats.mostWorn.length > 0 ? (
              <>
                <Text variant="overline" color="textMuted" accessibilityRole="header" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                  {t('widgets.fashion.mostWorn')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
                  {stats.mostWorn.map((item) => (
                    <FashionTile key={item.id} item={item} onPress={openWardrobe} />
                  ))}
                </ScrollView>
              </>
            ) : null}
            <Divider />
            <View style={{ padding: spacing.lg }}>
              <Button title={t('widgets.fashion.add')} variant="tertiary" leftIcon="add" accessibilityHint={t('widgets.fashion.addHint')} onPress={add} />
            </View>
          </>
        ) : null}
      </GlassCard>
    </Section>
  );
});
