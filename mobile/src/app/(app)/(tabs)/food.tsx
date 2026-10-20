import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { AiLogSection } from '@/components/food/ai-log-section';
import { HistorySection } from '@/components/food/history-section';
import { openMeal } from '@/components/food/meal-row';
import { TodaySection } from '@/components/food/today-section';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { suggestMealType } from '@/features/food/types';
import { useTranslation } from '@/i18n';

type Section = 'today' | 'ai' | 'history';

const SECTIONS: readonly Section[] = ['today', 'ai', 'history'];

export default function FoodScreen() {
  const router = useRouter();
  const { t } = useTranslation('food');
  // `/food?section=history` opens a section directly (deep links, previews).
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<Section>(() => SECTIONS.find((value) => value === params.section) ?? 'today');

  const sections: CategorySection<Section>[] = [
    { value: 'today', label: t('sections.today') },
    { value: 'ai', label: t('sections.ai') },
    { value: 'history', label: t('sections.history') },
  ];

  const header = <CategoryHeader module="food" sections={sections} section={section} onSectionChange={setSection} />;

  return (
    <CategoryFrame>
      {section === 'today' ? <TodaySection header={header} onOpenAi={() => setSection('ai')} /> : null}
      {section === 'ai' ? <AiLogSection header={header} onLogged={() => setSection('today')} /> : null}
      {section === 'history' ? <HistorySection header={header} /> : null}

      {section !== 'ai' ? <CategoryFab module="food" label={t('fab.logFood')} onPress={() => openMeal(router, { mealType: suggestMealType() })} /> : null}
    </CategoryFrame>
  );
}
