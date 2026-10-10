import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { CATEGORIES, type FashionItem } from '@/features/fashion/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';
import { FashionCard } from './fashion-card';

interface WardrobeSectionProps {
  items: FashionItem[];
  header?: React.ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onAddNew: () => void;
}

export function WardrobeSection({
  items,
  header,
  onSelectItem,
  onAddNew,
}: WardrobeSectionProps) {
  const { colors } = useTheme();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'clean' | 'needs_wash'>('all');

  const wardrobeItems = useMemo(
    () => items.filter((i) => i.status === 'wardrobe'),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wardrobeItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      if (conditionFilter === 'needs_wash' && item.condition !== 'needs_wash') {
        return false;
      }
      if (conditionFilter === 'clean' && item.condition === 'needs_wash') {
        return false;
      }

      if (!q) return true;
      const haystack = [item.name, item.brand, item.category, item.color, ...(item.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [wardrobeItems, selectedCategory, conditionFilter, search]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {header ? header : null}

      {/* Search Input */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search wardrobe by name, brand, color..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {search ? (
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.textMuted}
            onPress={() => setSearch('')}
          />
        ) : null}
      </View>

      {/* Categories Chip Row */}
      <ChipRow>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            selected={selectedCategory === cat}
            color={moduleColors.fashion}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </ChipRow>

      {/* Quick Condition Filters */}
      <View style={styles.quickFilterRow}>
        <Chip
          label="All Rotation"
          selected={conditionFilter === 'all'}
          color={moduleColors.fashion}
          onPress={() => setConditionFilter('all')}
        />
        <Chip
          label="Clean Only"
          selected={conditionFilter === 'clean'}
          color="#10b981"
          onPress={() => setConditionFilter('clean')}
        />
        <Chip
          label="Needs Wash (Laundry)"
          selected={conditionFilter === 'needs_wash'}
          color="#ef4444"
          onPress={() => setConditionFilter('needs_wash')}
        />
      </View>

      {/* Result Count */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="caption" muted style={{ fontWeight: '700' }}>
          {filteredItems.length} {filteredItems.length === 1 ? 'PIECE' : 'PIECES'} IN ROTATION
        </Text>
      </View>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon="shirt-outline"
          title={search ? 'No Matches Found' : 'Wardrobe is Empty'}
          description={
            search
              ? 'Try modifying your search or clearing category filters.'
              : 'Add your shirts, jeans, sneakers, and accessories to catalog wear count.'
          }
          actionTitle={!search ? '+ Add Clothing Item' : undefined}
          onAction={!search ? onAddNew : undefined}
        />
      ) : (
        <View style={styles.itemsGrid}>
          {filteredItems.map((item) => (
            <FashionCard key={item.id} item={item} onPress={() => onSelectItem(item)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 88,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  quickFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
