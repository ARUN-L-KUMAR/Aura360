import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { SearchBar } from '@/components/ui/search-bar';
import { Text } from '@/components/ui/text';
import type { FashionItem } from '@/features/fashion/types';
import { categoryCountsOf } from './categories';
import { useTranslation } from '@/i18n';
import { spacing, useTheme } from '@/theme';
import { FashionCard } from './fashion-card';
import { Heading, WarnChip } from './section-kit';
import { categoryLabel } from './labels';
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

interface WardrobeSectionProps {
  items: FashionItem[];
  state: ItemsState;
  header?: ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onAddNew: () => void;
  /** Category the list starts filtered to (opened from an Overview category card). */
  initialCategory?: string;
}

type LaundryFilter = 'all' | 'clean' | 'needs_wash';

const keyExtractor = (entry: GridEntry) => entry.id;

export function WardrobeSection({ items, state, header, onSelectItem, onAddNew, initialCategory }: WardrobeSectionProps) {
  const { t } = useTranslation('fashion');
  const padding = useListPadding();
  const { accent } = useTheme();
  const refreshControl = useRefreshControl({ onRefresh: state.refetch, refreshing: state.refreshing });

  const [search, setSearch] = useState('');
  const [laundryFilter, setLaundryFilter] = useState<LaundryFilter>('all');

  const wardrobeItems = useMemo(() => items.filter((i) => i.status === 'wardrobe'), [items]);

  // The usual five always show; any other category the pieces carry (from a pasted link, say) shows too.
  const categoryList = useMemo(() => categoryCountsOf(wardrobeItems, true), [wardrobeItems]);
  // `initialCategory` only ever comes from tapping a category card on the Overview, so it is one the wardrobe has.
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of wardrobeItems) {
      const key = item.category.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [wardrobeItems]);

  const needsWashCount = useMemo(() => wardrobeItems.filter((i) => i.condition === 'needs_wash').length, [wardrobeItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wardrobeItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (laundryFilter === 'needs_wash' && item.condition !== 'needs_wash') return false;
      if (laundryFilter === 'clean' && item.condition === 'needs_wash') return false;
      if (!q) return true;
      const haystack = [item.name, item.brand, item.category, item.color, ...(item.tags || [])].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [wardrobeItems, selectedCategory, laundryFilter, search]);

  const entries = useMemo(() => withSpacer(filteredItems), [filteredItems]);

  const filtersActive = search.trim() !== '' || selectedCategory !== 'All' || laundryFilter !== 'all';
  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedCategory('All');
    setLaundryFilter('all');
  }, []);

  const countSpoken = filtersActive ? t('wardrobe.countFiltered', { count: filteredItems.length }) : t('wardrobe.count', { count: filteredItems.length });

  const gate = itemsGate(state);
  const hasWardrobe = wardrobeItems.length > 0;

  const renderItem = useCallback(
    ({ item }: { item: GridEntry }) => (isSpacer(item) ? <SpacerCell /> : <FashionCard item={item} onPress={onSelectItem} />),
    [onSelectItem],
  );

  const empty = gate ?? (
    filtersActive && hasWardrobe ? (
      <EmptyState variant="noResults" accent="fashion" description={t('wardrobe.noMatch')} onClearFilters={clearFilters} />
    ) : (
      <EmptyState
        icon="shirt-outline"
        accent="fashion"
        title={t('wardrobe.emptyTitle')}
        description={t('wardrobe.emptyBody')}
        actionTitle={t('wardrobe.emptyAction')}
        onAction={onAddNew}
      />
    )
  );

  return (
    <FlatList
      data={gate || !hasWardrobe ? [] : entries}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={gridColumnStyle}
      ItemSeparatorComponent={RowSeparator}
      contentContainerStyle={padding}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={7}
      ListHeaderComponent={
        <HeaderStack>
          {header}
          <StaleNotice state={state} />
          {!gate && hasWardrobe ? (
            <View style={{ gap: spacing.md }}>
              <Heading
                title={t('sections.wardrobe')}
                trailing={
                  <Text variant="overline" weight="semiBold" numeric style={{ color: accent('fashion').text }} accessibilityLiveRegion="polite" accessibilityLabel={countSpoken}>
                    {t('wardrobe.pieces', { count: filteredItems.length })}
                  </Text>
                }
              />
              <SearchBar value={search} onChangeText={setSearch} debounceMs={200} placeholder={t('wardrobe.search')} accessibilityLabel={t('wardrobe.searchA11y')} returnKeyType="search" autoCorrect={false} />

              <ChipRow>
                {['All', ...categoryList.map((entry) => entry.category)].map((cat) => (
                  <Chip
                    key={cat}
                    label={categoryLabel(cat)}
                    accent="fashion"
                    selected={selectedCategory.toLowerCase() === cat.toLowerCase()}
                    count={cat === 'All' ? wardrobeItems.length : (categoryCounts.get(cat.toLowerCase()) ?? 0)}
                    onPress={() => setSelectedCategory(cat)}
                  />
                ))}
                <WarnChip label={t('wardrobe.filterWash')} count={needsWashCount} selected={laundryFilter === 'needs_wash'} onPress={() => setLaundryFilter(laundryFilter === 'needs_wash' ? 'all' : 'needs_wash')} />
                <Chip
                  label={t('wardrobe.filterClean')}
                  accent="fashion"
                  selected={laundryFilter === 'clean'}
                  count={wardrobeItems.length - needsWashCount}
                  onPress={() => setLaundryFilter(laundryFilter === 'clean' ? 'all' : 'clean')}
                />
              </ChipRow>
            </View>
          ) : null}
        </HeaderStack>
      }
      ListEmptyComponent={empty}
    />
  );
}
