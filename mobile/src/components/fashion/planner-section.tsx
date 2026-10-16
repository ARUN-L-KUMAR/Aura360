import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow, Tag } from '@/components/ui/chip';
import { Divider } from '@/components/ui/divider';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { useSaveFashionItem } from '@/features/fashion/hooks';
import { SEASONS, type FashionItem } from '@/features/fashion/types';
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

interface PlannerSectionProps {
  items: FashionItem[];
  state: ItemsState;
  header?: ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onAddNew: () => void;
}

const keyExtractor = (entry: GridEntry) => entry.id;

type LaundryRowProps = { item: FashionItem; first: boolean; busy: boolean; onMarkClean: (item: FashionItem) => void };

/** One piece waiting to be washed. Leaves with a fade and the rows below close the gap when it is marked clean. */
const LaundryRow = memo(function LaundryRow({ item, first, busy, onMarkClean }: LaundryRowProps) {
  const motion = useListMotion();
  return (
    <Animated.View {...motion}>
      {!first ? <Divider /> : null}
      <ListItem
        title={item.name}
        subtitle={`${item.category} · ${item.color || 'No colour'}`}
        icon="water-outline"
        accent="fashion"
        accessible={false}
        trailing={
          <Button
            title="Mark clean"
            size="sm"
            variant="secondary"
            leftIcon="checkmark"
            fullWidth={false}
            loading={busy}
            accessibilityLabel={`Mark ${item.name} as clean`}
            onPress={() => onMarkClean(item)}
          />
        }
      />
    </Animated.View>
  );
});

export function PlannerSection({ items, state, header, onSelectItem, onAddNew }: PlannerSectionProps) {
  const notify = useNotify();
  const padding = useListPadding();
  const refreshControl = useRefreshControl({ onRefresh: state.refetch, refreshing: state.refreshing });
  const [activeSeason, setActiveSeason] = useState<string>('All');
  const saveItem = useSaveFashionItem();
  const { mutate } = saveItem;
  const busyId = saveItem.isPending ? saveItem.variables?.id : undefined;

  const wardrobeItems = useMemo(() => items.filter((i) => i.status === 'wardrobe'), [items]);
  const laundryItems = useMemo(() => items.filter((i) => i.condition === 'needs_wash'), [items]);

  const seasonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const season of SEASONS) {
      const key = season.toLowerCase();
      counts.set(season, season === 'All' ? wardrobeItems.length : wardrobeItems.filter((i) => (i.season || []).some((s) => s.toLowerCase() === key)).length);
    }
    return counts;
  }, [wardrobeItems]);

  const filteredSeasonal = useMemo(() => {
    if (activeSeason === 'All') return wardrobeItems;
    return wardrobeItems.filter((i) => (i.season || []).map((s) => s.toLowerCase()).includes(activeSeason.toLowerCase()));
  }, [wardrobeItems, activeSeason]);

  const entries = useMemo(() => withSpacer(filteredSeasonal), [filteredSeasonal]);

  const handleMarkClean = useCallback(
    (item: FashionItem) => {
      mutate(
        { id: item.id, condition: 'good' },
        {
          onSuccess: () => {
            notify.toast({
              message: `"${item.name}" is clean and ready to wear`,
              severity: 'success',
              action: { label: 'Undo', onPress: () => mutate({ id: item.id, condition: 'needs_wash' }) },
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
    ({ item }: { item: GridEntry }) => (isSpacer(item) ? <SpacerCell /> : <FashionCard item={item} onPress={onSelectItem} />),
    [onSelectItem],
  );

  const empty =
    gate ??
    (wardrobeItems.length === 0 ? (
      <EmptyState
        icon="calendar-outline"
        accent="fashion"
        title="Nothing to plan yet"
        description="Add pieces to your wardrobe, tag them by season and they will show up here."
        actionTitle="Add an item"
        onAction={onAddNew}
      />
    ) : (
      <EmptyState
        variant="noResults"
        accent="fashion"
        title={`Nothing tagged for ${activeSeason.toLowerCase()}`}
        description="Edit your items to give them seasonal tags."
        onClearFilters={() => setActiveSeason('All')}
        clearFiltersLabel="Show all seasons"
      />
    ));

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

          {!gate ? (
            <Card variant="outlined" padding="sm" style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                  Laundry
                </Text>
                <Tag
                  label={laundryItems.length === 0 ? 'All clean' : `${laundryItems.length} to wash`}
                  icon={laundryItems.length === 0 ? 'checkmark-circle' : 'water-outline'}
                  accent="fashion"
                />
              </View>

              {laundryItems.length === 0 ? (
                <Text variant="body" color="textSecondary">
                  Everything is clean and ready to wear.
                </Text>
              ) : (
                <View>
                  {laundryItems.map((item, index) => (
                    <LaundryRow key={item.id} item={item} first={index === 0} busy={busyId === item.id} onMarkClean={handleMarkClean} />
                  ))}
                </View>
              )}
            </Card>
          ) : null}

          {!gate && wardrobeItems.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              <SectionHeader title="Seasonal capsules" subtitle="Filter your wardrobe by the season each piece is tagged for." />
              <ChipRow>
                {SEASONS.map((season) => (
                  <Chip key={season} label={season} accent="fashion" selected={activeSeason === season} count={seasonCounts.get(season) ?? 0} onPress={() => setActiveSeason(season)} />
                ))}
              </ChipRow>
            </View>
          ) : null}
        </HeaderStack>
      }
      ListEmptyComponent={empty}
    />
  );
}
