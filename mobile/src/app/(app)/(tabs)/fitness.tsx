import { useRouter } from 'expo-router';
import { useState } from 'react';

import { CoachSection } from '@/components/fitness/coach-section';
import { LogSection } from '@/components/fitness/log-section';
import { OverviewSection } from '@/components/fitness/overview-section';
import { StatsSection } from '@/components/fitness/stats-section';
import { TrainSection } from '@/components/fitness/train-section';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';

type Section = 'home' | 'train' | 'coach' | 'stats' | 'log';

const SECTIONS: CategorySection<Section>[] = [
  { value: 'home', label: 'Home' },
  { value: 'train', label: 'Train' },
  { value: 'coach', label: 'Coach' },
  { value: 'stats', label: 'Stats' },
  { value: 'log', label: 'Log' },
];

export default function FitnessScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('home');

  const logWorkout = () => router.push('/fitness/workout' as never);
  const openTrain = () => setSection('train');

  const header = <CategoryHeader module="fitness" eyebrow="Strength and recovery" sections={SECTIONS} section={section} onSectionChange={setSection} />;

  return (
    <CategoryFrame>
      {section === 'home' ? <OverviewSection header={header} onOpenTrain={openTrain} onLogWorkout={logWorkout} /> : null}
      {section === 'train' ? <TrainSection header={header} onFinished={() => setSection('log')} /> : null}
      {section === 'coach' ? <CoachSection header={header} onStarted={openTrain} /> : null}
      {section === 'stats' ? <StatsSection header={header} onOpenTrain={openTrain} /> : null}
      {section === 'log' ? <LogSection header={header} onLogWorkout={logWorkout} /> : null}

      {section === 'home' || section === 'log' ? <CategoryFab module="fitness" label="Log a workout" onPress={logWorkout} /> : null}
    </CategoryFrame>
  );
}
