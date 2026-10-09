import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ItemDetailSheet } from '@/components/fashion/item-detail-sheet';
import { OutfitsSection } from '@/components/fashion/outfits-section';
import { OverviewSection } from '@/components/fashion/overview-section';
import { PlannerSection } from '@/components/fashion/planner-section';
import { ProfileSection } from '@/components/fashion/profile-section';
import { WardrobeSection } from '@/components/fashion/wardrobe-section';
import { WishlistSection } from '@/components/fashion/wishlist-section';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useFashionItems } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type Section = 'overview' | 'wardrobe' | 'wishlist' | 'outfits' | 'planner' | 'fit';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'outfits', label: 'Outfits' },
  { value: 'planner', label: 'Planner' },
  { value: 'fit', label: 'My Fit' },
];

export default function FashionTabScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [section, setSection] = useState<Section>('overview');
  const [selectedItem, setSelectedItem] = useState<FashionItem | null>(null);

  const { data: items = [], refetch, isRefetching } = useFashionItems();

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

  const header = (
    <View style={{ gap: spacing.md, marginBottom: spacing.xs }}>
      <View style={styles.topHeader}>
        <View style={{ gap: 2 }}>
          <View style={styles.badgeRow}>
            <View style={[styles.dot, { backgroundColor: moduleColors.fashion }]} />
            <Text variant="caption" muted style={styles.badgeText}>
              STYLE & WARDROBE
            </Text>
          </View>
          <Text variant="title">Fashion</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add clothing item"
          onPress={handleOpenAdd}
          style={[styles.addBtn, { backgroundColor: moduleColors.fashion }]}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>
            {section === 'outfits' ? 'New Look' : 'Add Item'}
          </Text>
        </Pressable>
      </View>

      <Segmented options={SECTIONS} value={section} onChange={setSection} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {section === 'overview' ? (
        <OverviewSection
          items={items}
          header={header}
          onSelectItem={setSelectedItem}
          onGoToWardrobe={() => setSection('wardrobe')}
          onGoToWishlist={() => setSection('wishlist')}
          onGoToLaundry={() => setSection('planner')}
        />
      ) : null}

      {section === 'wardrobe' ? (
        <WardrobeSection
          items={items}
          header={header}
          onSelectItem={setSelectedItem}
          onAddNew={handleOpenAdd}
        />
      ) : null}

      {section === 'wishlist' ? (
        <WishlistSection
          items={items}
          header={header}
          onSelectItem={setSelectedItem}
          onAddNew={handleOpenAdd}
        />
      ) : null}

      {section === 'outfits' ? (
        <OutfitsSection
          items={items}
          header={header}
          onCreateOutfit={() => router.push('/fashion/outfit')}
        />
      ) : null}

      {section === 'planner' ? (
        <PlannerSection
          items={items}
          header={header}
          onSelectItem={setSelectedItem}
        />
      ) : null}

      {section === 'fit' ? <ProfileSection header={header} /> : null}

      {/* Floating Action Button */}
      {section !== 'fit' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quick action button"
          onPress={handleOpenAdd}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: section === 'outfits' ? '#8b5cf6' : moduleColors.fashion,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <Ionicons name="add" size={30} color="#ffffff" />
        </Pressable>
      ) : null}

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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
