import { Redirect, Stack, usePathname, type Href } from 'expo-router';
import { View } from 'react-native';

import { useOnboardingDone } from '@/features/onboarding/storage';
import { useTheme } from '@/theme';

const ONBOARDING = '/onboarding' as Href;

/**
 * Signed-out screens. First-run gate: until the onboarding flag says "done", every route in this group redirects to
 * /onboarding (once), and nothing is drawn while the flag loads, so the sign-in form never flashes.
 *
 * Why this cannot loop: the redirect only fires when the flag is `false` AND we are not already on /onboarding, and
 * the onboarding screen publishes `true` (in memory, synchronously) before it navigates to /login. A failed disk
 * write therefore cannot bounce the user back during the same session.
 */
export default function AuthLayout() {
  const { colors, reduceMotion } = useTheme();
  const onboardingDone = useOnboardingDone();
  const pathname = usePathname();

  if (onboardingDone === null) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (onboardingDone === false && pathname !== '/onboarding') {
    return <Redirect href={ONBOARDING} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reduceMotion ? 'fade' : 'default',
      }}>
      {/* Declared first: the first screen is where a signed-out user lands, so sign-in stays the default entry. */}
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}
