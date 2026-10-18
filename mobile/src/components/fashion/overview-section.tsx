import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LoadError, OfflineState } from '@/components/finance/load-error';
import { Card } from '@/components/ui/card';
import { useBlockMotion } from '@/components/ui/motion';
import { PremiumHero } from '@/components/ui/premium-hero';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import type { FashionItem } from '@/features/fashion/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { formatMoney } from '@/lib/format';
import { layout, radius, spacing, useTheme } from '@/theme';
import { FashionCard } from './fashion-card';
import { Heading, HeroChip, LinkAction, MetricCard, MetricCell, MetricGrid } from './section-kit';
import { GRID_COLUMNS, GRID_GAP, SkeletonGrid, StaleNotice, useListPadding, type ItemsState } from './shared';

interface OverviewSectionProps {
  items: FashionItem[];
  state: ItemsState;
  header?: ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onAddNew: () => void;
  onPlanOutfit: () => void;
  onGoToWardrobe: () => void;
  onGoToWishlist: () => void;
  onGoToLaundry: () => void;
}

/** A short, fixed set of cards in rows of two (the full lists live in the Wardrobe and Wishlist sections). */
function CardRows({ items, onSelectItem }: { items: FashionItem[]; onSelectItem: (item: FashionItem) => void }) {
  const rows: FashionItem[][] = [];
  for (let i = 0; i < items.length; i += GRID_COLUMNS) rows.push(items.slice(i, i + GRID_COLUMNS));
  return (
    <View style={{ gap: GRID_GAP }}>
      {rows.map((row) => (
        <View key={row[0].id} style={{ flexDirection: 'row', gap: GRID_GAP }}>
          {row.map((item) => (
            <FashionCard key={item.id} item={item} onPress={onSelectItem} />
          ))}
          {row.length < GRID_COLUMNS ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function OverviewSkeleton() {
  const { t } = useTranslation('fashion');
  const { colors } = useTheme();
  return (
    <>
      <SkeletonGroup label={t('loading.summary')} style={{ gap: spacing.md }}>
        <View style={{ height: layout.minTouchTarget * 4, borderRadius: radius.xl, backgroundColor: colors.heroSurface }} />
        <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
          <View style={{ flex: 1 }}>
            <Skeleton height={layout.minTouchTarget * 2.5} rounded="xl" />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton height={layout.minTouchTarget * 2.5} rounded="xl" />
          </View>
        </View>
      </SkeletonGroup>
      <SkeletonGrid rows={1} />
    </>
  );
}

export function OverviewSection({ items, state, header, onSelectItem, onAddNew, onPlanOutfit, onGoToWardrobe, onGoToWishlist, onGoToLaundry }: OverviewSectionProps) {
  const { t } = useTranslation('fashion');
  const { colors, accent } = useTheme();
  const blockMotion = useBlockMotion();
  const { paddingBottom } = useListPadding();

  const wardrobeItems = useMemo(() => items.filter((i) => i.status === 'wardrobe'), [items]);
  const wishlistItems = useMemo(() => items.filter((i) => i.status === 'wishlist'), [items]);
  const laundryItems = useMemo(() => items.filter((i) => i.condition === 'needs_wash'), [items]);

  const wardrobeValuation = useMemo(() => wardrobeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0), [wardrobeItems]);
  const totalWears = useMemo(() => wardrobeItems.reduce((sum, item) => sum + (item.wearCount || 0), 0), [wardrobeItems]);
  const categoryCount = useMemo(() => new Set(wardrobeItems.map((i) => i.category)).size, [wardrobeItems]);
  // Cost per wear only counts pieces that have been worn, so a brand new piece does not skew it.
  const wornCost = useMemo(() => wardrobeItems.reduce((sum, item) => sum + ((item.wearCount || 0) > 0 ? Number(item.price) || 0 : 0), 0), [wardrobeItems]);
  const costPerWear = totalWears > 0 && wornCost > 0 ? wornCost / totalWears : null;
  const wearsPerPiece = wardrobeItems.length > 0 ? totalWears / wardrobeItems.length : 0;
  const wishlistBudget = useMemo(
    () => wishlistItems.reduce((sum, item) => sum + (Number(item.price) || Number(item.metadata?.expectedBudget) || 0), 0),
    [wishlistItems],
  );
  const mostWornItems = useMemo(
    () =>
      wardrobeItems
        .filter((i) => (i.wearCount || 0) > 0)
        .sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))
        .slice(0, 4),
    [wardrobeItems],
  );
  const recentItems = useMemo(() => items.slice(0, 4), [items]);

  const wardrobeCount = wardrobeItems.length;
  const empty = items.length === 0;

  let body: ReactNode;
  if (state.loading) {
    body = <OverviewSkeleton />;
  } else if (state.error) {
    body = <LoadError error={state.error} title={t('errors.loadItems')} onRetry={state.refetch} retrying={state.refreshing} />;
  } else if (state.offline) {
    body = <OfflineState description={t('offline.wardrobe')} onRetry={state.refetch} />;
  } else {
    body = (
      <Animated.View {...blockMotion} style={{ gap: layout.sectionGap }}>
        <PremiumHero
          chip={{ icon: 'shirt', label: t('overview.heroChip') }}
          title={empty ? t('overview.emptyTitle') : formatMoney(wardrobeValuation)}
          subtitle={empty ? t('overview.emptyBody') : wardrobeCount > 0 ? t('overview.heroSubtitle', { count: wardrobeCount }) : t('overview.heroNoPieces')}
          actions={[
            { label: empty ? t('overview.emptyAction') : t('overview.addItem'), icon: 'add', variant: 'solid', onPress: onAddNew },
            ...(empty ? [] : [{ label: t('overview.planOutfit'), icon: 'sparkles-outline' as const, variant: 'glass' as const, onPress: onPlanOutfit }]),
          ]}>
          {empty ? null : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <HeroChip icon="shirt-outline" value={wardrobeCount} label={t('overview.chipItems')} spoken={t('overview.spokenItems', { count: wardrobeCount })} />
              <HeroChip icon="heart-outline" value={wishlistItems.length} label={t('overview.chipWishlist')} spoken={t('overview.spokenWishlist', { count: wishlistItems.length })} />
              <HeroChip icon="sparkles-outline" value={totalWears} label={t('overview.chipWears')} spoken={t('overview.spokenWears', { count: totalWears })} />
            </View>
          )}
        </PremiumHero>

        {empty ? null : (
          <>
            <View style={{ gap: spacing.md }}>
              <Heading overline={t('overview.statsOverline')} title={t('overview.statsTitle')} subtitle={t('overview.statsSubtitle')} />
              <MetricGrid>
                <MetricCell>
                  <MetricCard label={t('overview.categories')} icon="grid-outline" value={categoryCount} />
                </MetricCell>
                {wishlistItems.length > 0 ? (
                  <MetricCell>
                    <MetricCard
                      label={t('overview.wishlistBudget')}
                      icon="wallet-outline"
                      value={wishlistBudget}
                      format={(n) => formatMoney(Math.round(n))}
                      caption={t('overview.wishlistBudgetHint')}
                      onPress={onGoToWishlist}
                    />
                  </MetricCell>
                ) : null}
                {costPerWear !== null ? (
                  <MetricCell>
                    <MetricCard label={t('overview.costPerWear')} icon="pricetag-outline" value={costPerWear} format={(n) => formatMoney(Math.round(n))} caption={t('overview.costPerWearHint')} />
                  </MetricCell>
                ) : null}
                {totalWears > 0 ? (
                  <MetricCell>
                    <MetricCard
                      label={t('overview.wearsPerPiece')}
                      icon="repeat-outline"
                      value={wearsPerPiece}
                      format={(n) => (Math.round(n * 10) / 10).toLocaleString(getDeviceLocale())}
                      caption={t('overview.wearsPerPieceHint')}
                    />
                  </MetricCell>
                ) : null}
              </MetricGrid>
            </View>

            {laundryItems.length > 0 ? (
              <Card
                rounded="xl"
                padding="md"
                onPress={onGoToLaundry}
                accessibilityLabel={`${t('overview.laundry')}: ${t('overview.laundryCount', { count: laundryItems.length })}`}
                accessibilityHint={t('overview.laundryHint')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconTile icon="water-outline" accent="fashion" />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="overline" style={{ color: accent('fashion').text }}>
                    {t('overview.careOverline')}
                  </Text>
                  <Text variant="label" weight="bold">
                    {t('overview.laundryCount', { count: laundryItems.length })}
                  </Text>
                </View>
                <Ionicons name={directional('chevron-forward', 'chevron-back')} size={20} color={colors.textMuted} />
              </Card>
            ) : null}

            {mostWornItems.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <Heading
                  overline={t('overview.rotationOverline')}
                  title={t('overview.mostWorn')}
                  trailing={<LinkAction label={t('overview.viewAll')} accessibilityLabel={t('overview.viewAllA11y')} onPress={onGoToWardrobe} />}
                />
                <CardRows items={mostWornItems} onSelectItem={onSelectItem} />
              </View>
            ) : null}

            {recentItems.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <Heading overline={t('overview.recentOverline')} title={t('overview.recent')} />
                <CardRows items={recentItems} onSelectItem={onSelectItem} />
              </View>
            ) : null}
          </>
        )}
      </Animated.View>
    );
  }

  return (
    <Screen onRefresh={state.refetch} refreshing={state.refreshing} contentContainerStyle={{ paddingBottom }}>
      {header}
      <StaleNotice state={state} />
      {body}
    </Screen>
  );
}
