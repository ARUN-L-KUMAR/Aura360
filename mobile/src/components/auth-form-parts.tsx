import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Divider } from '@/components/ui/divider';
import { useBlockMotion } from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

const LOGO = require('../../assets/images/splash-logo.png');

/** Widest the auth forms grow, so they stay readable on tablets. */
export const AUTH_FORM_MAX_WIDTH = 440;
/** Form content style: expands to fill available height and ensures clean top alignment without clipping overflow. */
export const authContentStyle: StyleProp<ViewStyle> = { flexGrow: 1 };

const LOGO_TILE = spacing.xxxl + spacing.xl; // 72
const LOGO_SIZE = spacing.xxxl;

/** Brand mark, heading and one line of context at the top of the sign-in and sign-up screens. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useTheme();
  const motion = useBlockMotion();
  return (
    <Animated.View {...motion} style={styles.header}>
      <View
        style={[styles.logoTile, { backgroundColor: colors.primaryContainer }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Image source={LOGO} contentFit="contain" style={styles.logo} />
      </View>
      <View style={styles.titles}>
        <Text variant="headline" accessibilityRole="header" style={styles.center}>
          {title}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.center}>
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * The "or continue with" area under a form. Each provider is one full-width button in the stack, so adding another
 * (Apple, Microsoft, ...) is a matter of rendering it next to <GoogleSignInButton />.
 */
export function SocialSignIn({ onError }: { onError?: (error: string) => void }) {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.social}>
      <View style={styles.dividerRow}>
        <Divider style={styles.dividerLine} />
        <Text variant="caption" color="textMuted">
          {t('social.divider')}
        </Text>
        <Divider style={styles.dividerLine} />
      </View>
      <View style={styles.providers}>
        <GoogleSignInButton onError={onError} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.lg },
  logoTile: {
    width: LOGO_TILE,
    height: LOGO_TILE,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  titles: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: layout.screenPadding },
  center: { textAlign: 'center' },
  social: { gap: layout.itemGap },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: layout.itemGap },
  dividerLine: { flex: 1 },
  providers: { gap: layout.itemGap },
});
