import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDeleteOutfit, useLogOutfitWorn, useOutfits } from '@/features/fashion/hooks';
import type { FashionItem, FashionOutfit } from '@/features/fashion/types';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing } from '@/theme';
import { FashionImage, HeaderStack, RowSeparator, useListPadding, type ItemsState } from './shared';

interface OutfitsSectionProps {
  items: FashionItem[];
  state: ItemsState;
  header?: ReactNode;
  onCreateOutfit: () => void;
}

/** Collage thumbnail edge: 88pt. */
const THUMB = spacing.xxxl + spacing.xl + spacing.lg;

const keyExtractor = (outfit: FashionOutfit) => outfit.id;

type CardProps = {
  outfit: FashionOutfit;
  itemsMap: Map<string, FashionItem>;
  index: number;
  busyWorn: boolean;
  onLogWorn: (outfit: FashionOutfit) => void;
  onDelete: (outfit: FashionOutfit) => void;
};

const OutfitCard = memo(function OutfitCard({ outfit, itemsMap, index, busyWorn, onLogWorn, onDelete }: CardProps) {
  const motion = useListMotion(index);
  const pieces = outfit.itemIds.map((id) => itemsMap.get(id)).filter((i): i is FashionItem => !!i);
  const wears = outfit.wearCount ?? 0;

  return (
    <Animated.View {...motion}>
      <Card accessible={false} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text variant="title" numberOfLines={2}>
              {outfit.name}
            </Text>
            {outfit.occasion || outfit.vibe ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {outfit.occasion ? <Tag label={outfit.occasion} accent="fashion" /> : null}
                {outfit.vibe ? <Tag label={outfit.vibe} /> : null}
              </View>
            ) : null}
          </View>
          <IconButton icon="trash-outline" variant="ghost" destructive accessibilityLabel={`Delete outfit ${outfit.name}`} onPress={() => onDelete(outfit)} />
        </View>

        {pieces.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {pieces.map((piece) => (
              <View key={piece.id} accessible accessibilityLabel={piece.name} style={{ width: THUMB, gap: spacing.xs }}>
                <FashionImage uri={piece.imageUrl} iconSize={24} style={{ width: THUMB, height: THUMB, borderRadius: radius.md }} />
                <Text variant="caption" numberOfLines={1} style={{ textAlign: 'center' }}>
                  {piece.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text variant="caption" color="textSecondary">
            The pieces in this look are not available right now.
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: layout.minTouchTarget }}>
          <Text variant="caption" weight="medium" color="textSecondary" style={{ flex: 1 }}>
            Worn {wears} {wears === 1 ? 'time' : 'times'}
          </Text>
          <Button
            title="Worn today"
            size="sm"
            variant="secondary"
            leftIcon="checkmark-done"
            fullWidth={false}
            loading={busyWorn}
            accessibilityLabel={`Log ${outfit.name} as worn today`}
            onPress={() => onLogWorn(outfit)}
          />
        </View>
      </Card>
    </Animated.View>
  );
});

export function OutfitsSection({ items, state, header, onCreateOutfit }: OutfitsSectionProps) {
  const notify = useNotify();
  const padding = useListPadding();
  const outfitsQuery = useOutfits();
  const { data: outfits, refetch: refetchOutfits } = outfitsQuery;
  const logWorn = useLogOutfitWorn();
  const deleteOutfit = useDeleteOutfit();
  const { mutate: logWornMutate } = logWorn;
  const { mutate: deleteMutate } = deleteOutfit;
  const busyWornId = logWorn.isPending ? logWorn.variables : undefined;

  const refresh = useCallback(() => {
    void refetchOutfits();
    state.refetch();
  }, [refetchOutfits, state]);
  const refreshControl = useRefreshControl({ onRefresh: refresh, refreshing: outfitsQuery.isRefetching || state.refreshing });

  const itemsMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const handleLogWorn = useCallback(
    (outfit: FashionOutfit) => {
      logWornMutate(outfit.id, {
        onSuccess: (res) => {
          if (res?.alreadyLogged) notify.info(`"${outfit.name}" is already logged for today`);
          else notify.success(`Logged "${outfit.name}" as worn today`);
        },
        onError: (err) => notify.error(err),
      });
    },
    [logWornMutate, notify],
  );

  const handleDelete = useCallback(
    async (outfit: FashionOutfit) => {
      const confirmed = await notify.confirm({
        title: 'Delete this outfit?',
        message: `"${outfit.name}" will be removed. Your clothing items stay in your wardrobe.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!confirmed) return;
      deleteMutate(outfit.id, {
        onSuccess: () => notify.success(`Deleted "${outfit.name}"`),
        onError: (err) => notify.error(err),
      });
    },
    [deleteMutate, notify],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FashionOutfit; index: number }) => (
      <OutfitCard outfit={item} itemsMap={itemsMap} index={index} busyWorn={busyWornId === item.id} onLogWorn={handleLogWorn} onDelete={handleDelete} />
    ),
    [itemsMap, busyWornId, handleLogWorn, handleDelete],
  );

  const loading = outfitsQuery.isPending && outfitsQuery.fetchStatus !== 'paused';
  const offline = outfitsQuery.isPending && outfitsQuery.fetchStatus === 'paused';
  const failed = outfitsQuery.isError && !outfits;
  const gate = loading ? (
    <View style={{ gap: spacing.md }}>
      <SkeletonCard media lines={1} />
      <SkeletonCard media lines={1} />
    </View>
  ) : failed ? (
    <ErrorState error={outfitsQuery.error} onRetry={() => void refetchOutfits()} retrying={outfitsQuery.isRefetching} />
  ) : offline ? (
    <EmptyState variant="offline" description="Connect to the internet to load your outfits." actionTitle="Try again" onAction={() => void refetchOutfits()} />
  ) : null;

  const list = outfits ?? [];

  return (
    <FlatList
      data={gate ? [] : list}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={RowSeparator}
      contentContainerStyle={padding}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      initialNumToRender={5}
      windowSize={7}
      ListHeaderComponent={
        <HeaderStack>
          {header}
          {!gate && list.length > 0 ? <SectionHeader title="Your outfits" count={list.length} subtitle="Complete looks you have put together." /> : null}
        </HeaderStack>
      }
      ListEmptyComponent={
        gate ?? (
          <EmptyState
            icon="color-palette-outline"
            accent="fashion"
            title="No outfits yet"
            description="Combine tops, bottoms, shoes and outerwear into a complete look, then log it when you wear it."
            actionTitle="Create your first look"
            onAction={onCreateOutfit}
          />
        )
      }
    />
  );
}
