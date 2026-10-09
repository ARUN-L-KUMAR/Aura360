import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export function BiometricLockScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const { biometricLabel, biometricType, authenticate } = useBiometrics();
  const { signOut } = useAuth();

  const iconName: keyof typeof Ionicons.glyphMap =
    biometricType === 'face'
      ? 'scan-outline'
      : biometricType === 'fingerprint'
        ? 'finger-print-outline'
        : 'shield-checkmark-outline';

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.xl,
        },
      ]}>
      <View style={styles.content}>
        {/* Glowing Shield Halo */}
        <View
          style={[
            styles.haloContainer,
            {
              backgroundColor: isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.08)',
              borderColor: `${moduleColors.ai}50`,
            },
          ]}>
          <Ionicons name={iconName} size={48} color={moduleColors.ai} />
        </View>

        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text variant="title" style={{ fontSize: 26, fontWeight: '800' }}>
            Aura360 is Locked
          </Text>
          <Text muted style={{ textAlign: 'center', fontSize: 15 }}>
            Authenticate with {biometricLabel} to access your workspace.
          </Text>
        </View>

        <GlassCard
          glowColor={moduleColors.ai}
          style={{
            width: '100%',
            alignItems: 'center',
            padding: spacing.xl,
            gap: spacing.lg,
            backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
          }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void authenticate()}
            style={({ pressed }) => [
              styles.touchTarget,
              {
                backgroundColor: isDark ? 'rgba(34, 48, 65, 0.7)' : colors.cardMuted,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            <Ionicons name={iconName} size={36} color={moduleColors.ai} />
          </Pressable>

          <Button
            title={`Unlock with ${biometricLabel}`}
            onPress={() => void authenticate()}
            style={{ width: '100%' }}
          />
        </GlassCard>
      </View>

      <View style={{ width: '100%', alignItems: 'center' }}>
        <Button
          title="Sign out of Aura360"
          variant="ghost"
          onPress={() => void signOut()}
        />
      </View>
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
    maxWidth: 360,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  haloContainer: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: moduleColors.ai,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  touchTarget: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${moduleColors.ai}40`,
  },
});
