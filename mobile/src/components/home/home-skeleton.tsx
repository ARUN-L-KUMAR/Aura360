import { View } from 'react-native';

import { Grid, gridCell } from '@/components/home/grid';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { layout, spacing } from '@/theme';

const FOUR = [0, 1, 2, 3];
const THREE = [0, 1, 2];

function SectionTitle({ width = '40%' }: { width?: `${number}%` }) {
  return <Skeleton shape="line" width={width} height={spacing.lg} />;
}

/** Placeholder with the same blocks as the loaded dashboard: stats, quick actions, chart, month, modules, list. */
export function HomeSkeleton() {
  return (
    <SkeletonGroup label="Loading dashboard" style={{ gap: layout.sectionGap }}>
      <View style={{ gap: spacing.md }}>
        <SectionTitle width="30%" />
        <Grid>
          {FOUR.map((i) => (
            <View key={i} style={gridCell}>
              <Skeleton height={layout.minTouchTarget * 2} rounded="lg" />
            </View>
          ))}
        </Grid>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle width="35%" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {FOUR.map((i) => (
            <View key={i} style={{ flex: 1 }}>
              <Skeleton height={layout.minTouchTarget * 2} rounded="lg" />
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle width="45%" />
        <Skeleton height={layout.minTouchTarget * 4} rounded="lg" />
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle width="30%" />
        <Skeleton height={layout.minTouchTarget + spacing.xl} rounded="lg" />
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle width="40%" />
        <Grid>
          {FOUR.map((i) => (
            <View key={i} style={gridCell}>
              <Skeleton height={layout.minTouchTarget * 2 + spacing.md} rounded="lg" />
            </View>
          ))}
        </Grid>
      </View>

      <View style={{ gap: spacing.md }}>
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
