import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BudgetsSection } from '@/components/finance/budgets-section';
import { GoalsSection } from '@/components/finance/goals-section';
import { HistorySection } from '@/components/finance/history-section';
import { OverviewSection } from '@/components/finance/overview-section';
import { openTransaction } from '@/components/finance/transaction-row';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { modules } from '@/features/modules';
import { radius, spacing, useTheme } from '@/theme';

type Section = 'overview' | 'history' | 'budgets' | 'goals';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'history', label: 'History' },
  { value: 'budgets', label: 'Budgets' },
  { value: 'goals', label: 'Goals' },
];

export default function FinanceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [section, setSection] = useState<Section>('overview');

  const header = (
    <View style={{ gap: spacing.md }}>
      <Text variant="title">Finance</Text>
      <Segmented options={SECTIONS} value={section} onChange={setSection} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {section === 'overview' ? <OverviewSection header={header} /> : null}
      {section === 'history' ? <HistorySection header={header} /> : null}
      {section === 'budgets' ? <BudgetsSection header={header} /> : null}
      {section === 'goals' ? <GoalsSection header={header} /> : null}

      {section === 'overview' || section === 'history' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          onPress={() => openTransaction(router)}
          style={({ pressed }) => ({
            position: 'absolute',
            right: spacing.lg,
            bottom: spacing.lg,
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: modules.finance.color,
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
