import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LoadError, OfflineState } from '@/components/finance/load-error';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { useBlockMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Text } from '@/components/ui/text';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { layout, spacing } from '@/theme';
import { FashionCard } from './fashion-card';
import { GRID_COLUMNS, GRID_GAP, SkeletonGrid, StaleNotice, useListPadding, type ItemsState } from './shared';

interface OverviewSectionProps {
  items: FashionItem[];
  state: ItemsState;
  header?: ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onAddNew: () => void;
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
  return (
    <>
      <SkeletonGroup label={t('loading.summary')} style={{ gap: spacing.md }}>
        <Skeleton height={layout.minTouchTarget * 2.5} rounded="lg" />
        <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
          <View style={{ flex: 1 }}>
            <Skeleton height={layout.minTouchTarget * 2} rounded="lg" />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton height={layout.minTouchTarget * 2} rounded="lg" />
          </View>
        </View>
      </SkeletonGroup>
      <SkeletonGrid rows={1} />
    </>
  );
}

export function OverviewSection({ items, state, header, onSelectItem, onAddNew, onGoToWardrobe, onGoToWishlist, onGoToLaundry }: OverviewSectionProps) {
  const { t } = useTranslation('fashion');
  const blockMotion = useBlockMotion();
  const { paddingBottom } = useListPadding();

  const wardrobeItems = useMemo(() => items.filter((i) => i.status === 'wardrobe'), [items]);
  const wishlistItems = useMemo(() => items.filter((i) => i.status === 'wishlist'), [items]);
  const laundryItems = useMemo(() => items.filter((i) => i.condition === 'needs_wash'), [items]);

  const wardrobeValuation = useMemo(() => wardrobeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0), [wardrobeItems]);
  const totalWears = useMemo(() => wardrobeItems.reduce((sum, item) => sum + (item.wearCount || 0), 0), [wardrobeItems]);
  const categoryCount = useMemo(() => new Set(wardrobeItems.map((i) => i.category)).size, [wardrobeItems]);
  const mostWornItems = useMemo(() => [...wardrobeItems].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0)).slice(0, 4), [wardrobeItems]);
  const recentItems = useMemo(() => items.slice(0, 4), [items]);

  let body: ReactNode;
  if (state.loading) {
    body = <OverviewSkeleton />;
  } else if (state.error) {
    body = <LoadError error={state.error} title={t('errors.loadItems')} onRetry={state.refetch} retrying={state.refreshing} />;
  } else if (state.offline) {
    body = <OfflineState description={t('offline.wardrobe')} onRetry={state.refetch} />;
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon="shirt-outline"
        accent="fashion"
        title={t('overview.emptyTitle')}
        description={t('overview.emptyBody')}
        actionTitle={t('overview.emptyAction')}
        onAction={onAddNew}
      />
    );
  } else {
    body = (
      <Animated.View {...blockMotion} style={{ gap: layout.sectionGap }}>
        <Card variant="tinted" accent="fashion" gradient="fashion" padding="md" style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text variant="caption" weight="semiBold" color="textSecondary" style={{ flex: 1 }}>
              {t('overview.valueTitle')}
            </Text>
            <Tag label={t('overview.itemCount', { count: wardrobeItems.length })} accent="fashion" />
          </View>
          <Text variant="display" numeric adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={t('overview.valueA11y', { amount: formatMoney(wardrobeValuation) })}>
            {formatMoney(wardrobeValuation)}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('overview.valueHint')}
          </Text>
        </Card>

        <View style={{ gap: GRID_GAP }}>
          <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
            <View style={{ flex: 1 }}>
              <StatCard label={t('overview.wardrobe')} value={wardrobeItems.length} icon="shirt-outline" accent="fashion" onPress={onGoToWardrobe} />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label={t('overview.wishlist')} value={wishlistItems.length} icon="heart-outline" accent="fashion" onPress={onGoToWishlist} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
            <View style={{ flex: 1 }}>
              <StatCard label={t('overview.totalWears')} value={totalWears} icon="sparkles-outline" accent="fashion" />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label={t('overview.categories')} value={categoryCount} icon="grid-outline" accent="fashion" />
            </View>
          </View>
        </View>

        {laundryItems.length > 0 ? (
          <Card padding="none" variant="outlined">
            <ListItem
              title={t('overview.laundry')}
              subtitle={t('overview.laundryCount', { count: laundryItems.length })}
              icon="water-outline"
              accent="fashion"
              onPress={onGoToLaundry}
              accessibilityHint={t('overview.laundryHint')}
            />
          </Card>
        ) : null}

        {mostWornItems.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title={t('overview.mostWorn')} actionLabel={t('overview.viewAll')} actionAccessibilityLabel={t('overview.viewAllA11y')} onActionPress={onGoToWardrobe} />
            <CardRows items={mostWornItems} onSelectItem={onSelectItem} />
          </View>
        ) : null}

        {recentItems.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title={t('overview.recent')} />
            <CardRows items={recentItems} onSelectItem={onSelectItem} />
          </View>
        ) : null}
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
