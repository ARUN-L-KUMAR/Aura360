import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AiLogSection } from '@/components/food/ai-log-section';
import { HistorySection } from '@/components/food/history-section';
import { openMeal } from '@/components/food/meal-row';
import { TodaySection } from '@/components/food/today-section';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { suggestMealType } from '@/features/food/types';
import { modules } from '@/features/modules';
import { radius, spacing, useTheme } from '@/theme';

type Section = 'today' | 'ai' | 'history';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'ai', label: 'AI Log' },
  { value: 'history', label: 'History' },
];

export default function FoodScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [section, setSection] = useState<Section>('today');

  const header = (
    <View style={{ gap: spacing.md }}>
      <Text variant="title">Food</Text>
      <Segmented options={SECTIONS} value={section} onChange={setSection} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {section === 'today' ? <TodaySection header={header} /> : null}
      {section === 'ai' ? <AiLogSection header={header} onLogged={() => setSection('today')} /> : null}
      {section === 'history' ? <HistorySection header={header} /> : null}

      {section !== 'ai' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log food"
          onPress={() => openMeal(router, { mealType: suggestMealType() })}
          style={({ pressed }) => ({
            position: 'absolute',
            right: spacing.lg,
            bottom: spacing.lg,
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: modules.food.color,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            elevation: 4,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          })}>
          <Ionicons name="add" size={30} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}
