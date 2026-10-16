import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BudgetsSection } from '@/components/finance/budgets-section';
import { GoalsSection } from '@/components/finance/goals-section';
import { HistorySection } from '@/components/finance/history-section';
import { OverviewSection } from '@/components/finance/overview-section';
import { openTransaction } from '@/components/finance/transaction-row';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';

type Section = 'overview' | 'history' | 'budgets' | 'goals';

const SECTIONS: CategorySection<Section>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'history', label: 'History' },
  { value: 'budgets', label: 'Budgets' },
  { value: 'goals', label: 'Goals' },
];

export default function FinanceScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');

  const header = <CategoryHeader module="finance" sections={SECTIONS} section={section} onSectionChange={setSection} />;

  return (
    <CategoryFrame>
      {section === 'overview' ? <OverviewSection header={header} onSeeBudgets={() => setSection('budgets')} onSeeHistory={() => setSection('history')} /> : null}
      {section === 'history' ? <HistorySection header={header} /> : null}
      {section === 'budgets' ? <BudgetsSection header={header} /> : null}
      {section === 'goals' ? <GoalsSection header={header} /> : null}

      {section === 'overview' || section === 'history' ? <CategoryFab module="finance" label="Add transaction" onPress={() => openTransaction(router)} /> : null}
    </CategoryFrame>
  );
}
