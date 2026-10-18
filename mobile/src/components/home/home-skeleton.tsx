import { View } from 'react-native';

import { Grid, gridCell } from '@/components/home/grid';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';

const FOUR = [0, 1, 2, 3];
const THREE = [0, 1, 2];

function SectionTitle({ width = '40%' }: { width?: `${number}%` }) {
  return <Skeleton shape="line" width={width} height={spacing.lg} />;
}

/**
 * Placeholder with the same blocks as the loaded dashboard, in the same order: stat cards (2 x 2), quick actions
 * (2 x 2), activity bars, month donut, module cards, recent list. The hero above it is real.
 */
export function HomeSkeleton() {
  const { t } = useTranslation('home');
  return (
    <SkeletonGroup label={t('loading')} style={{ gap: layout.sectionGap }}>
      <Grid>
        {FOUR.map((i) => (
          <View key={i} style={gridCell}>
            <Skeleton height={layout.minTouchTarget * 3 - spacing.sm} rounded="xl" />
          </View>
        ))}
      </Grid>

      <View style={{ gap: spacing.lg }}>
        <SectionTitle width="35%" />
        <Grid>
          {FOUR.map((i) => (
            <View key={i} style={gridCell}>
              <Skeleton height={layout.minTouchTarget * 2 + spacing.md} rounded="xl" />
            </View>
          ))}
        </Grid>
      </View>

      <View style={{ gap: spacing.lg }}>
        <SectionTitle width="45%" />
        <Skeleton height={layout.minTouchTarget * 5} rounded="xl" />
      </View>

      <View style={{ gap: spacing.lg }}>
        <SectionTitle width="30%" />
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
