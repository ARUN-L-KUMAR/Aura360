import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useUpdateItemStatus } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';
import { FashionCard } from './fashion-card';

interface WishlistSectionProps {
  items: FashionItem[];
  header: React.ReactNode;
  onSelectItem: (item: FashionItem) => void;
  onAddNew: () => void;
}

export function WishlistSection({
  items,
  header,
  onSelectItem,
  onAddNew,
}: WishlistSectionProps) {
  const { colors } = useTheme();
  const updateStatus = useUpdateItemStatus();

  const wishlistItems = useMemo(
    () => items.filter((i) => i.status === 'wishlist'),
    [items]
  );

  const totalBudget = useMemo(
    () =>
      wishlistItems.reduce(
        (sum, item) => sum + (Number(item.price) || Number(item.metadata?.expectedBudget) || 0),
        0
      ),
    [wishlistItems]
  );

  const handleMoveToWardrobe = (item: FashionItem) => {
    updateStatus.mutate(
      { id: item.id, status: 'wardrobe' },
      {
        onSuccess: () => {
          Alert.alert('Purchased!', `"${item.name}" moved to your active wardrobe.`);
        },
      }
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {header}

      {/* Target Budget Card */}
      <GlassCard glowColor="#3b82f6" style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="cart-outline" size={18} color="#3b82f6" />
            <Text variant="caption" muted style={styles.budgetLabel}>
              TARGET WISHLIST BUDGET
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: '#3b82f620' }]}>
            <Text style={{ color: '#3b82f6', fontWeight: '800', fontSize: 11 }}>
              {wishlistItems.length} ITEMS
            </Text>
          </View>
        </View>

        <Text variant="display" style={[styles.budgetAmount, { color: '#3b82f6' }]}>
          {formatMoney(totalBudget)}
        </Text>
        <Text variant="caption" muted>
          Total estimated capital needed to acquire your saved wishlist pieces
        </Text>
      </GlassCard>

      {/* Wishlist Items List / Grid */}
      {wishlistItems.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="Wishlist is Empty"
          description="Save clothing items, jackets, or shoes you plan to buy. Include price and shopping links to track your wishlist."
          actionTitle="+ Add to Wishlist"
          onAction={onAddNew}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" muted style={{ fontWeight: '800', letterSpacing: 0.8 }}>
              WISHLIST PIECES
            </Text>
          </View>

          <View style={styles.itemsGrid}>
            {wishlistItems.map((item) => (
              <View key={item.id} style={{ width: '48%', marginBottom: spacing.md }}>
                <FashionCard item={item} onPress={() => onSelectItem(item)} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleMoveToWardrobe(item)}
                  style={[styles.quickMoveBtn, { backgroundColor: '#10b98118', borderColor: '#10b98140' }]}>
                  <Ionicons name="bag-check-outline" size={14} color="#10b981" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>
                    I Bought This
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
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
  budgetCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetLabel: {
    fontWeight: '800',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  budgetAmount: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickMoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: -4,
  },
});
