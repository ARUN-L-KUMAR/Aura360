import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CoachSection } from '@/components/fitness/coach-section';
import { LogSection } from '@/components/fitness/log-section';
import { OverviewSection } from '@/components/fitness/overview-section';
import { StatsSection } from '@/components/fitness/stats-section';
import { TrainSection } from '@/components/fitness/train-section';
import { FloatingAction } from '@/components/ui/floating-action';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { modules } from '@/features/modules';
import { spacing, useTheme } from '@/theme';

type Section = 'home' | 'train' | 'coach' | 'stats' | 'log';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'train', label: 'Train' },
  { value: 'coach', label: 'Coach' },
  { value: 'stats', label: 'Stats' },
  { value: 'log', label: 'Log' },
];

export default function FitnessScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [section, setSection] = useState<Section>('home');
  const fitnessColor = modules.fitness.color;

  const logWorkout = () => router.push('/fitness/workout' as never);

  const header = (
    <View style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.badgeRow}>
            <View style={[styles.dot, { backgroundColor: fitnessColor }]} />
            <Text variant="caption" muted style={styles.sectionLabel}>
              STRENGTH & RECOVERY
            </Text>
          </View>
          <Text variant="title">Fitness</Text>
        </View>
        <View style={[styles.iconCircle, { backgroundColor: `${fitnessColor}18` }]}>
          <Ionicons name="barbell-outline" size={22} color={fitnessColor} />
        </View>
      </View>
      <Segmented options={SECTIONS} value={section} onChange={setSection} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {section === 'home' ? <OverviewSection header={header} onOpenTrain={() => setSection('train')} onLogWorkout={logWorkout} /> : null}
      {section === 'train' ? <TrainSection header={header} onFinished={() => setSection('log')} /> : null}
      {section === 'coach' ? <CoachSection header={header} onStarted={() => setSection('train')} /> : null}
      {section === 'stats' ? <StatsSection header={header} /> : null}
      {section === 'log' ? <LogSection header={header} onLogWorkout={logWorkout} /> : null}

      {section === 'home' || section === 'log' ? <FloatingAction icon="add" color={fitnessColor} accessibilityLabel="Log a workout" onPress={logWorkout} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
