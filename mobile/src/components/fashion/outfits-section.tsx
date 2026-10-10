import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useDeleteOutfit, useLogOutfitWorn, useOutfits } from '@/features/fashion/hooks';
import type { FashionItem, FashionOutfit } from '@/features/fashion/types';
import { radius, spacing, useTheme } from '@/theme';

interface OutfitsSectionProps {
  items: FashionItem[];
  header?: React.ReactNode;
  onCreateOutfit: () => void;
}

export function OutfitsSection({ items, header, onCreateOutfit }: OutfitsSectionProps) {
  const { colors } = useTheme();
  const { data: outfits = [], isPending } = useOutfits();
  const logWorn = useLogOutfitWorn();
  const deleteOutfit = useDeleteOutfit();

  const itemsMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const handleLogWorn = (outfit: FashionOutfit) => {
    logWorn.mutate(outfit.id, {
      onSuccess: (res) => {
        if (res?.alreadyLogged) {
          Alert.alert('Info', 'This outfit is already recorded for today.');
        } else {
          Alert.alert('Logged!', `"${outfit.name}" logged as worn today!`);
        }
      },
    });
  };

  const handleDelete = (outfit: FashionOutfit) => {
    Alert.alert('Delete Outfit', `Delete "${outfit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOutfit.mutate(outfit.id) },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {header ? header : null}

      {/* Header Bar */}
      <View style={styles.titleRow}>
        <View style={{ gap: 2 }}>
          <Text variant="heading" style={{ fontSize: 18, fontWeight: '700' }}>
            Curated Looks
          </Text>
          <Text variant="caption" muted>
            Assembled outfits and styling combinations
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onCreateOutfit}
          style={[styles.createBtn, { backgroundColor: '#8b5cf6' }]}>
          <Ionicons name="add" size={17} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>New Look</Text>
        </Pressable>
      </View>

      {/* Empty State */}
      {!isPending && outfits.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="No Outfits Assembled"
          description="Combine tops, bottoms, shoes, and outerwear into complete looks. Track how often you wear entire outfits."
          actionTitle="+ Assemble First Look"
          onAction={onCreateOutfit}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {outfits.map((outfit) => {
            const outfitItems = outfit.itemIds.map((id) => itemsMap.get(id)).filter(Boolean) as FashionItem[];

            return (
              <GlassCard key={outfit.id} glowColor="#8b5cf6" style={styles.outfitCard}>
                {/* Outfit Card Header */}
                <View style={styles.cardHeader}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <Text variant="title" style={{ fontSize: 16, fontWeight: '700' }}>
                      {outfit.name}
                    </Text>
                    {outfit.occasion || outfit.vibe ? (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                        {outfit.occasion ? (
                          <View style={[styles.tagPill, { backgroundColor: '#8b5cf618' }]}>
                            <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '700' }}>
                              {outfit.occasion}
                            </Text>
                          </View>
                        ) : null}
                        {outfit.vibe ? (
                          <View style={[styles.tagPill, { backgroundColor: '#3b82f618' }]}>
                            <Text style={{ color: '#3b82f6', fontSize: 10, fontWeight: '700' }}>
                              {outfit.vibe}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>

                  <Pressable hitSlop={10} onPress={() => handleDelete(outfit)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>

                {/* Outfit Items Collage */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collageRow}>
                  {outfitItems.map((item) => (
                    <View key={item.id} style={styles.collageItem}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.collageThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.collageThumb, { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="shirt-outline" size={20} color={colors.textMuted} />
                        </View>
                      )}
                      <Text variant="caption" numberOfLines={1} style={styles.collageItemName}>
                        {item.name}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Bottom Row: Wear counter & Log worn button */}
                <View style={styles.cardFooter}>
                  <Text variant="caption" muted style={{ fontWeight: '600' }}>
                    Worn {outfit.wearCount ?? 0} {outfit.wearCount === 1 ? 'time' : 'times'}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleLogWorn(outfit)}
                    style={[styles.wearBtn, { backgroundColor: '#8b5cf618', borderColor: '#8b5cf640' }]}>
                    <Ionicons name="checkmark-done" size={15} color="#8b5cf6" />
                    <Text style={{ color: '#8b5cf6', fontWeight: '700', fontSize: 11 }}>
                      Worn Today
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
            );
          })}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  outfitCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  collageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  collageItem: {
    width: 76,
    gap: 4,
  },
  collageThumb: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
  },
  collageItemName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spacing.sm,
  },
  wearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
