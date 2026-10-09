import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import type { FashionItem } from '@/features/fashion/types';
import { formatMoney } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

interface FashionCardProps {
  item: FashionItem;
  onPress: () => void;
  onToggleFavorite?: () => void;
}

export function FashionCard({ item, onPress, onToggleFavorite }: FashionCardProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  const conditionColor =
    item.condition === 'needs_wash'
      ? '#ef4444'
      : item.condition === 'needs_repair'
        ? '#f97316'
        : item.condition === 'new'
          ? '#10b981'
          : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        {
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      <GlassCard
        glowColor={item.isFavorite ? '#ec4899' : undefined}
        style={styles.card}>
        {/* Item Image or Placeholder */}
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
              ]}>
              <Ionicons name="shirt-outline" size={32} color={moduleColors.fashion} />
            </View>
          )}

          {/* Favorite heart badge */}
          {onToggleFavorite ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.isFavorite ? 'Unfavorite' : 'Favorite'}
              onPress={onToggleFavorite}
              hitSlop={8}
              style={[
                styles.favoriteBtn,
                { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)' },
              ]}>
              <Ionicons
                name={item.isFavorite ? 'heart' : 'heart-outline'}
                size={16}
                color={item.isFavorite ? '#ef4444' : colors.textMuted}
              />
            </Pressable>
          ) : null}

          {/* Condition Warning pill */}
          {conditionColor ? (
            <View style={[styles.conditionBadge, { backgroundColor: conditionColor }]}>
              <Text style={styles.conditionText}>
                {item.condition === 'needs_wash' ? 'Laundry' : 'Repair'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Content Meta */}
        <View style={styles.content}>
          <Text variant="label" numberOfLines={1} style={styles.itemName}>
            {item.name}
          </Text>

          {item.brand ? (
            <Text variant="caption" muted numberOfLines={1}>
              {item.brand}
            </Text>
          ) : (
            <Text variant="caption" muted numberOfLines={1}>
              {item.category}
            </Text>
          )}

          <View style={styles.footerRow}>
            <Text variant="caption" style={styles.price}>
              {item.price ? formatMoney(Number(item.price)) : '—'}
            </Text>

            {item.status === 'wardrobe' && item.wearCount !== undefined && item.wearCount !== null ? (
              <View
                style={[
                  styles.wearBadge,
                  { backgroundColor: `${moduleColors.fashion}20` },
                ]}>
                <Text style={styles.wearText}>
                  {item.wearCount}x
                </Text>
              </View>
            ) : item.status === 'wishlist' ? (
              <View
                style={[
                  styles.wearBadge,
                  { backgroundColor: `${colors.primary}20` },
                ]}>
                <Text style={[styles.wearText, { color: colors.primary }]}>
                  Wishlist
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
    marginBottom: spacing.xs,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  conditionText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.sm + 2,
    gap: 3,
  },
  itemName: {
    fontWeight: '700',
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontWeight: '800',
    fontSize: 13,
  },
  wearBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  wearText: {
    color: moduleColors.fashion,
    fontSize: 10,
    fontWeight: '800',
  },
});
