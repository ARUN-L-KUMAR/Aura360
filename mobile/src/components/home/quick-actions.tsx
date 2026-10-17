import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { memo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Section } from '@/components/home/section';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import type { IconName, ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

type QuickAction = { key: 'note' | 'transaction' | 'meal' | 'workout'; icon: IconName; accent: ModuleKey; href: string };

const ACTIONS: QuickAction[] = [
  { key: 'note', icon: 'create-outline', accent: 'notes', href: '/notes/edit' },
  { key: 'transaction', icon: 'add-circle-outline', accent: 'finance', href: '/finance/transaction' },
  { key: 'meal', icon: 'restaurant-outline', accent: 'food', href: '/food/meal' },
  { key: 'workout', icon: 'barbell-outline', accent: 'fitness', href: '/fitness/workout' },
];

/** Past this system font scale the four tiles no longer fit in one row, so they wrap into two columns. */
const WRAP_FONT_SCALE = 1.2;

const QuickActionTile = memo(function QuickActionTile({ action, wrap, onPress }: { action: QuickAction; wrap: boolean; onPress: (href: string) => void }) {
  const { t } = useTranslation('home');
  const { accent } = useTheme();
  const a = accent(action.accent);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t(`quickActions.${action.key}.label`)}
      accessibilityHint={t(`quickActions.${action.key}.hint`)}
      haptic="tap"
      ringRadius={radius.lg}
      onPress={() => onPress(action.href)}
      style={{
        flexGrow: 1,
        flexBasis: wrap ? '45%' : 0,
        minHeight: layout.minTouchTarget * 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: a.border,
        backgroundColor: a.soft,
      }}>
      <Ionicons name={action.icon} size={26} color={a.text} />
      <Text variant="caption" weight="medium" style={{ textAlign: 'center' }}>
        {t(`quickActions.${action.key}.label`)}
      </Text>
    </PressableScale>
  );
});

/** One-tap entry points to the forms people use most. */
export function QuickActions({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const { fontScale } = useWindowDimensions();
  const router = useRouter();
  const open = (href: string) => router.push(href as Href);
  const wrap = fontScale > WRAP_FONT_SCALE;
  return (
    <Section index={index}>
      <SectionHeader title={t('quickActions.title')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {ACTIONS.map((action) => (
          <QuickActionTile key={action.key} action={action} wrap={wrap} onPress={open} />
        ))}
      </View>
    </Section>
  );
}
