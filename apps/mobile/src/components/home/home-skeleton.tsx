import { View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';

const THREE = [0, 1, 2];

function SectionTitle({ width = '40%' }: { width?: `${number}%` }) {
  return <Skeleton shape="line" width={width} height={spacing.lg} />;
}

/**
 * Placeholder with the same blocks as the loaded dashboard, in the same order: the day gauge, the up-next bar, the
 * module tiles, the two glass squares, the money card and the recent list. The greeting above it is real.
 */
export function HomeSkeleton() {
  const { t } = useTranslation('home');
  return (
    <SkeletonGroup label={t('loading')} style={{ gap: layout.sectionGap }}>
      <Skeleton height={layout.minTouchTarget * 6} rounded="xl" />

      <Skeleton height={layout.minTouchTarget * 2} rounded="xl" />

      <View style={{ gap: spacing.lg }}>
        <SectionTitle width="35%" />
        <View style={{ gap: spacing.md }}>
          {[0, 1].map((row) => (
            <View key={row} style={{ flexDirection: 'row', gap: spacing.md }}>
              {THREE.map((i) => (
                <View key={i} style={{ flex: 1 }}>
                  <Skeleton height={layout.minTouchTarget * 2} rounded="xl" />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Skeleton height={layout.minTouchTarget * 3} rounded="xl" />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton height={layout.minTouchTarget * 3} rounded="xl" />
        </View>
      </View>

      <View style={{ gap: spacing.lg }}>
        <SectionTitle width="45%" />
        <Skeleton height={layout.minTouchTarget * 4} rounded="xl" />
      </View>

      <View style={{ gap: spacing.lg }}>
        <SectionTitle width="50%" />
        <View style={{ gap: spacing.md }}>
          {THREE.map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Skeleton shape="circle" size={layout.minTouchTarget - spacing.xs} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Skeleton shape="line" width="55%" />
                <Skeleton shape="line" width="35%" height={spacing.md} />
              </View>
              <Skeleton shape="line" width="20%" />
            </View>
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}
