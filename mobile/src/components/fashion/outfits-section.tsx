import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { failureMessage } from '@/components/finance/failure-message';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDeleteOutfit, useLogOutfitWorn, useOutfits } from '@/features/fashion/hooks';
import type { FashionItem, FashionOutfit } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';
import { occasionLabel } from './labels';
import { Heading, RingCard } from './section-kit';
import { FashionImage, HeaderStack, RowSeparator, StaleNotice, useListPadding, type ItemsState } from './shared';

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
  const { t } = useTranslation('fashion');
  const motion = useListMotion(index);
  const pieces = outfit.itemIds.map((id) => itemsMap.get(id)).filter((i): i is FashionItem => !!i);
  const wears = outfit.wearCount ?? 0;

  const { accent, colors } = useTheme();
  return (
    <Animated.View {...motion}>
      <RingCard accessible={false} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            {outfit.occasion ? (
              <Text variant="overline" numberOfLines={1} style={{ color: accent('fashion').text }}>
                {occasionLabel(outfit.occasion)}
              </Text>
            ) : null}
            <Text variant="title" weight="bold" numberOfLines={2}>
              {outfit.name}
            </Text>
            {outfit.vibe ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
                <Tag label={outfit.vibe} />
              </View>
            ) : null}
          </View>
          <IconButton icon="trash-outline" variant="ghost" destructive accessibilityLabel={t('outfits.deleteA11y', { name: outfit.name })} onPress={() => onDelete(outfit)} />
        </View>

        {pieces.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {pieces.map((piece) => (
              <View key={piece.id} accessible accessibilityLabel={piece.name} style={{ width: THUMB, gap: spacing.xs }}>
                <FashionImage uri={piece.imageUrl} category={piece.category} iconSize={24} style={{ width: THUMB, height: THUMB, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }} />
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {piece.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text variant="caption" color="textSecondary">
            {t('outfits.piecesGone')}
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: layout.minTouchTarget }}>
          <Text variant="caption" weight="medium" color="textMuted" style={{ flex: 1 }}>
            {t('outfits.worn', { count: wears })}
          </Text>
          <Button
            title={t('outfits.wornToday')}
            size="sm"
            variant="secondary"
            leftIcon="checkmark-done"
            fullWidth={false}
            loading={busyWorn}
            accessibilityLabel={t('outfits.wornTodayA11y', { name: outfit.name })}
            onPress={() => onLogWorn(outfit)}
          />
        </View>
      </RingCard>
    </Animated.View>
  );
});

export function OutfitsSection({ items, state, header, onCreateOutfit }: OutfitsSectionProps) {
  const notify = useNotify();
  const { t } = useTranslation('fashion');
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
          if (res?.alreadyLogged) notify.info(t('outfits.alreadyLogged', { name: outfit.name }));
          else notify.success(t('outfits.logged', { name: outfit.name }));
        },
        onError: (err) => notify.error(failureMessage(err, t('errors.outfit'))),
      });
    },
    [logWornMutate, notify, t],
  );

  const handleDelete = useCallback(
    async (outfit: FashionOutfit) => {
      const confirmed = await notify.confirm({
        title: t('outfits.deleteTitle'),
        message: t('outfits.deleteMessage', { name: outfit.name }),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!confirmed) return;
      deleteMutate(outfit.id, {
        onSuccess: () => notify.success(t('outfits.deleted', { name: outfit.name })),
        onError: (err) => notify.error(failureMessage(err, t('errors.delete'))),
      });
    },
    [deleteMutate, notify, t],
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
  const staleError = outfitsQuery.isError && outfits ? outfitsQuery.error : null;
  const gate = loading ? (
    <View style={{ gap: spacing.md }}>
      <SkeletonCard media lines={1} />
      <SkeletonCard media lines={1} />
    </View>
  ) : failed ? (
    <LoadError error={outfitsQuery.error} title={t('errors.loadOutfits')} onRetry={() => void refetchOutfits()} retrying={outfitsQuery.isRefetching} />
  ) : offline ? (
    <OfflineState description={t('offline.outfits')} onRetry={() => void refetchOutfits()} />
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
          <StaleNotice state={state} />
          {staleError ? <RefreshError error={staleError} onRetry={() => void refetchOutfits()} retrying={outfitsQuery.isRefetching} /> : null}
          {!gate && list.length > 0 ? <Heading overline={t('outfits.overline')} title={t('outfits.listTitle')} count={list.length} subtitle={t('outfits.listHint')} /> : null}
        </HeaderStack>
      }
      ListEmptyComponent={
        gate ?? (
          <EmptyState
            icon="color-palette-outline"
            accent="fashion"
            title={t('outfits.emptyTitle')}
            description={t('outfits.emptyBody')}
            actionTitle={t('outfits.emptyAction')}
            onAction={onCreateOutfit}
          />
        )
      }
    />
  );
}
