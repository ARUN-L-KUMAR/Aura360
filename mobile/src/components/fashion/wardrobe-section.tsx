import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { SearchBar } from '@/components/ui/search-bar';
import { Text } from '@/components/ui/text';
import { CATEGORIES, type FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';
import { FashionCard } from './fashion-card';
import { Heading } from './section-kit';
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
}

type LaundryFilter = 'all' | 'clean' | 'needs_wash';

const keyExtractor = (entry: GridEntry) => entry.id;

export function WardrobeSection({ items, state, header, onSelectItem, onAddNew }: WardrobeSectionProps) {
  const { t } = useTranslation('fashion');
  const padding = useListPadding();
  const refreshControl = useRefreshControl({ onRefresh: state.refetch, refreshing: state.refreshing });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [laundryFilter, setLaundryFilter] = useState<LaundryFilter>('all');

  const wardrobeItems = useMemo(() => items.filter((i) => i.status === 'wardrobe'), [items]);

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
              <Heading overline={t('wardrobe.overline')} title={t('sections.wardrobe')} subtitle={t('wardrobe.subtitle')} />
              <SearchBar value={search} onChangeText={setSearch} debounceMs={200} placeholder={t('wardrobe.search')} accessibilityLabel={t('wardrobe.searchA11y')} returnKeyType="search" autoCorrect={false} />

              <ChipRow>
                {CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={categoryLabel(cat)}
                    accent="fashion"
                    selected={selectedCategory === cat}
                    count={cat === 'All' ? wardrobeItems.length : (categoryCounts.get(cat.toLowerCase()) ?? 0)}
                    onPress={() => setSelectedCategory(cat)}
                  />
                ))}
              </ChipRow>

              <ChipRow>
                <Chip label={t('wardrobe.filterAll')} accent="fashion" selected={laundryFilter === 'all'} onPress={() => setLaundryFilter('all')} />
                <Chip label={t('wardrobe.filterClean')} accent="fashion" selected={laundryFilter === 'clean'} count={wardrobeItems.length - needsWashCount} onPress={() => setLaundryFilter('clean')} />
                <Chip label={t('wardrobe.filterWash')} accent="fashion" selected={laundryFilter === 'needs_wash'} count={needsWashCount} onPress={() => setLaundryFilter('needs_wash')} />
              </ChipRow>

              <Text variant="caption" weight="medium" color="textSecondary" accessibilityLiveRegion="polite">
                {filtersActive ? t('wardrobe.countFiltered', { count: filteredItems.length }) : t('wardrobe.count', { count: filteredItems.length })}
              </Text>
            </View>
          ) : null}
        </HeaderStack>
      }
      ListEmptyComponent={empty}
    />
  );
}
