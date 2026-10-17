import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { failureMessage } from '@/components/finance/failure-message';
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
import { useTranslation } from '@/i18n';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';
import { FashionCard } from './fashion-card';
import { categoryLabel, seasonLabel } from './labels';
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
  const { t } = useTranslation('fashion');
  const motion = useListMotion();
  return (
    <Animated.View {...motion}>
      {!first ? <Divider /> : null}
      <ListItem
        title={item.name}
        subtitle={t('planner.itemSubtitle', { category: categoryLabel(item.category), colour: item.color || t('planner.noColour') })}
        icon="water-outline"
        accent="fashion"
        accessible={false}
        trailing={
          <Button
            title={t('planner.markClean')}
            size="sm"
            variant="secondary"
            leftIcon="checkmark"
            fullWidth={false}
            loading={busy}
            accessibilityLabel={t('planner.markCleanA11y', { name: item.name })}
            onPress={() => onMarkClean(item)}
          />
        }
      />
    </Animated.View>
  );
});

export function PlannerSection({ items, state, header, onSelectItem, onAddNew }: PlannerSectionProps) {
  const notify = useNotify();
  const { t } = useTranslation('fashion');
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
              message: t('planner.clean', { name: item.name }),
              severity: 'success',
              action: {
                label: t('common.undo'),
                onPress: () => mutate({ id: item.id, condition: 'needs_wash' }, { onError: (err) => notify.error(failureMessage(err, t('errors.update'))) }),
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
    ({ item }: { item: GridEntry }) => (isSpacer(item) ? <SpacerCell /> : <FashionCard item={item} onPress={onSelectItem} />),
    [onSelectItem],
  );

  const empty =
    gate ??
    (wardrobeItems.length === 0 ? (
      <EmptyState
        icon="calendar-outline"
        accent="fashion"
        title={t('planner.emptyTitle')}
        description={t('planner.emptyBody')}
        actionTitle={t('planner.emptyAction')}
        onAction={onAddNew}
      />
    ) : (
      <EmptyState
        variant="noResults"
        accent="fashion"
        title={t('planner.noSeasonTitle', { season: seasonLabel(activeSeason) })}
        description={t('planner.noSeasonBody')}
        onClearFilters={() => setActiveSeason('All')}
        clearFiltersLabel={t('planner.showAll')}
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
          <StaleNotice state={state} />

          {!gate ? (
            <Card variant="outlined" padding="sm" style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                  {t('planner.laundryTitle')}
                </Text>
                <Tag
                  label={laundryItems.length === 0 ? t('planner.allClean') : t('planner.toWash', { count: laundryItems.length })}
                  icon={laundryItems.length === 0 ? 'checkmark-circle' : 'water-outline'}
                  accent="fashion"
                />
              </View>

              {laundryItems.length === 0 ? (
                <Text variant="body" color="textSecondary">
                  {t('planner.allCleanBody')}
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
              <SectionHeader title={t('planner.seasonalTitle')} subtitle={t('planner.seasonalHint')} />
              <ChipRow>
                {SEASONS.map((season) => (
                  <Chip key={season} label={seasonLabel(season)} accent="fashion" selected={activeSeason === season} count={seasonCounts.get(season) ?? 0} onPress={() => setActiveSeason(season)} />
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
