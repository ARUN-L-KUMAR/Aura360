import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { useTranslation } from '@/i18n';
import { GROUP_MODULE, type SearchGroup } from '@/features/search/types';
import { layout, spacing } from '@/theme';

export type Scope = 'all' | SearchGroup;

type Props = {
  scope: Scope;
  total: number;
  /** Groups to offer, each with its number of results. */
  groups: { group: SearchGroup; count: number }[];
  onChange: (scope: Scope) => void;
};

/**
 * "All" plus one chip per section that has results, each with its count. A horizontal scroller that keeps taps working
 * while the keyboard is open (the shared `ChipRow` would swallow the first tap to dismiss it).
 */
export function FilterChips({ scope, total, groups, onChange }: Props) {
  const { t } = useTranslation('search');
  return (
    <ScrollView
      horizontal
      style={{ flexGrow: 0 }}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel={t('filters.label')}
      contentContainerStyle={{ gap: spacing.sm, alignItems: 'center', paddingHorizontal: layout.screenPadding }}>
      <Chip label={t('filters.all')} count={total} selected={scope === 'all'} onPress={() => onChange('all')} />
      {groups.map(({ group, count }) => (
        <Chip
          key={group}
          label={t(`groups.${group}`)}
          accent={GROUP_MODULE[group]}
          count={count}
          selected={scope === group}
          onPress={() => onChange(group)}
        />
      ))}
    </ScrollView>
  );
}
