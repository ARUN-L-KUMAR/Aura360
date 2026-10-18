import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { IconTile } from '@/components/ui/stat-parts';
import { FloatingAction } from '@/components/ui/floating-action';
import { Segmented } from '@/components/ui/segmented';
import { Tabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { modules } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

/** The categories that share this template; each gets its own accent from the tertiary-derived ramps. */
export type CategoryKey = Extract<ModuleKey, 'fashion' | 'fitness' | 'food' | 'skincare' | 'finance' | 'time'>;

export type CategorySection<T extends string = string> = { value: T; label: string; count?: number };

type HeaderProps<T extends string> = {
  module: CategoryKey;
  /** Overrides the module label ("Fitness"). */
  title?: string;
  /** Small line above the title. Defaults to the module's one-line description. */
  eyebrow?: string;
  /** Section switcher under the title: 2-4 sections render as a segmented control, 5+ as scrollable tabs. */
  sections?: CategorySection<T>[];
  section?: T;
  onSectionChange?: (section: T) => void;
  /** Optional control shown at the trailing edge of the title row (e.g. an IconButton). */
  action?: ReactNode;
};

/**
 * The header block every category screen puts at the top of its scroll content (sections accept it as a `header`
 * prop): accent eyebrow, headline, icon tile in the category accent, and the section switcher.
 */
export function CategoryHeader<T extends string>({ module, title, eyebrow, sections, section, onSectionChange, action }: HeaderProps<T>) {
  const { accent } = useTheme();
  const { t } = useTranslation('common');
  const info = modules[module];
  const a = accent(module);
  const label = title ?? info.label;
  const showSwitcher = sections && sections.length > 1 && section !== undefined && onSectionChange;

  return (
    <View style={{ gap: spacing.lg }}>
      <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: spacing.sm - 2, height: spacing.sm - 2, borderRadius: radius.pill, backgroundColor: a.solid }} />
            <Text variant="overline" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {eyebrow ?? info.description}
            </Text>
          </View>
          <Text variant="headline" numberOfLines={2}>
            {label}
          </Text>
        </View>
        {action}
        <IconTile icon={info.icon} accent={module} size={layout.minTouchTarget + spacing.xs} />
      </View>
      {showSwitcher ? (
        sections.length > 4 ? (
          <Tabs scrollable accent={module} tabs={sections} value={section} onChange={onSectionChange} accessibilityLabel={t('categoryHeader.sections', { label })} />
        ) : (
          <Segmented options={sections} value={section} onChange={onSectionChange} accessibilityLabel={t('categoryHeader.sections', { label })} />
        )
      ) : null}
    </View>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The category's primary "add / log" button, in the category accent. */
export function CategoryFab({ module, label, icon = 'add', onPress, extended }: { module: CategoryKey; label: string; icon?: IconName; onPress: () => void; extended?: boolean }) {
  return <FloatingAction accent={module} icon={icon} accessibilityLabel={label} label={extended ? label : undefined} onPress={onPress} />;
}

/** Full-height background frame for a category screen. */
export function CategoryFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>;
}
