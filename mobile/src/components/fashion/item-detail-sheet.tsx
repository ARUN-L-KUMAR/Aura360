import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useDeleteFashionItem, useLogItemWear, useUpdateItemStatus } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { formatMoney } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

interface ItemDetailSheetProps {
  item: FashionItem | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (item: FashionItem) => void;
}

export function ItemDetailSheet({ item, visible, onClose, onEdit }: ItemDetailSheetProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const deleteMutation = useDeleteFashionItem();
  const updateStatus = useUpdateItemStatus();
  const logWear = useLogItemWear();

  if (!item) return null;

  const photos = [
    ...(item.imageUrl ? [item.imageUrl] : []),
    ...(Array.isArray(item.images) ? item.images : []),
  ];

  const priceNum = Number(item.price) || 0;
  const wearCount = item.wearCount ?? 0;
  const cpw = priceNum > 0 && wearCount > 0 ? priceNum / wearCount : priceNum > 0 ? priceNum : null;

  const buyingLink = item.metadata?.buyingLink as string | undefined;

  const handleToggleStatus = () => {
    const nextStatus = item.status === 'wardrobe' ? 'wishlist' : 'wardrobe';
    updateStatus.mutate({ id: item.id, status: nextStatus }, {
      onSuccess: () => {
        Alert.alert('Status Updated', `Item moved to ${nextStatus === 'wardrobe' ? 'Wardrobe' : 'Wishlist'}`);
        onClose();
      },
    });
  };

  const handleLogWear = () => {
    logWear.mutate({ id: item.id, currentWearCount: wearCount }, {
      onSuccess: () => {
        Alert.alert('Logged', 'Wear count recorded for today!');
      },
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(item.id, {
            onSuccess: () => onClose(),
          });
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderTopColor: colors.border,
            },
          ]}>
          {/* Header handle & Close */}
          <View style={styles.headerBar}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: colors.accent }]}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Photos carousel */}
            {photos.length > 0 ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: photos[activePhotoIndex] }}
                  style={styles.heroPhoto}
                  contentFit="cover"
                  transition={200}
                />
                {photos.length > 1 ? (
                  <View style={styles.dotsRow}>
                    {photos.map((_, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setActivePhotoIndex(i)}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: i === activePhotoIndex ? moduleColors.fashion : 'rgba(255,255,255,0.4)',
                            width: i === activePhotoIndex ? 16 : 6,
                          },
                        ]}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Title & Brand */}
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="title" style={{ fontSize: 22, fontWeight: '800' }}>
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        item.status === 'wardrobe' ? `${moduleColors.fashion}20` : '#3b82f620',
                    },
                  ]}>
                  <Text
                    style={{
                      color: item.status === 'wardrobe' ? moduleColors.fashion : '#3b82f6',
                      fontSize: 11,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {item.brand ? (
                <Text variant="caption" muted style={{ fontSize: 13, fontWeight: '600' }}>
                  {item.brand} · {item.category}
                </Text>
              ) : null}
            </View>

            {/* Key Metrics Row */}
            <View style={styles.metricsRow}>
              <GlassCard style={styles.metricCard}>
                <Text variant="caption" muted style={styles.metricLabel}>
                  PRICE
                </Text>
                <Text variant="title" style={styles.metricValue}>
                  {priceNum > 0 ? formatMoney(priceNum) : '—'}
                </Text>
              </GlassCard>

              <GlassCard style={styles.metricCard}>
                <Text variant="caption" muted style={styles.metricLabel}>
                  TIMES WORN
                </Text>
                <Text variant="title" style={[styles.metricValue, { color: moduleColors.fashion }]}>
                  {wearCount}x
                </Text>
              </GlassCard>

              {cpw !== null ? (
                <GlassCard style={styles.metricCard}>
                  <Text variant="caption" muted style={styles.metricLabel}>
                    COST / WEAR
                  </Text>
                  <Text variant="title" style={[styles.metricValue, { color: '#38bdf8' }]}>
                    {formatMoney(cpw)}
                  </Text>
                </GlassCard>
              ) : null}
            </View>

            {/* Primary Action Buttons */}
            <View style={styles.actionButtonsRow}>
              {item.status === 'wardrobe' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLogWear}
                  style={[styles.primaryActionBtn, { backgroundColor: moduleColors.fashion }]}>
                  <Ionicons name="sparkles" size={16} color="#ffffff" />
                  <Text style={styles.btnTextWhite}>Worn Today (+1)</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={handleToggleStatus}
                style={[styles.secondaryActionBtn, { borderColor: colors.border }]}>
                <Ionicons
                  name={item.status === 'wardrobe' ? 'bookmark-outline' : 'shirt-outline'}
                  size={16}
                  color={colors.text}
                />
                <Text style={[styles.btnText, { color: colors.text }]}>
                  {item.status === 'wardrobe' ? 'Move to Wishlist' : 'Move to Wardrobe'}
                </Text>
              </Pressable>
            </View>

            {/* Shopping Link Button */}
            {buyingLink ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => Linking.openURL(buyingLink).catch(() => Alert.alert('Invalid URL', buyingLink))}
                style={[styles.shopBtn, { backgroundColor: '#3b82f618', borderColor: '#3b82f640' }]}>
                <Ionicons name="cart-outline" size={18} color="#3b82f6" />
                <Text style={{ color: '#3b82f6', fontWeight: '700', fontSize: 13 }}>
                  View in Store ({(item.metadata?.platform as string) || 'Shop'})
                </Text>
                <Ionicons name="open-outline" size={15} color="#3b82f6" />
              </Pressable>
            ) : null}

            {/* Specs & Attributes List */}
            <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
              <Text variant="caption" muted style={styles.specsHeading}>
                ITEM SPECIFICATIONS
              </Text>
              <View style={styles.specRow}>
                <Text variant="caption" muted>Category</Text>
                <Text style={styles.specValue}>{item.category} {item.subcategory ? `· ${item.subcategory}` : ''}</Text>
              </View>
              {item.color ? (
                <View style={styles.specRow}>
                  <Text variant="caption" muted>Color</Text>
                  <Text style={styles.specValue}>{item.color}</Text>
                </View>
              ) : null}
              {item.size ? (
                <View style={styles.specRow}>
                  <Text variant="caption" muted>Size</Text>
                  <Text style={styles.specValue}>{item.size}</Text>
                </View>
              ) : null}
              {item.condition ? (
                <View style={styles.specRow}>
                  <Text variant="caption" muted>Condition</Text>
                  <Text style={styles.specValue}>{item.condition}</Text>
                </View>
              ) : null}
              {item.season && item.season.length > 0 ? (
                <View style={styles.specRow}>
                  <Text variant="caption" muted>Season</Text>
                  <Text style={styles.specValue}>{item.season.join(', ')}</Text>
                </View>
              ) : null}
              {item.occasion && item.occasion.length > 0 ? (
                <View style={styles.specRow}>
                  <Text variant="caption" muted>Occasion</Text>
                  <Text style={styles.specValue}>{item.occasion.join(', ')}</Text>
                </View>
              ) : null}
            </GlassCard>

            {/* Description / Notes */}
            {item.notes || item.description ? (
              <GlassCard style={{ gap: spacing.xs, padding: spacing.md }}>
                <Text variant="caption" muted style={styles.specsHeading}>
                  NOTES
                </Text>
                <Text style={{ fontSize: 13, lineHeight: 19 }}>
                  {item.notes || item.description}
                </Text>
              </GlassCard>
            ) : null}

            {/* Footer Edit / Delete Row */}
            <View style={styles.footerRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  onEdit(item);
                }}
                style={[styles.footerBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="pencil-outline" size={17} color={colors.text} />
                <Text style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>Edit</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleDelete}
                style={[styles.footerBtn, { backgroundColor: '#ef444415' }]}>
                <Ionicons name="trash-outline" size={17} color="#ef4444" />
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#ef4444' }}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  headerBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    padding: spacing.sm + 2,
    gap: 2,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  specsHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
});
