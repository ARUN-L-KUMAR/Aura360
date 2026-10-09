import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type FashionItem = {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  color?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  status?: 'wardrobe' | 'wishlist' | 'sold' | 'donated';
  wearCount?: number | null;
  isFavorite?: boolean | null;
};

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'];

export default function FashionScreen() {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  const [tab, setTab] = useState<'wardrobe' | 'wishlist'>('wardrobe');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['fashion-items'],
    queryFn: () => api.get<FashionItem[]>('/api/fashion'),
  });

  const allItems = useMemo<FashionItem[]>(() => query.data ?? [], [query.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item: FashionItem) => {
      const matchStatus = tab === 'wishlist' ? item.status === 'wishlist' : item.status !== 'wishlist';
      if (!matchStatus) return false;

      if (selectedCategory !== 'All' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      if (!q) return true;
      return [item.name, item.brand, item.category, item.color].join(' ').toLowerCase().includes(q);
    });
  }, [allItems, tab, selectedCategory, search]);

  const wardrobeTotalValue = useMemo(() => {
    return allItems
      .filter((i: FashionItem) => i.status !== 'wishlist')
      .reduce((sum: number, item: FashionItem) => sum + (Number(item.price) || 0), 0);
  }, [allItems]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
        <Text variant="title">Fashion</Text>

        {/* KPI Summary Card */}
        <GlassCard glowColor={moduleColors.fashion} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="shirt-outline" size={18} color={moduleColors.fashion} />
              <Text variant="heading" style={{ fontSize: 16 }}>
                Wardrobe Inventory
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: `${moduleColors.fashion}25`,
              }}>
              <Text variant="caption" style={{ color: moduleColors.fashion, fontWeight: '700' }}>
                {allItems.length} items
              </Text>
            </View>
          </View>

          <Text variant="display" style={{ fontSize: 32, lineHeight: 36, color: moduleColors.fashion }}>
            {formatMoney(wardrobeTotalValue)}
          </Text>
          <Text variant="caption" muted>
            Estimated collective wardrobe valuation
          </Text>
        </GlassCard>

        {/* Status Segmented Control */}
        <Segmented
          options={[
            { value: 'wardrobe', label: `Wardrobe (${allItems.filter((i) => i.status !== 'wishlist').length})` },
            { value: 'wishlist', label: `Wishlist (${allItems.filter((i) => i.status === 'wishlist').length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            paddingHorizontal: spacing.md,
          }}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search brand, name, or color"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, minHeight: 44, color: colors.text, fontSize: 15 }}
          />
        </View>

        {/* Category Filters */}
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

        {/* Items Grid */}
        {query.isPending ? <Text muted>Loading wardrobe…</Text> : null}
        {query.isError ? <Text muted>Could not load fashion items.</Text> : null}

        {!query.isPending && !query.isError && filtered.length === 0 ? (
          <EmptyState
            icon="shirt-outline"
            title={tab === 'wishlist' ? 'Wishlist is Empty' : 'No Items in Wardrobe'}
            description={
              tab === 'wishlist'
                ? 'Save outfits or clothing pieces you plan to acquire.'
                : 'Catalog your tops, shoes, and accessories to track wear counts and styling.'
            }
          />
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              style={({ pressed }) => ({ width: '48%', opacity: pressed ? 0.8 : 1 })}>
              <GlassCard style={{ padding: 0, overflow: 'hidden' }} glowColor={item.isFavorite ? '#ec4899' : undefined}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: '100%', height: 130, backgroundColor: colors.cardMuted }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View
                    style={{
                      width: '100%',
                      height: 100,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="shirt-outline" size={32} color={moduleColors.fashion} />
                  </View>
                )}

                <View style={{ padding: spacing.sm, gap: 2 }}>
                  <Text variant="label" numberOfLines={1} style={{ fontWeight: '700' }}>
                    {item.name}
                  </Text>
                  {item.brand ? (
                    <Text variant="caption" muted numberOfLines={1}>
                      {item.brand}
                    </Text>
                  ) : null}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text variant="caption" style={{ fontWeight: '700', color: colors.text }}>
                      {item.price ? formatMoney(item.price) : '—'}
                    </Text>
                    {item.wearCount !== undefined && item.wearCount !== null ? (
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: radius.pill,
                          backgroundColor: `${moduleColors.fashion}20`,
                        }}>
                        <Text variant="caption" style={{ color: moduleColors.fashion, fontSize: 10, fontWeight: '700' }}>
                          {item.wearCount}x worn
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </Screen>
    </View>
  );
}
