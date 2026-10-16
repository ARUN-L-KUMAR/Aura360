import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListItem } from '@/components/ui/list-item';
import { useBlockMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Text } from '@/components/ui/text';
import type { FashionItem } from '@/features/fashion/types';
import { formatMoney } from '@/lib/format';
import { layout, spacing } from '@/theme';
import { FashionCard } from './fashion-card';
import { GRID_COLUMNS, GRID_GAP, SkeletonGrid, useListPadding, type ItemsState } from './shared';

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
  return (
    <>
      <SkeletonGroup label="Loading wardrobe summary" style={{ gap: spacing.md }}>
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
    body = <ErrorState error={state.error} onRetry={state.refetch} retrying={state.refreshing} />;
  } else if (state.offline) {
    body = <EmptyState variant="offline" description="Connect to the internet to load your wardrobe." actionTitle="Try again" onAction={state.refetch} />;
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon="shirt-outline"
        accent="fashion"
        title="Start your wardrobe"
        description="Add the pieces you own to see their value, how often you wear them and what needs washing."
        actionTitle="Add your first item"
        onAction={onAddNew}
      />
    );
  } else {
    body = (
      <Animated.View {...blockMotion} style={{ gap: layout.sectionGap }}>
        <Card variant="tinted" accent="fashion" gradient="fashion" padding="md" style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text variant="caption" weight="semiBold" color="textSecondary" style={{ flex: 1 }}>
              Wardrobe value
            </Text>
            <Tag label={`${wardrobeItems.length} ${wardrobeItems.length === 1 ? 'item' : 'items'}`} accent="fashion" />
          </View>
          <Text variant="display" numeric adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={`Wardrobe value ${formatMoney(wardrobeValuation)}`}>
            {formatMoney(wardrobeValuation)}
          </Text>
          <Text variant="caption" color="textSecondary">
            Estimated total of the pieces you own.
          </Text>
        </Card>

        <View style={{ gap: GRID_GAP }}>
          <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
            <View style={{ flex: 1 }}>
              <StatCard label="Wardrobe" value={wardrobeItems.length} icon="shirt-outline" accent="fashion" onPress={onGoToWardrobe} />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label="Wishlist" value={wishlistItems.length} icon="heart-outline" accent="fashion" onPress={onGoToWishlist} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
            <View style={{ flex: 1 }}>
              <StatCard label="Total wears" value={totalWears} icon="sparkles-outline" accent="fashion" />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label="Categories" value={categoryCount} icon="grid-outline" accent="fashion" />
            </View>
          </View>
        </View>

        {laundryItems.length > 0 ? (
          <Card padding="none" variant="outlined">
            <ListItem
              title="Laundry"
              subtitle={`${laundryItems.length} ${laundryItems.length === 1 ? 'piece needs' : 'pieces need'} washing`}
              icon="water-outline"
              accent="fashion"
              onPress={onGoToLaundry}
              accessibilityHint="Opens the planner"
            />
          </Card>
        ) : null}

        {mostWornItems.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Most worn" actionLabel="View all" actionAccessibilityLabel="View all wardrobe items" onActionPress={onGoToWardrobe} />
            <CardRows items={mostWornItems} onSelectItem={onSelectItem} />
          </View>
        ) : null}

        {recentItems.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Recent additions" />
            <CardRows items={recentItems} onSelectItem={onSelectItem} />
          </View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Screen onRefresh={state.refetch} refreshing={state.refreshing} contentContainerStyle={{ paddingBottom }}>
      {header}
      {body}
    </Screen>
  );
}
