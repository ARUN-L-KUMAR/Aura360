import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemDetailSheet } from '@/components/fashion/item-detail-sheet';
import { OutfitsSection } from '@/components/fashion/outfits-section';
import { OverviewSection } from '@/components/fashion/overview-section';
import { PlannerSection } from '@/components/fashion/planner-section';
import { ProfileSection } from '@/components/fashion/profile-section';
import { WardrobeSection } from '@/components/fashion/wardrobe-section';
import { WishlistSection } from '@/components/fashion/wishlist-section';
import { Text } from '@/components/ui/text';
import { useFashionItems } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type Section = 'overview' | 'wardrobe' | 'wishlist' | 'outfits' | 'planner' | 'fit';

interface SectionTab {
  value: Section;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SECTIONS: SectionTab[] = [
  { value: 'overview', label: 'Overview', icon: 'sparkles-outline' },
  { value: 'wardrobe', label: 'Wardrobe', icon: 'shirt-outline' },
  { value: 'wishlist', label: 'Wishlist', icon: 'heart-outline' },
  { value: 'outfits', label: 'Outfits', icon: 'color-palette-outline' },
  { value: 'planner', label: 'Planner', icon: 'calendar-outline' },
  { value: 'fit', label: 'My Fit', icon: 'body-outline' },
];

export default function FashionTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [section, setSection] = useState<Section>('overview');
  const [selectedItem, setSelectedItem] = useState<FashionItem | null>(null);

  const { data: items = [] } = useFashionItems();

  const wardrobeCount = useMemo(() => items.filter((i) => i.status === 'wardrobe').length, [items]);
  const wishlistCount = useMemo(() => items.filter((i) => i.status === 'wishlist').length, [items]);

  const handleOpenAdd = () => {
    if (section === 'outfits') {
      router.push('/fashion/outfit');
    } else {
      router.push({
        pathname: '/fashion/add',
        params: { defaultStatus: section === 'wishlist' ? 'wishlist' : 'wardrobe' },
      });
    }
  };

  const handleEditItem = (item: FashionItem) => {
    router.push({
      pathname: '/fashion/add',
      params: { id: item.id },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Top Navigation Bar with Safe Area Insets */}
      <View
        style={[
          styles.navHeader,
          {
            paddingTop: insets.top + spacing.xs,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}>
        {/* Header Top Row: Category Badge, Title & Main Action Button */}
        <View style={styles.topRow}>
          <View style={{ gap: 2 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.dot, { backgroundColor: moduleColors.fashion }]} />
              <Text variant="caption" muted style={styles.badgeText}>
                STYLE & WARDROBE
              </Text>
            </View>
            <Text variant="title" style={{ fontSize: 24, fontWeight: '800' }}>
              Fashion
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={section === 'outfits' ? 'Create new outfit' : 'Add clothing item'}
            onPress={handleOpenAdd}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: section === 'outfits' ? '#8b5cf6' : moduleColors.fashion,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.actionBtnText}>
              {section === 'outfits' ? 'New Look' : 'Add Item'}
            </Text>
          </Pressable>
        </View>

        {/* Scrollable Navigation Pill Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScrollView}>
          {SECTIONS.map((tab) => {
            const isActive = section === tab.value;
            const count =
              tab.value === 'wardrobe' ? wardrobeCount : tab.value === 'wishlist' ? wishlistCount : undefined;

            return (
              <Pressable
                key={tab.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => setSection(tab.value)}
                style={({ pressed }) => [
                  styles.tabPill,
                  isActive
                    ? [styles.tabPillActive, { backgroundColor: moduleColors.fashion, borderColor: moduleColors.fashion }]
                    : [styles.tabPillInactive, { backgroundColor: colors.card, borderColor: colors.border }],
                  pressed && { opacity: 0.8 },
                ]}>
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? '#ffffff' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? '#ffffff' : colors.text,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}>
                  {tab.label}
                </Text>
                {count !== undefined ? (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: isActive ? 'rgba(255,255,255,0.28)' : colors.cardMuted,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.tabBadgeText,
                        { color: isActive ? '#ffffff' : colors.textMuted },
                      ]}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Tab Section Screen */}
      <View style={{ flex: 1 }}>
        {section === 'overview' ? (
          <OverviewSection
            items={items}
            onSelectItem={setSelectedItem}
            onGoToWardrobe={() => setSection('wardrobe')}
            onGoToWishlist={() => setSection('wishlist')}
            onGoToLaundry={() => setSection('planner')}
          />
        ) : null}

        {section === 'wardrobe' ? (
          <WardrobeSection
            items={items}
            onSelectItem={setSelectedItem}
            onAddNew={handleOpenAdd}
          />
        ) : null}

        {section === 'wishlist' ? (
          <WishlistSection
            items={items}
            onSelectItem={setSelectedItem}
            onAddNew={handleOpenAdd}
          />
        ) : null}

        {section === 'outfits' ? (
          <OutfitsSection
            items={items}
            onCreateOutfit={() => router.push('/fashion/outfit')}
          />
        ) : null}

        {section === 'planner' ? (
          <PlannerSection
            items={items}
            onSelectItem={setSelectedItem}
          />
        ) : null}

        {section === 'fit' ? <ProfileSection /> : null}
      </View>

      {/* Item Detail Inspector Sheet */}
      <ItemDetailSheet
        item={selectedItem}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={handleEditItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  tabPillActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabPillInactive: {},
  tabLabel: {
    fontSize: 13,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
