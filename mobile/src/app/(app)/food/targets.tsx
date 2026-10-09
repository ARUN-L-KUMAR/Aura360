import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTargets } from '@/features/food/prefs';
import { DEFAULT_TARGETS, type MacroTargets } from '@/features/food/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const FIELDS: { key: keyof MacroTargets; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'calories', label: 'Calories (kcal)', icon: 'flame-outline', color: moduleColors.food },
  { key: 'protein', label: 'Protein (g)', icon: 'barbell-outline', color: '#38bdf8' },
  { key: 'carbs', label: 'Carbs (g)', icon: 'nutrition-outline', color: '#fbbf24' },
  { key: 'fats', label: 'Fats (g)', icon: 'water-outline', color: '#f43f5e' },
  { key: 'waterMl', label: 'Water (ml)', icon: 'water', color: '#0ea5e9' },
];

export default function TargetsScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const { targets, setTargets } = useTargets();
  const [draft, setDraft] = useState<Partial<Record<keyof MacroTargets, string>>>({});
  const [error, setError] = useState<string | null>(null);

  const valueOf = (key: keyof MacroTargets) => draft[key] ?? String(targets[key]);

  async function submit() {
    const next = { ...targets };
    for (const field of FIELDS) {
      const value = Number.parseFloat(valueOf(field.key));
      if (!Number.isFinite(value) || value <= 0) return setError(`${field.label} must be greater than 0.`);
      next[field.key] = Math.round(value);
    }
    setError(null);
    await setTargets(next);
    router.back();
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Daily targets' }} />

      {/* Hero Info Card */}
      <GlassCard
        glowColor={moduleColors.food}
        style={{
          gap: spacing.xs,
          padding: spacing.lg,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
          NUTRITION & HYDRATION GOALS
        </Text>
        <Text variant="heading">Personalized Daily Targets</Text>
        <Text variant="caption" muted>
          Calorie and macro targets dictate your ring completion progress on the Nutrition dashboard.
        </Text>
      </GlassCard>

      {/* Target Fields */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        {FIELDS.map((field) => (
          <View key={field.key} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name={field.icon} size={16} color={field.color} />
              <Text variant="label" muted>
                {field.label}
              </Text>
            </View>
            <Input
              value={valueOf(field.key)}
              onChangeText={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
              keyboardType="number-pad"
              style={{ fontWeight: '700', fontSize: 18 }}
            />
          </View>
        ))}
      </GlassCard>

      {error ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: `${colors.danger}18`,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}>
          <Text color="danger" style={{ fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Button title="Save Daily Targets" onPress={submit} />
        <Button
          title="Reset to defaults"
          variant="ghost"
          onPress={async () => {
            await setTargets(DEFAULT_TARGETS);
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}
