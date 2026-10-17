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
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme } from '@/theme';

const FIELDS: { key: keyof MacroTargets; unit: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'calories', unit: 'kcal', icon: 'flame-outline' },
  { key: 'protein', unit: 'g', icon: 'barbell-outline' },
  { key: 'carbs', unit: 'g', icon: 'nutrition-outline' },
  { key: 'fats', unit: 'g', icon: 'water-outline' },
  { key: 'waterMl', unit: 'ml', icon: 'water' },
];

export default function TargetsScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('food');
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
      if (!Number.isFinite(value) || value <= 0) found[field.key] = t('targets.errorPositive', { name: t(`targets.fields.${field.key}`) });
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
    notify.success(t('targets.saved'));
    router.back();
  }

  async function reset() {
    const ok = await notify.confirm({
      title: t('targets.resetTitle'),
      message: t('targets.resetMessage'),
      confirmLabel: t('targets.reset'),
      cancelLabel: t('actions.cancel'),
    });
    if (!ok) return;
    await setTargets(DEFAULT_TARGETS);
    notify.success(t('targets.resetDone'));
    router.back();
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: t('targets.title') }} />

      <Card variant="tinted" accent="food" style={{ gap: spacing.xs }}>
        <Text variant="caption" weight="semiBold" style={{ color: accent('food').text, textTransform: 'uppercase' }}>
          {t('targets.eyebrow')}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {t('targets.heading')}
        </Text>
        <Text variant="caption" color="textSecondary">
          {t('targets.description')}
        </Text>
      </Card>

      <Card style={{ gap: spacing.md }}>
        {FIELDS.map((field, index) => (
          <Input
            key={field.key}
            label={t('targets.fieldLabel', { name: t(`targets.fields.${field.key}`), unit: field.unit })}
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

      <Button title={t('targets.save')} leftIcon="checkmark" onPress={submit} loading={saving} />
      <Button title={t('targets.reset')} variant="ghost" onPress={reset} disabled={saving} />
    </Screen>
  );
}
