import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { GROUP_ICON, GROUP_MODULE, SEARCH_GROUPS, type SearchGroup } from '@/features/search/types';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

type Props = {
  recent: string[];
  scope: 'all' | SearchGroup;
  paddingBottom: number;
  onPickRecent: (query: string) => void;
  onRemoveRecent: (query: string) => void;
  onClearRecent: () => void;
  onPickScope: (group: SearchGroup) => void;
  onClearScope: () => void;
};

/** What the screen shows before anything is typed: recent searches (tap to run again) and one suggestion chip per section. */
export function SearchIdle({ recent, scope, paddingBottom, onPickRecent, onRemoveRecent, onClearRecent, onPickScope, onClearScope }: Props) {
  const { t } = useTranslation('search');
  const { colors } = useTheme();

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingTop: spacing.md, paddingBottom, gap: layout.sectionGap }}>
      {scope !== 'all' ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            marginHorizontal: layout.screenPadding,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            borderRadius: radius.md,
            padding: spacing.md,
            backgroundColor: colors.cardMuted,
          }}>
          <Text variant="label" style={{ flex: 1 }}>
            {t('idle.scope', { section: t(`groups.${scope}`) })}
          </Text>
          <Button title={t('idle.scopeClear')} variant="tertiary" size="sm" fullWidth={false} onPress={onClearScope} />
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <SectionHeader
            title={t('recent.title')}
            actionLabel={t('recent.clearAll')}
            actionAccessibilityLabel={t('recent.clearAllLabel')}
            onActionPress={onClearRecent}
            style={{ paddingHorizontal: layout.screenPadding }}
          />
          {recent.map((query) => (
            <View key={query} style={{ flexDirection: 'row', alignItems: 'center', paddingStart: layout.screenPadding, paddingEnd: spacing.xs }}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('recent.use', { query })}
                onPress={() => onPickRecent(query)}
                haptic={false}
                scaleTo={1}
                hitSlop={0}
                ringRadius={radius.sm}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouchTarget }}>
                <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                  {query}
                </Text>
              </PressableScale>
              <IconButton icon="close" variant="ghost" size="md" accessibilityLabel={t('recent.remove', { query })} onPress={() => onRemoveRecent(query)} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: spacing.md, paddingHorizontal: layout.screenPadding }}>
        <SectionHeader title={t('suggestions.title')} />
        <ChipGroup>
          {SEARCH_GROUPS.map((group) => (
            <Chip
              key={group}
              label={t(`groups.${group}`)}
              icon={GROUP_ICON[group]}
              accent={GROUP_MODULE[group]}
              selected={scope === group}
              accessibilityHint={t('suggestions.chipHint')}
              onPress={() => onPickScope(group)}
            />
          ))}
        </ChipGroup>
        <Text variant="caption" color="textSecondary">
          {t('suggestions.hint')}
        </Text>
      </View>
    </ScrollView>
  );
}
