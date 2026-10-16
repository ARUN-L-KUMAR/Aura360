import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { useUpdateItemStatus } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { formatMoney } from '@/lib/format';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';
import { FashionCard } from './fashion-card';
import {
  GRID_COLUMNS,
  HeaderStack,
  RowSeparator,
  SpacerCell,
  gridColumnStyle,
  isSpacer,
  itemsGate,
  useListPadding,
  withSpacer,
  type GridEntry,
  type ItemsState,
} from './shared';

interface WishlistSectionProps {
  items: FashionItem[];
  state: ItemsState;
  header?: ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onAddNew: () => void;
}

const keyExtractor = (entry: GridEntry) => entry.id;

type CellProps = { item: FashionItem; busy: boolean; onSelect: (item: FashionItem) => void; onBought: (item: FashionItem) => void };

const WishlistCell = memo(function WishlistCell({ item, busy, onSelect, onBought }: CellProps) {
  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <FashionCard item={item} onPress={onSelect} />
      <Button
        title="I bought this"
        variant="secondary"
        size="sm"
        leftIcon="bag-check-outline"
        loading={busy}
        accessibilityLabel={`I bought ${item.name}`}
        onPress={() => onBought(item)}
      />
    </View>
  );
});

export function WishlistSection({ items, state, header, onSelectItem, onAddNew }: WishlistSectionProps) {
  const notify = useNotify();
  const padding = useListPadding();
  const refreshControl = useRefreshControl({ onRefresh: state.refetch, refreshing: state.refreshing });
  const updateStatus = useUpdateItemStatus();
  const { mutate } = updateStatus;
  const busyId = updateStatus.isPending ? updateStatus.variables?.id : undefined;

  const wishlistItems = useMemo(() => items.filter((i) => i.status === 'wishlist'), [items]);
  const entries = useMemo(() => withSpacer(wishlistItems), [wishlistItems]);

  const totalBudget = useMemo(
    () => wishlistItems.reduce((sum, item) => sum + (Number(item.price) || Number(item.metadata?.expectedBudget) || 0), 0),
    [wishlistItems],
  );

  const handleBought = useCallback(
    (item: FashionItem) => {
      mutate(
        { id: item.id, status: 'wardrobe' },
        {
          onSuccess: () => {
            notify.toast({
              message: `"${item.name}" moved to your wardrobe`,
              severity: 'success',
              action: { label: 'Undo', onPress: () => mutate({ id: item.id, status: 'wishlist' }) },
            });
          },
          onError: (err) => notify.error(err),
        },
      );
    },
    [mutate, notify],
  );

  const gate = itemsGate(state);

  const renderItem = useCallback(
    ({ item }: { item: GridEntry }) =>
      isSpacer(item) ? <SpacerCell /> : <WishlistCell item={item} busy={busyId === item.id} onSelect={onSelectItem} onBought={handleBought} />,
    [busyId, onSelectItem, handleBought],
  );

  const empty =
    gate ?? (
      <EmptyState
        icon="heart-outline"
        accent="fashion"
        title="Your wishlist is empty"
        description="Save pieces you plan to buy. Add a price and a store link to keep track of them."
        actionTitle="Add to wishlist"
        onAction={onAddNew}
      />
    );

  return (
    <FlatList
      data={gate ? [] : entries}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={gridColumnStyle}
      ItemSeparatorComponent={RowSeparator}
      contentContainerStyle={padding}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={7}
      ListHeaderComponent={
        <HeaderStack>
          {header}
          {!gate && wishlistItems.length > 0 ? (
            <Card variant="tinted" accent="fashion" style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text variant="caption" weight="semiBold" color="textSecondary" style={{ flex: 1 }}>
                  Wishlist budget
                </Text>
                <Tag label={`${wishlistItems.length} ${wishlistItems.length === 1 ? 'item' : 'items'}`} accent="fashion" />
              </View>
              <Text variant="display" numeric adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={`Wishlist budget ${formatMoney(totalBudget)}`}>
                {formatMoney(totalBudget)}
              </Text>
              <Text variant="caption" color="textSecondary">
                Estimated cost to buy everything you have saved.
              </Text>
            </Card>
          ) : null}
          {!gate && wishlistItems.length > 0 ? <SectionHeader title="Saved pieces" count={wishlistItems.length} /> : null}
        </HeaderStack>
      }
      ListEmptyComponent={empty}
    />
  );
}
