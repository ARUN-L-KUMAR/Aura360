import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { useBlockMotion } from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';
import { layout, radius, spacing, useTheme } from '@/theme';

const ICON_TILE = spacing.xxxl * 2; // 96
const CONTENT_MAX_WIDTH = 360;

export function BiometricLockScreen() {
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
            Aura360 is locked
          </Text>
          <Text variant="body" color="textSecondary" style={styles.center}>
            Use {biometricLabel} to unlock your workspace.
          </Text>
        </View>

        {failed ? (
          <Banner severity="warning" message={`We could not confirm it is you. Try ${biometricLabel} again.`} style={styles.fullWidth} />
        ) : null}

        <Button
          title={failed ? 'Try again' : `Unlock with ${biometricLabel}`}
          size="lg"
          leftIcon={iconName}
          loading={checking}
          onPress={unlock}
          style={styles.fullWidth}
        />
      </Animated.View>

      <Button title="Sign out of Aura360" variant="ghost" onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
