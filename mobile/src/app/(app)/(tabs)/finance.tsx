import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BudgetsSection } from '@/components/finance/budgets-section';
import { GoalsSection } from '@/components/finance/goals-section';
import { HistorySection } from '@/components/finance/history-section';
import { OverviewSection } from '@/components/finance/overview-section';
import { openTransaction } from '@/components/finance/transaction-row';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { useTranslation } from '@/i18n';

type Section = 'overview' | 'history' | 'budgets' | 'goals';

export default function FinanceScreen() {
  const router = useRouter();
  const { t } = useTranslation('finance');
  const [section, setSection] = useState<Section>('overview');

  const sections: CategorySection<Section>[] = [
    { value: 'overview', label: t('sections.overview') },
    { value: 'history', label: t('sections.history') },
    { value: 'budgets', label: t('sections.budgets') },
    { value: 'goals', label: t('sections.goals') },
  ];

  const header = <CategoryHeader module="finance" sections={sections} section={section} onSectionChange={setSection} />;

  return (
    <CategoryFrame>
      {section === 'overview' ? <OverviewSection header={header} onSeeBudgets={() => setSection('budgets')} onSeeHistory={() => setSection('history')} /> : null}
      {section === 'history' ? <HistorySection header={header} /> : null}
      {section === 'budgets' ? <BudgetsSection header={header} /> : null}
      {section === 'goals' ? <GoalsSection header={header} /> : null}

      {section === 'overview' || section === 'history' ? <CategoryFab module="finance" label={t('actions.addTransaction')} onPress={() => openTransaction(router)} /> : null}
    </CategoryFrame>
  );
}
