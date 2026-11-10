import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useNow } from '@/lib/use-now';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';
import { conditionMeta, isNotableCondition } from './condition';
import { categoryLabel } from './labels';
import { FashionImage, usePhotoScrim } from './shared';

interface FashionCardProps {
  item: FashionItem;
  onPress: (item: FashionItem) => void;
}

/** A piece that has sat in the wardrobe this long since it was last worn is flagged as idle. */
const IDLE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Round overlay buttons on a photo (the heart). */
const OVERLAY_BUTTON = spacing.xl + spacing.xs;

/** Whole days since the piece was last worn, or null when that is unknown or recent enough to stay quiet. */
export function idleDays(item: FashionItem, now: number): number | null {
  if (item.status !== 'wardrobe' || !item.lastWornDate) return null;
  const worn = new Date(item.lastWornDate).getTime();
  if (!Number.isFinite(worn)) return null;
  const days = Math.floor((now - worn) / DAY_MS);
  return days >= IDLE_AFTER_DAYS ? days : null;
}

/** "14 wears" pill pinned to the photo's bottom corner. */
function WearBadge({ count }: { count: number }) {
  const { t } = useTranslation('fashion');
  const scrim = usePhotoScrim();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        bottom: spacing.sm,
        start: spacing.sm,
        maxWidth: '80%',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: scrim.background,
      }}>
      <Text variant="caption" weight="bold" numeric numberOfLines={1} style={{ color: scrim.foreground }}>
        {t('card.wears', { count })}
      </Text>
    </View>
  );
}

function FavouriteHeart() {
  const { accent } = useTheme();
  const scrim = usePhotoScrim();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: spacing.sm,
        end: spacing.sm,
        width: OVERLAY_BUTTON,
        height: OVERLAY_BUTTON,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: scrim.background,
      }}>
      <Ionicons name="heart" size={16} color={accent('fashion').solid} />
    </View>
  );
}

/** The one status worth showing under a card: laundry/repair/new first, then a long idle spell, then the wishlist mark. */
function StatusTag({ item, now }: { item: FashionItem; now: number }) {
  const { t } = useTranslation('fashion');
  const condition = isNotableCondition(item.condition) ? conditionMeta(item.condition) : null;
  if (condition) return <Badge size="sm" severity={condition.severity} icon={condition.icon} label={condition.label} />;
  const idle = idleDays(item, now);
  if (idle !== null) return <Tag icon="time-outline" label={t('card.idle', { count: idle })} accent="fashion" />;
  if (item.status === 'wishlist') return <Tag icon="heart-outline" label={t('card.tagWishlist')} accent="fashion" />;
  return null;
}

function wearsOf(item: FashionItem): number | null {
  return item.status === 'wardrobe' && item.wearCount !== undefined && item.wearCount !== null ? item.wearCount : null;
}

/** Grid card for one item: a photo-first tile with the wear count, a heart, then name, brand, price and one status tag. */
function FashionCardBase({ item, onPress }: FashionCardProps) {
  const { t } = useTranslation('fashion');
  const now = useNow(false);
  const condition = isNotableCondition(item.condition) ? conditionMeta(item.condition) : null;
  const idle = idleDays(item, now);
  const price = item.price ? formatMoney(Number(item.price)) : null;
  const wears = wearsOf(item);
  const subtitle = item.brand || categoryLabel(item.category);
  const tag = condition || idle !== null || item.status === 'wishlist';

  // One spoken line for the whole card: the photo is described by the name, so the image itself stays silent.
  const spoken = [
    item.name,
    subtitle,
    price,
    item.isFavorite ? t('card.favourite') : null,
    condition?.label,
    idle !== null ? t('card.idleSpoken', { count: idle }) : null,
    wears !== null ? t('card.wornSpoken', { count: wears }) : item.status === 'wishlist' ? t('card.onWishlist') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      padding="none"
      rounded="xl"
      onPress={() => onPress(item)}
      accessibilityLabel={spoken}
      accessibilityHint={t('card.open')}
      style={{ flex: 1, overflow: 'hidden', padding: spacing.sm }}>
      <View style={{ aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden' }}>
        <FashionImage uri={item.imageUrl} category={item.category} iconSize={44} style={{ flex: 1 }} />
        {item.isFavorite ? <FavouriteHeart /> : null}
        {wears !== null ? <WearBadge count={wears} /> : null}
      </View>

      <View style={{ paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs }}>
        <Text variant="label" weight="bold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xs, marginTop: spacing.xs }}>
          <Text variant="label" weight="bold" numeric>
            {price ?? t('common.dash')}
          </Text>
          {tag ? <StatusTag item={item} now={now} /> : null}
        </View>
      </View>
    </Card>
  );
}

export const FashionCard = memo(FashionCardBase);

/** Width of the narrow tile used in horizontal strips (Most worn). */
export const FASHION_TILE_WIDTH = 144;

/** Narrow tile for a horizontal strip: the same photo-first look with one line for the name and the wear count under it. */
function FashionTileBase({ item, onPress }: FashionCardProps) {
  const { t } = useTranslation('fashion');
  const { accent } = useTheme();
  const wears = wearsOf(item);
  const spoken = [item.name, wears !== null ? t('card.wornSpoken', { count: wears }) : null].filter(Boolean).join(', ');
  return (
    <Card
      padding="none"
      rounded="xl"
      onPress={() => onPress(item)}
      accessibilityLabel={spoken}
      accessibilityHint={t('card.open')}
      style={{ width: FASHION_TILE_WIDTH, overflow: 'hidden', padding: spacing.sm }}>
      <View style={{ aspectRatio: 1.2, borderRadius: radius.lg, overflow: 'hidden' }}>
        <FashionImage uri={item.imageUrl} category={item.category} iconSize={36} style={{ flex: 1 }} />
        {item.isFavorite ? <FavouriteHeart /> : null}
      </View>
      <View style={{ paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs }}>
        <Text variant="caption" weight="bold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" weight="bold" numeric numberOfLines={1} style={{ color: accent('fashion').text }}>
          {wears !== null ? t('card.wears', { count: wears }) : item.brand || categoryLabel(item.category)}
        </Text>
      </View>
    </Card>
  );
}

export const FashionTile = memo(FashionTileBase);
