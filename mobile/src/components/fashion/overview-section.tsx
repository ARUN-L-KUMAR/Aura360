import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import type { FashionItem } from '@/features/fashion/types';
import { formatMoney } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';
import { FashionCard } from './fashion-card';

interface OverviewSectionProps {
  items: FashionItem[];
  header?: React.ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onGoToWardrobe: () => void;
  onGoToWishlist: () => void;
  onGoToLaundry: () => void;
}

export function OverviewSection({
  items,
  header,
  onSelectItem,
  onGoToWardrobe,
  onGoToWishlist,
  onGoToLaundry,
}: OverviewSectionProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  const wardrobeItems = useMemo(() => items.filter((i) => i.status === 'wardrobe'), [items]);
  const wishlistItems = useMemo(() => items.filter((i) => i.status === 'wishlist'), [items]);
  const laundryItems = useMemo(() => items.filter((i) => i.condition === 'needs_wash'), [items]);

  const wardrobeValuation = useMemo(
    () => wardrobeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [wardrobeItems]
  );

  const totalWears = useMemo(
    () => wardrobeItems.reduce((sum, item) => sum + (item.wearCount || 0), 0),
    [wardrobeItems]
  );

  const categories = useMemo(
    () => Array.from(new Set(wardrobeItems.map((i) => i.category))),
    [wardrobeItems]
  );

  const mostWornItems = useMemo(
    () => [...wardrobeItems].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0)).slice(0, 4),
    [wardrobeItems]
  );

  const recentItems = useMemo(
    () => [...items].slice(0, 4),
    [items]
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {header ? header : null}

      {/* Hero Wardrobe Valuation Card */}
      <GlassCard glowColor={moduleColors.fashion} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shirt-outline" size={18} color={moduleColors.fashion} />
            <Text variant="caption" muted style={styles.heroLabel}>
              WARDROBE ASSET VALUE
            </Text>
          </View>
          <View style={[styles.itemCountPill, { backgroundColor: `${moduleColors.fashion}20` }]}>
            <Text style={{ color: moduleColors.fashion, fontWeight: '800', fontSize: 11 }}>
              {wardrobeItems.length} ITEMS
            </Text>
          </View>
        </View>

        <Text variant="display" style={[styles.heroValuation, { color: moduleColors.fashion }]}>
          {formatMoney(wardrobeValuation)}
        </Text>
        <Text variant="caption" muted>
          Total estimated valuation of your active wardrobe collection
        </Text>
      </GlassCard>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <Pressable onPress={onGoToWardrobe} style={styles.kpiCardWrapper}>
          <GlassCard style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: `${moduleColors.fashion}18` }]}>
              <Ionicons name="shirt-outline" size={18} color={moduleColors.fashion} />
            </View>
            <Text variant="caption" muted style={styles.kpiLabel}>
              WARDROBE
            </Text>
            <Text variant="title" style={styles.kpiValue}>
              {wardrobeItems.length}
            </Text>
          </GlassCard>
        </Pressable>

        <Pressable onPress={onGoToWishlist} style={styles.kpiCardWrapper}>
          <GlassCard style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#3b82f618' }]}>
              <Ionicons name="cart-outline" size={18} color="#3b82f6" />
            </View>
            <Text variant="caption" muted style={styles.kpiLabel}>
              WISHLIST
            </Text>
            <Text variant="title" style={[styles.kpiValue, { color: '#3b82f6' }]}>
              {wishlistItems.length}
            </Text>
          </GlassCard>
        </Pressable>

        <View style={styles.kpiCardWrapper}>
          <GlassCard style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#8b5cf618' }]}>
              <Ionicons name="sparkles-outline" size={18} color="#8b5cf6" />
            </View>
            <Text variant="caption" muted style={styles.kpiLabel}>
              TOTAL WEARS
            </Text>
            <Text variant="title" style={[styles.kpiValue, { color: '#8b5cf6' }]}>
              {totalWears}
            </Text>
          </GlassCard>
        </View>

        <View style={styles.kpiCardWrapper}>
          <GlassCard style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#10b98118' }]}>
              <Ionicons name="grid-outline" size={18} color="#10b981" />
            </View>
            <Text variant="caption" muted style={styles.kpiLabel}>
              CATEGORIES
            </Text>
            <Text variant="title" style={[styles.kpiValue, { color: '#10b981' }]}>
              {categories.length}
            </Text>
          </GlassCard>
        </View>
      </View>

      {/* Laundry Alert Banner (if any) */}
      {laundryItems.length > 0 ? (
        <Pressable onPress={onGoToLaundry}>
          <GlassCard glowColor="#ef4444" style={styles.laundryCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={[styles.laundryIconBox, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="water-outline" size={22} color="#ef4444" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: '#ef4444' }}>
                  Laundry Room Alert
                </Text>
                <Text variant="caption" muted>
                  {laundryItems.length} {laundryItems.length === 1 ? 'piece needs' : 'pieces need'} wash
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </GlassCard>
        </Pressable>
      ) : null}

      {/* Most Worn Pieces */}
      {mostWornItems.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionTitleRow}>
            <Text variant="heading" style={{ fontSize: 16, fontWeight: '700' }}>
              Most Worn Pieces
            </Text>
            <Pressable onPress={onGoToWardrobe}>
              <Text variant="caption" style={{ color: moduleColors.fashion, fontWeight: '700' }}>
                View All
              </Text>
            </Pressable>
          </View>

          <View style={styles.itemsGrid}>
            {mostWornItems.map((item) => (
              <FashionCard key={item.id} item={item} onPress={() => onSelectItem(item)} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Recent Additions */}
      {recentItems.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionTitleRow}>
            <Text variant="heading" style={{ fontSize: 16, fontWeight: '700' }}>
              Recent Additions
            </Text>
          </View>

          <View style={styles.itemsGrid}>
            {recentItems.map((item) => (
              <FashionCard key={item.id} item={item} onPress={() => onSelectItem(item)} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: 80,
  },
  heroCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontWeight: '800',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  itemCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  heroValuation: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCardWrapper: {
    width: '48.5%',
  },
  kpiCard: {
    padding: spacing.md,
    gap: 3,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  laundryCard: {
    padding: spacing.md,
    borderColor: '#ef444440',
  },
  laundryIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
