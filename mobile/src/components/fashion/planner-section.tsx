import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useSaveFashionItem } from '@/features/fashion/hooks';
import { SEASONS, type FashionItem } from '@/features/fashion/types';
import { radius, spacing, useTheme } from '@/theme';
import { FashionCard } from './fashion-card';

interface PlannerSectionProps {
  items: FashionItem[];
  header?: React.ReactNode;
  onSelectItem: (item: FashionItem) => void;
}

export function PlannerSection({ items, header, onSelectItem }: PlannerSectionProps) {
  const { colors } = useTheme();
  const [activeSeason, setActiveSeason] = useState<string>('All');
  const saveItem = useSaveFashionItem();

  const wardrobeItems = useMemo(() => items.filter((i) => i.status === 'wardrobe'), [items]);
  const laundryItems = useMemo(() => items.filter((i) => i.condition === 'needs_wash'), [items]);

  const filteredSeasonal = useMemo(() => {
    if (activeSeason === 'All') return wardrobeItems;
    return wardrobeItems.filter((i) => (i.season || []).map((s) => s.toLowerCase()).includes(activeSeason.toLowerCase()));
  }, [wardrobeItems, activeSeason]);

  const handleMarkClean = (item: FashionItem) => {
    saveItem.mutate({ id: item.id, condition: 'good' }, {
      onSuccess: () => {
        Alert.alert('Cleaned!', `"${item.name}" marked as clean and ready to wear.`);
      },
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {header ? header : null}

      {/* Laundry Room Section */}
      <GlassCard glowColor="#ef4444" style={styles.laundryRoomCard}>
        <View style={styles.laundryHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="water-outline" size={18} color="#ef4444" />
            <Text variant="caption" style={{ color: '#ef4444', fontWeight: '800', letterSpacing: 0.8 }}>
              LAUNDRY ROOM
            </Text>
          </View>
          <View style={[styles.laundryPill, { backgroundColor: '#ef444420' }]}>
            <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 10 }}>
              {laundryItems.length} NEEDS WASH
            </Text>
          </View>
        </View>

        {laundryItems.length === 0 ? (
          <View style={{ paddingVertical: spacing.sm }}>
            <Text variant="caption" muted>
              ✨ All your clothes are clean and ready in your wardrobe!
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            {laundryItems.map((item) => (
              <View key={item.id} style={[styles.laundryRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 14 }}>
                    {item.name}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {item.category} · {item.color || 'No color'}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleMarkClean(item)}
                  style={[styles.cleanBtn, { backgroundColor: '#10b981' }]}>
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 11 }}>
                    Mark Clean
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </GlassCard>

      {/* Seasonal Wardrobe Rotation Header */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        <Text variant="heading" style={{ fontSize: 18, fontWeight: '700' }}>
          Seasonal Capsules
        </Text>
        <Text variant="caption" muted>
          Filter items tagged for specific seasons and climate rotations
        </Text>

        <ChipRow>
          {SEASONS.map((season) => (
            <Chip
              key={season}
              label={season}
              selected={activeSeason === season}
              color="#38bdf8"
              onPress={() => setActiveSeason(season)}
            />
          ))}
        </ChipRow>

        {filteredSeasonal.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={`No ${activeSeason} Items`}
            description={`You haven't tagged any clothing pieces for ${activeSeason}. Edit your items to assign seasonal tags.`}
          />
        ) : (
          <View style={styles.itemsGrid}>
            {filteredSeasonal.map((item) => (
              <FashionCard key={item.id} item={item} onPress={() => onSelectItem(item)} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 88,
  },
  laundryRoomCard: {
    padding: spacing.md,
    gap: spacing.sm,
    borderColor: '#ef444430',
  },
  laundryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  laundryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  laundryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cleanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
