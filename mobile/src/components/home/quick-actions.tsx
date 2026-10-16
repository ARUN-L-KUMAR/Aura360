import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/home/section';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import type { IconName, ModuleKey } from '@/features/modules';
import { layout, radius, spacing, useTheme } from '@/theme';

type QuickAction = { key: string; label: string; hint: string; icon: IconName; accent: ModuleKey; href: string };

const ACTIONS: QuickAction[] = [
  { key: 'note', label: 'New note', hint: 'Opens the note editor', icon: 'create-outline', accent: 'notes', href: '/notes/edit' },
  { key: 'transaction', label: 'Transaction', hint: 'Opens the add transaction form', icon: 'add-circle-outline', accent: 'finance', href: '/finance/transaction' },
  { key: 'meal', label: 'Log meal', hint: 'Opens the meal form', icon: 'restaurant-outline', accent: 'food', href: '/food/meal' },
  { key: 'workout', label: 'Workout', hint: 'Opens the workout form', icon: 'barbell-outline', accent: 'fitness', href: '/fitness/workout' },
];

const QuickActionTile = memo(function QuickActionTile({ action, onPress }: { action: QuickAction; onPress: (href: string) => void }) {
  const { accent } = useTheme();
  const a = accent(action.accent);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={action.hint}
      haptic="tap"
      ringRadius={radius.lg}
      onPress={() => onPress(action.href)}
      style={{
        flex: 1,
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
      <Text variant="caption" weight="medium" numberOfLines={2} style={{ textAlign: 'center' }}>
        {action.label}
      </Text>
    </PressableScale>
  );
});

/** One-tap entry points to the forms people use most. */
export function QuickActions({ index }: { index: number }) {
  const router = useRouter();
  const open = (href: string) => router.push(href as Href);
  return (
    <Section index={index}>
      <SectionHeader title="Quick actions" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {ACTIONS.map((action) => (
          <QuickActionTile key={action.key} action={action} onPress={open} />
        ))}
      </View>
    </Section>
  );
}
