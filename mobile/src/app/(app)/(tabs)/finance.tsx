import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  BarChart3,
  CreditCard,
  History,
  LayoutDashboard,
  Target,
} from 'lucide-react-native';

import { AnalyticsSection } from '@/components/finance/analytics-section';
import { BudgetsGoalsUnifiedSection } from '@/components/finance/budgets-goals-unified-section';
import { HistorySection, type LedgerFilter } from '@/components/finance/history-section';
import { OverviewSection } from '@/components/finance/overview-section';
import { openSubscription, SubscriptionsSection } from '@/components/finance/subscriptions-section';
import { openTransaction } from '@/components/finance/transaction-row';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { useTranslation } from '@/i18n';

type Section = 'overview' | 'ledger' | 'budgets' | 'subscriptions' | 'analytics';

// Map legacy section query params: 'history' -> 'ledger', 'goals' -> 'budgets'
function sectionFromParam(requested?: string): Section {
  return requested === 'history' ? 'ledger' : requested === 'goals' ? 'budgets' : (requested as Section) || 'overview';
}

export default function FinanceScreen() {
  const router = useRouter();
  const { t } = useTranslation('finance');
  const { section: requested, at } = useLocalSearchParams<{ section?: string; at?: string }>();

  const [section, setSection] = useState<Section>(sectionFromParam(requested));

  // The tab stays mounted once opened, so a link that names a section while it is open (the import screen's "View in
  // ledger") has to switch it; the initial value above only covers the first open. `at` is a timestamp such a link adds,
  // so asking for the section the route already names still counts as a new request.
  const request = `${requested ?? ''}:${at ?? ''}`;
  const [handledRequest, setHandledRequest] = useState(request);
  if (request !== handledRequest) {
    setHandledRequest(request);
    if (requested) setSection(sectionFromParam(requested));
  }
  // Filters the ledger opens with when a card or chart sends the user there; a tap on the Ledger tab itself clears them.
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter | undefined>();

  function changeSection(next: Section) {
    setLedgerFilter(undefined);
    setSection(next);
  }

  function openLedger(filter?: LedgerFilter) {
    setLedgerFilter(filter);
    setSection('ledger');
  }

  const sections: CategorySection<Section>[] = [
    { value: 'overview', label: t('sections.overview'), icon: LayoutDashboard },
    { value: 'ledger', label: t('sections.ledger'), icon: History },
    { value: 'budgets', label: t('sections.budgetsGoals'), icon: Target },
    { value: 'subscriptions', label: t('sections.subscriptions'), icon: CreditCard },
    { value: 'analytics', label: t('sections.analytics'), icon: BarChart3 },
  ];

  const header = (
    <CategoryHeader
      module="finance"
      sections={sections}
      section={section}
      onSectionChange={changeSection}
      scrollableTabs
    />
  );

  return (
    <CategoryFrame>
      {section === 'overview' ? (
        <OverviewSection
          header={header}
          onSeeBudgets={() => setSection('budgets')}
          onSeeHistory={() => openLedger()}
          onOpenLedger={openLedger}
        />
      ) : null}
      {section === 'ledger' ? <HistorySection header={header} initial={ledgerFilter} /> : null}
      {section === 'budgets' ? (
        <BudgetsGoalsUnifiedSection
          header={header}
          initialTab={requested === 'goals' ? 'goals' : 'budgets'}
        />
      ) : null}
      {section === 'subscriptions' ? <SubscriptionsSection header={header} /> : null}
      {section === 'analytics' ? <AnalyticsSection header={header} onOpenCategory={(category) => openLedger({ type: 'expense', category, month: 'this' })} /> : null}

      {section === 'subscriptions' ? <CategoryFab module="finance" label={t('subList.add')} onPress={() => openSubscription(router)} /> : null}
      {section === 'overview' || section === 'ledger' ? (
        <CategoryFab
          module="finance"
          label={t('actions.addTransaction')}
          onPress={() => openTransaction(router)}
        />
      ) : null}
    </CategoryFrame>
  );
}
