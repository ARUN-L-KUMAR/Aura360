import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/home/section';
import { Gradient } from '@/components/ui/gradient';
import { withAlpha } from '@/components/ui/logic';
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

const CHIP = layout.minTouchTarget;
const ICON = spacing.xl + spacing.xs; // 28
const WATERMARK = spacing.xxxl + spacing.xl; // 72
/** Slightly deeper squish than a row: these are big, bold targets. */
const PRESS_SCALE = 0.95;
const CHIP_ALPHA = 0.2;
const WATERMARK_ALPHA = 0.16;

const QuickActionTile = memo(function QuickActionTile({ action, onPress }: { action: QuickAction; onPress: (href: string) => void }) {
  const { t } = useTranslation('home');
  const { accent } = useTheme();
  const a = accent(action.accent);
  const label = t(`quickActions.${action.key}.label`);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t(`quickActions.${action.key}.hint`)}
      haptic="tap"
      scaleTo={PRESS_SCALE}
      ringRadius={radius.lg}
      onPress={() => onPress(action.href)}
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        minHeight: layout.minTouchTarget * 2,
        overflow: 'hidden',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
      }}>
      {/* Solid accent that deepens along the diagonal; the foreground uses the accent's own on-colour. */}
      <Gradient from={a.solid} to={a.text} direction="diagonal" />
      <View pointerEvents="none" style={{ position: 'absolute', end: -spacing.sm, bottom: -spacing.sm, opacity: WATERMARK_ALPHA }}>
        <Ionicons name={action.icon} size={WATERMARK} color={a.onSolid} />
      </View>
      <View
        style={{
          width: CHIP,
          height: CHIP,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(a.onSolid, CHIP_ALPHA),
        }}>
        <Ionicons name={action.icon} size={ICON} color={a.onSolid} />
      </View>
      <Text variant="label" weight="semiBold" numberOfLines={2} style={{ color: a.onSolid }}>
        {label}
      </Text>
    </PressableScale>
  );
});

/** One-tap entry points to the forms people use most: bold accent tiles with a large icon and a press squish. */
export const QuickActions = memo(function QuickActions({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const open = (href: string) => router.push(href as Href);
  return (
    <Section index={index}>
      <SectionHeader title={t('quickActions.title')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {ACTIONS.map((action) => (
          <QuickActionTile key={action.key} action={action} onPress={open} />
        ))}
      </View>
    </Section>
  );
});
