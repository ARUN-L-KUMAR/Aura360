import { Ionicons } from '@expo/vector-icons';
import { memo, type ComponentProps } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
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

function subtitleOf(product: SkincareProduct) {
  return [product.category, product.brand].filter(Boolean).join(' · ');
}

function Rating({ value }: { value: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons name="star" size={14} color={colors.warningText} />
      <Text variant="caption" weight="semiBold" numeric>
        {value}
      </Text>
    </View>
  );
}

type StepProps = {
  product: SkincareProduct;
  /** 1-based position in the routine. */
  step: number;
  done: boolean;
  onToggle: (id: string) => void;
  index: number;
};

/** One routine step: a checkbox row. Tapping marks it done (kept on this device for the session). */
export const RoutineStepRow = memo(function RoutineStepRow({ product, step, done, onToggle, index }: StepProps) {
  const { colors, accent } = useTheme();
  const a = accent('skincare');
  const { t } = useTranslation('skincare');
  const motion = useListMotion(index);
  const subtitle = subtitleOf(product);
  const detail = [subtitle, product.rating ? t('product.rated', { rating: product.rating }) : null].filter(Boolean).join(', ');

  return (
    <Animated.View {...motion}>
      <Card padding="none" rounded="md" style={{ overflow: 'hidden' }}>
        <PressableScale
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={detail ? t('product.stepLabelDetail', { step, name: product.productName, detail }) : t('product.stepLabel', { step, name: product.productName })}
          accessibilityHint={done ? t('product.markNotDone') : t('product.markDone')}
          haptic="select"
          scaleTo={1}
          ringRadius={radius.md}
          onPress={() => onToggle(product.id)}>
          <ListItem
            accessible={false}
            accent="skincare"
            selected={done}
            title={product.productName}
            subtitle={subtitle || undefined}
            leading={
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
            }
            meta={product.rating ? <Rating value={product.rating} /> : undefined}
          />
        </PressableScale>
      </Card>
    </Animated.View>
  );
});

/** A product on the shelf: icon, name, brand, rating and a status badge when it needs attention. */
export const ShelfRow = memo(function ShelfRow({ product, index }: { product: SkincareProduct; index: number }) {
  const { t } = useTranslation('skincare');
  const motion = useListMotion(index);
  const subtitle = subtitleOf(product);
  const status = product.status === 'need_to_buy' ? t('product.needToBuy') : product.status === 'finished' ? t('product.finished') : null;
  const detail = [subtitle, product.rating ? t('product.rated', { rating: product.rating }) : null, status].filter(Boolean).join(', ');

  return (
    <Animated.View {...motion}>
      <Card padding="none" rounded="md" style={{ overflow: 'hidden' }}>
        <ListItem
          accent="skincare"
          icon={BODY_PART_ICON[product.bodyPart ?? ''] ?? 'flask-outline'}
          title={product.productName}
          subtitle={subtitle || undefined}
          accessibilityLabel={detail ? t('product.shelfLabelDetail', { name: product.productName, detail }) : product.productName}
          meta={
            product.rating || status ? (
              <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                {product.rating ? <Rating value={product.rating} /> : null}
                {status ? <Badge size="sm" label={status} severity={product.status === 'need_to_buy' ? 'warning' : 'neutral'} /> : null}
              </View>
            ) : undefined
          }
        />
      </Card>
    </Animated.View>
  );
});
