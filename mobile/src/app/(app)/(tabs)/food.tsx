import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AiLogSection } from '@/components/food/ai-log-section';
import { HistorySection } from '@/components/food/history-section';
import { openMeal } from '@/components/food/meal-row';
import { TodaySection } from '@/components/food/today-section';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { suggestMealType } from '@/features/food/types';

type Section = 'today' | 'ai' | 'history';

const SECTIONS: CategorySection<Section>[] = [
  { value: 'today', label: 'Today' },
  { value: 'ai', label: 'AI log' },
  { value: 'history', label: 'History' },
];

export default function FoodScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('today');

  const header = <CategoryHeader module="food" sections={SECTIONS} section={section} onSectionChange={setSection} />;

  return (
    <CategoryFrame>
      {section === 'today' ? <TodaySection header={header} onOpenAi={() => setSection('ai')} /> : null}
      {section === 'ai' ? <AiLogSection header={header} onLogged={() => setSection('today')} /> : null}
      {section === 'history' ? <HistorySection header={header} /> : null}

      {section !== 'ai' ? <CategoryFab module="food" label="Log food" onPress={() => openMeal(router, { mealType: suggestMealType() })} /> : null}
    </CategoryFrame>
  );
}
