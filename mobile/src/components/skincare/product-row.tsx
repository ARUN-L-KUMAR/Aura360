import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { PressableScale } from '@/components/ui/pressable-scale';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import type { SkincareProduct } from '@/features/skincare/types';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BODY_PART_ICON: Record<string, IconName> = {
  face: 'happy-outline',
  hair: 'cut-outline',
  body: 'body-outline',
};

const TILE = layout.minTouchTarget - spacing.xs;
const ROW_MIN_HEIGHT = layout.minTouchTarget + spacing.md;

function subtitleOf(product: SkincareProduct) {
  return [product.category, product.brand].filter(Boolean).join(' · ');
}

function Rating({ value }: { value: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons name="star" size={14} color={colors.warningText} />
      <Text variant="caption" weight="semiBold" numeric>
        {value}
      </Text>
    </View>
  );
}

function RowText({ title, subtitle, done }: { title: string; subtitle?: string; done?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="label" weight="semiBold" numberOfLines={2} color={done ? 'textSecondary' : undefined} style={done ? { textDecorationLine: 'line-through' } : undefined}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

type StepProps = {
  product: SkincareProduct;
  /** 1-based position in the routine. */
  step: number;
  done: boolean;
  onToggle: (id: string) => void;
};

/** One routine step: a numbered checkbox row. Tapping marks it done (kept on this device for the session). */
export const RoutineStepRow = memo(function RoutineStepRow({ product, step, done, onToggle }: StepProps) {
  const { colors, accent } = useTheme();
  const a = accent('skincare');
  const { t } = useTranslation('skincare');
  const subtitle = subtitleOf(product);
  const detail = [subtitle, product.rating ? t('product.rated', { rating: product.rating }) : null].filter(Boolean).join(', ');

  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={detail ? t('product.stepLabelDetail', { step, name: product.productName, detail }) : t('product.stepLabel', { step, name: product.productName })}
      accessibilityHint={done ? t('product.markNotDone') : t('product.markDone')}
      haptic="select"
      scaleTo={1}
      ringRadius={radius.md}
      onPress={() => onToggle(product.id)}
      style={{ minHeight: ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <View
        style={{
          width: TILE,
          height: TILE,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? a.solid : colors.cardMuted,
          borderWidth: 1,
          borderColor: done ? a.solid : colors.borderStrong,
        }}>
        {done ? (
          <Ionicons name="checkmark" size={20} color={a.onSolid} />
        ) : (
          <Text variant="label" weight="semiBold" numeric>
            {step}
          </Text>
        )}
      </View>
      <RowText title={product.productName} subtitle={subtitle || undefined} done={done} />
      {product.rating ? <Rating value={product.rating} /> : null}
    </PressableScale>
  );
});

/** A product on the shelf: icon tile, name, category and brand, rating and a status pill when it needs attention. */
export const ShelfRow = memo(function ShelfRow({ product }: { product: SkincareProduct }) {
  const { t } = useTranslation('skincare');
  const subtitle = subtitleOf(product);
  const needToBuy = product.status === 'need_to_buy';
  const status = needToBuy ? t('product.needToBuy') : product.status === 'finished' ? t('product.finished') : null;
  const detail = [subtitle, product.rating ? t('product.rated', { rating: product.rating }) : null, status].filter(Boolean).join(', ');

  return (
    <View
      accessible
      accessibilityLabel={detail ? t('product.shelfLabelDetail', { name: product.productName, detail }) : product.productName}
      style={{ minHeight: ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <IconTile icon={BODY_PART_ICON[product.bodyPart ?? ''] ?? 'flask-outline'} accent="skincare" size={TILE} />
      <RowText title={product.productName} subtitle={subtitle || undefined} />
      {product.rating || status ? (
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          {product.rating ? <Rating value={product.rating} /> : null}
          {status ? <Badge size="sm" label={status} severity={needToBuy ? 'warning' : 'neutral'} icon={needToBuy ? 'cart-outline' : 'checkmark-done-outline'} /> : null}
        </View>
      ) : null}
    </View>
  );
});
