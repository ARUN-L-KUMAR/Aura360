import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { withAlpha } from '@/components/ui/logic';
import { Text } from '@/components/ui/text';
import { HOME_PRESETS } from '@/features/home/layout';
import { useHomeLayout } from '@/features/home/use-home-layout';
import { useTranslation } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

/**
 * Shown once, until the person has chosen: "Make Home yours". The quick picks apply at once; "Choose modules" opens the
 * full customize screen; "Keep everything" closes the card and changes nothing. Any change on the customize screen also
 * ends it, so it never comes back.
 */
export const FocusPrompt = memo(function FocusPrompt({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { colors, scheme, shades } = useTheme();
  const { preset, keepAll } = useHomeLayout();
  const dark = scheme === 'dark';

  return (
    <Section index={index}>
      <View
        style={{
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: withAlpha(shades.secondary[400], dark ? 0.4 : 0.35),
          backgroundColor: withAlpha(shades.secondary[500], dark ? 0.16 : 0.08),
          padding: spacing.lg,
          gap: spacing.md,
        }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" weight="bold" accessibilityRole="header">
            {t('customize.prompt.title')}
          </Text>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            {t('customize.prompt.body')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {HOME_PRESETS.filter((p) => p.id !== 'everything').map((p) => (
            <Chip key={p.id} size="md" selectable={false} label={t(`customize.presets.${p.id}.title`)} accessibilityHint={t(`customize.presets.${p.id}.body`)} onPress={() => preset(p.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button title={t('customize.prompt.customize')} variant="secondary" leftIcon="options-outline" fullWidth={false} onPress={() => router.push('/home/customize' as never)} />
          <Button title={t('customize.prompt.keepAll')} variant="ghost" fullWidth={false} onPress={keepAll} />
        </View>
      </View>
    </Section>
  );
});
