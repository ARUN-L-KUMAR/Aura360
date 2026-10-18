import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { useBlockMotion } from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';
import { layout, radius, spacing, useTheme } from '@/theme';

const ICON_TILE = spacing.xxxl * 2; // 96
const CONTENT_MAX_WIDTH = 360;

export function BiometricLockScreen() {
  const { t } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const motion = useBlockMotion();
  const { biometricLabel, biometricType, authenticate } = useBiometrics();
  const { signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const iconName: keyof typeof Ionicons.glyphMap =
    biometricType === 'face'
      ? 'scan-outline'
      : biometricType === 'fingerprint'
        ? 'finger-print-outline'
        : 'shield-checkmark-outline';

  async function unlock() {
    if (checking) return;
    setChecking(true);
    setFailed(false);
    try {
      const ok = await authenticate();
      setFailed(!ok);
    } finally {
      setChecking(false);
    }
  }

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.overlay,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: layout.screenPaddingWide,
        },
      ]}>
      <Animated.View {...motion} style={styles.content}>
        <View
          style={[styles.iconTile, { backgroundColor: colors.primaryContainer }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Ionicons name={iconName} size={spacing.xxxl} color={colors.onPrimaryContainer} />
        </View>

        <View style={styles.titles}>
          <Text variant="headline" accessibilityRole="header" style={styles.center}>
            {t('lock.title')}
          </Text>
          <Text variant="body" color="textSecondary" style={styles.center}>
            {t('lock.subtitle', { method: biometricLabel })}
          </Text>
        </View>

        {failed ? (
          <Banner severity="warning" message={t('lock.failed', { method: biometricLabel })} style={styles.fullWidth} />
        ) : null}

        <Button
          title={failed ? t('lock.retry') : t('lock.unlock', { method: biometricLabel })}
          size="lg"
          leftIcon={iconName}
          loading={checking}
          onPress={unlock}
          style={styles.fullWidth}
        />
      </Animated.View>

      <Button title={t('lock.signOut')} variant="ghost" onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    gap: layout.sectionGap,
  },
  iconTile: {
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { alignItems: 'center', gap: spacing.xs },
  center: { textAlign: 'center' },
  fullWidth: { width: '100%' },
});
