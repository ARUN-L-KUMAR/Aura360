import { useRouter } from 'expo-router';
import { useState } from 'react';

import { CoachSection } from '@/components/fitness/coach-section';
import { LogSection } from '@/components/fitness/log-section';
import { OverviewSection } from '@/components/fitness/overview-section';
import { StatsSection } from '@/components/fitness/stats-section';
import { TrainSection } from '@/components/fitness/train-section';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { useTranslation } from '@/i18n';

type Section = 'home' | 'train' | 'coach' | 'stats' | 'log';

export default function FitnessScreen() {
  const router = useRouter();
  const { t } = useTranslation('fitness');
  const [section, setSection] = useState<Section>('home');

  const sections: CategorySection<Section>[] = [
    { value: 'home', label: t('sections.home') },
    { value: 'train', label: t('sections.train') },
    { value: 'coach', label: t('sections.coach') },
    { value: 'stats', label: t('sections.stats') },
    { value: 'log', label: t('sections.log') },
  ];

  const logWorkout = () => router.push('/fitness/workout' as never);
  const openTrain = () => setSection('train');

  const header = <CategoryHeader module="fitness" eyebrow={t('header.eyebrow')} sections={sections} section={section} onSectionChange={setSection} />;

  return (
    <CategoryFrame>
      {section === 'home' ? <OverviewSection header={header} onOpenTrain={openTrain} onLogWorkout={logWorkout} /> : null}
      {section === 'train' ? <TrainSection header={header} onFinished={() => setSection('log')} /> : null}
      {section === 'coach' ? <CoachSection header={header} onStarted={openTrain} /> : null}
      {section === 'stats' ? <StatsSection header={header} onOpenTrain={openTrain} /> : null}
      {section === 'log' ? <LogSection header={header} onLogWorkout={logWorkout} /> : null}

      {section === 'home' || section === 'log' ? <CategoryFab module="fitness" label={t('fab.logWorkout')} onPress={logWorkout} /> : null}
    </CategoryFrame>
  );
}
