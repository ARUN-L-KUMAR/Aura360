import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTargets } from '@/features/food/prefs';
import { DEFAULT_TARGETS, type MacroTargets } from '@/features/food/types';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme } from '@/theme';

const FIELDS: { key: keyof MacroTargets; label: string; unit: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: 'flame-outline' },
  { key: 'protein', label: 'Protein', unit: 'g', icon: 'barbell-outline' },
  { key: 'carbs', label: 'Carbs', unit: 'g', icon: 'nutrition-outline' },
  { key: 'fats', label: 'Fats', unit: 'g', icon: 'water-outline' },
  { key: 'waterMl', label: 'Water', unit: 'ml', icon: 'water' },
];

export default function TargetsScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { accent } = useTheme();
  const { targets, setTargets } = useTargets();
  const [draft, setDraft] = useState<Partial<Record<keyof MacroTargets, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof MacroTargets, string>>>({});
  const [saving, setSaving] = useState(false);

  const valueOf = (key: keyof MacroTargets) => draft[key] ?? String(targets[key]);

  async function submit() {
    const next = { ...targets };
    const found: typeof errors = {};
    for (const field of FIELDS) {
      const value = Number.parseFloat(valueOf(field.key));
      if (!Number.isFinite(value) || value <= 0) found[field.key] = `${field.label} must be greater than 0.`;
      else next[field.key] = Math.round(value);
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      haptics.warning();
      return;
    }
    setSaving(true);
    await setTargets(next);
    setSaving(false);
    notify.success('Daily targets saved');
    router.back();
  }

  async function reset() {
    const ok = await notify.confirm({
      title: 'Reset to defaults?',
      message: 'Your targets will go back to the standard values.',
      confirmLabel: 'Reset',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;
    await setTargets(DEFAULT_TARGETS);
    notify.success('Targets reset to defaults');
    router.back();
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Daily targets' }} />

      <Card variant="tinted" accent="food" style={{ gap: spacing.xs }}>
        <Text variant="caption" weight="semiBold" style={{ color: accent('food').text }}>
          NUTRITION AND HYDRATION GOALS
        </Text>
        <Text variant="title" accessibilityRole="header">
          Your daily targets
        </Text>
        <Text variant="caption" color="textSecondary">
          Calorie and macro targets set how full your rings get on the Today tab. They are saved on this phone.
        </Text>
      </Card>

      <Card style={{ gap: spacing.md }}>
        {FIELDS.map((field, index) => (
          <Input
            key={field.key}
            label={`${field.label} (${field.unit})`}
            leftIcon={field.icon}
            value={valueOf(field.key)}
            onChangeText={(value) => {
              setDraft((current) => ({ ...current, [field.key]: value }));
              if (errors[field.key]) setErrors((current) => ({ ...current, [field.key]: undefined }));
            }}
            keyboardType="number-pad"
            returnKeyType={index === FIELDS.length - 1 ? 'done' : 'next'}
            error={errors[field.key]}
          />
        ))}
      </Card>

      <Button title="Save daily targets" leftIcon="checkmark" onPress={submit} loading={saving} />
      <Button title="Reset to defaults" variant="ghost" onPress={reset} disabled={saving} />
    </Screen>
  );
}
