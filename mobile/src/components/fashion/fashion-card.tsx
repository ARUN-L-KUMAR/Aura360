import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { layout, radius, spacing, useTheme } from '@/theme';
import { conditionMeta, isNotableCondition } from './condition';
import { categoryLabel } from './labels';
import { FashionImage } from './shared';

interface FashionCardProps {
  item: FashionItem;
  onPress: (item: FashionItem) => void;
}

/** Grid card for one item: picture, name, brand, price and a wear or wishlist tag. */
function FashionCardBase({ item, onPress }: FashionCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('fashion');
  const condition = isNotableCondition(item.condition) ? conditionMeta(item.condition) : null;
  const price = item.price ? formatMoney(Number(item.price)) : null;
  const wears = item.status === 'wardrobe' && item.wearCount !== undefined && item.wearCount !== null ? item.wearCount : null;
  const subtitle = item.brand || categoryLabel(item.category);

  // One spoken line for the whole card: the photo is described by the name, so the image itself stays silent.
  const spoken = [
    item.name,
    subtitle,
    price,
    item.isFavorite ? t('card.favourite') : null,
    condition?.label,
    wears !== null ? t('card.wornSpoken', { count: wears }) : item.status === 'wishlist' ? t('card.onWishlist') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card padding="none" onPress={() => onPress(item)} accessibilityLabel={spoken} accessibilityHint={t('card.open')} style={{ flex: 1, overflow: 'hidden' }}>
      <View style={{ aspectRatio: 1 }}>
        <FashionImage uri={item.imageUrl} style={{ flex: 1 }} />

        {item.isFavorite ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.sm,
              end: spacing.sm,
              width: spacing.xl + spacing.xs,
              height: spacing.xl + spacing.xs,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceRaised,
            }}>
            <Ionicons name="heart" size={16} color={colors.error} />
          </View>
        ) : null}

        {condition ? (
          <Badge size="sm" severity={condition.severity} icon={condition.icon} label={condition.label} style={{ position: 'absolute', bottom: spacing.sm, start: spacing.sm }} />
        ) : null}
      </View>

      <View style={{ padding: spacing.md, gap: spacing.xs, minHeight: layout.minTouchTarget }}>
        <Text variant="label" weight="semiBold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Text variant="label" weight="semiBold" numeric>
            {price ?? t('common.dash')}
          </Text>
          {wears !== null ? <Tag label={t('card.worn', { n: wears })} accent="fashion" /> : item.status === 'wishlist' ? <Tag label={t('card.tagWishlist')} accent="fashion" /> : null}
        </View>
      </View>
    </Card>
  );
}

export const FashionCard = memo(FashionCardBase);
