import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { failureMessage } from '@/components/finance/failure-message';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { useUpdateItemStatus } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';
import { FashionCard } from './fashion-card';
import { Heading, RingCard } from './section-kit';
import {
  GRID_COLUMNS,
  HeaderStack,
  RowSeparator,
  SpacerCell,
  StaleNotice,
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
  // Grid cell: fade out when bought / removed, but no layout animation (two-column cells reflow instantly).
  const { t } = useTranslation('fashion');
  const motion = useListMotion();
  const exiting = 'exiting' in motion ? motion.exiting : undefined;
  return (
    <Animated.View exiting={exiting} style={{ flex: 1, gap: spacing.sm }}>
      <FashionCard item={item} onPress={onSelect} />
      <Button
        title={t('wishlist.bought')}
        variant="secondary"
        size="sm"
        leftIcon="bag-check-outline"
        loading={busy}
        accessibilityLabel={t('wishlist.boughtA11y', { name: item.name })}
        onPress={() => onBought(item)}
      />
    </Animated.View>
  );
});

export function WishlistSection({ items, state, header, onSelectItem, onAddNew }: WishlistSectionProps) {
  const notify = useNotify();
  const { t } = useTranslation('fashion');
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
              message: t('wishlist.moved', { name: item.name }),
              severity: 'success',
              action: {
                label: t('common.undo'),
                onPress: () => mutate({ id: item.id, status: 'wishlist' }, { onError: (err) => notify.error(failureMessage(err, t('errors.update'))) }),
              },
            });
          },
          onError: (err) => notify.error(failureMessage(err, t('errors.update'))),
        },
      );
    },
    [mutate, notify, t],
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
        title={t('wishlist.emptyTitle')}
        description={t('wishlist.emptyBody')}
        actionTitle={t('wishlist.emptyAction')}
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
          <StaleNotice state={state} />
          {!gate && wishlistItems.length > 0 ? (
            <RingCard accessible accessibilityLabel={`${t('wishlist.budgetA11y', { amount: formatMoney(totalBudget) })}, ${t('wishlist.itemCount', { count: wishlistItems.length })}`} style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
                <IconTile icon="wallet-outline" accent="fashion" />
                <Tag label={t('wishlist.itemCount', { count: wishlistItems.length })} accent="fashion" />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text variant="overline" color="textMuted">
                  {t('wishlist.budgetTitle')}
                </Text>
                <Text variant="display" numeric adjustsFontSizeToFit numberOfLines={1}>
                  {formatMoney(totalBudget)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {t('wishlist.budgetHint')}
                </Text>
              </View>
            </RingCard>
          ) : null}
          {!gate && wishlistItems.length > 0 ? <Heading overline={t('wishlist.overline')} title={t('wishlist.saved')} count={wishlistItems.length} /> : null}
        </HeaderStack>
      }
      ListEmptyComponent={empty}
    />
  );
}
