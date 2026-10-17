import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { Illustration } from '@/components/illustrations/illustration';
import { AccentGradient } from '@/components/ui/gradient';
import { Text } from '@/components/ui/text';
import type { SceneName } from '@/illustrations/registry';
import { categoryRamps, radius, spacing, useTheme, type ModuleKey } from '@/theme';

type Props = {
  /** Registered hero scene, for example `home-hero`, `finance-hero` or `fitness-hero`. */
  scene: SceneName;
  /** Scene variant, for example a time of day for the Home hero. */
  variant?: string;
  /** Module accent. Defaults to the scene's own prefix (`finance-hero` -> finance), else the brand accent. */
  accent?: ModuleKey;
  /** Small label above the title, drawn in the accent text colour. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Scroll offset of the screen: gives the artwork its layer parallax. */
  scrollY?: SharedValue<number>;
  /** Stat row or actions shown under the title. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function accentOf(scene: string, accent?: ModuleKey): ModuleKey {
  if (accent) return accent;
  const prefix = scene.split('-')[0] as ModuleKey;
  return prefix in categoryRamps ? prefix : 'ai';
}

/**
 * A rounded hero: the illustration on top and the text below it on a solid token surface (the module's soft accent
 * fading into the card colour), so text contrast never depends on the artwork. The artwork is decorative and hidden
 * from screen readers; the title is the heading. Idle motion respects the reduce-motion setting (see `Illustration`).
 */
export const HeroBanner = memo(function HeroBanner({ scene, variant, accent, eyebrow, title, subtitle, scrollY, children, style }: Props) {
  const { colors, accent: accentFor } = useTheme();
  const key = accentOf(scene, accent);
  const tone = accentFor(key);

  return (
    <View style={[styles.frame, { backgroundColor: colors.card, borderColor: tone.border }, style]}>
      <Illustration scene={scene} variant={variant} accent={key} scrollY={scrollY} />
      <View style={styles.body}>
        <AccentGradient accent={key} direction="vertical" />
        {eyebrow ? (
          <Text variant="caption" weight="semiBold" color={tone.text} style={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
        {children ? <View style={styles.extra}>{children}</View> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  extra: {
    marginTop: spacing.md,
  },
});
