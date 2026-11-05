import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BudgetsSection } from '@/components/finance/budgets-section';
import { GoalsSection } from '@/components/finance/goals-section';
import { Segmented } from '@/components/ui/segmented';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

type Props = {
  header: ReactNode;
  initialTab?: 'budgets' | 'goals';
};

export function BudgetsGoalsUnifiedSection({ header, initialTab = 'budgets' }: Props) {
  const { t } = useTranslation('finance');
  const [subTab, setSubTab] = useState<'budgets' | 'goals'>(initialTab);

  const subSwitcher = (
    <View style={styles.subSwitchWrapper}>
      <Segmented
        options={[
          { value: 'budgets', label: t('sections.budgets') },
          { value: 'goals', label: t('sections.goals') },
        ]}
        value={subTab}
        onChange={setSubTab}
        accessibilityLabel={t('analyticsView.subSwitchA11y')}
      />
    </View>
  );

  const unifiedHeader = (
    <View style={{ gap: spacing.md }}>
      {header}
      {subSwitcher}
    </View>
  );

  return subTab === 'budgets' ? (
    <BudgetsSection header={unifiedHeader} />
  ) : (
    <GoalsSection header={unifiedHeader} />
  );
}

const styles = StyleSheet.create({
  subSwitchWrapper: {
    paddingTop: spacing.xs,
  },
});
