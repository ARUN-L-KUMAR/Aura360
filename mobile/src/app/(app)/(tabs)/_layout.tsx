import { Tabs, useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { FloatingAiWidget } from '@/components/ai/floating-ai-widget';
import { AppTabs } from '@/components/app-tabs';
import { modules } from '@/features/modules';
import { claimPermissionsPrompt, markOnboardingDone } from '@/features/onboarding/storage';
import { isNotificationsSupported } from '@/lib/notifications';
import { isNotificationPermissionGranted } from '@/lib/notification-permission';
import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';
import { useTheme } from '@/theme';

const PERMISSIONS = '/permissions' as Href;

/**
 * First-run housekeeping for a signed-in user:
 * - marks onboarding as seen, so a user who was already signed in (or signs out later) is never sent through it;
 * - shows the permissions screen once per install, the first time the tabs open after sign-in.
 */
function useFirstRunFlow() {
  const { status } = useAuth();
  const router = useRouter();
  const { isAvailable, isEnabled } = useBiometrics();
  const signedIn = status === 'signedIn';
  const biometricsToOffer = isAvailable && !isEnabled;

  // The claim resolves later than the render that started it, so read the latest values through refs.
  const signedInRef = useRef(signedIn);
  const routerRef = useRef(router);
  const biometricsRef = useRef(biometricsToOffer);
  useEffect(() => {
    signedInRef.current = signedIn;
    routerRef.current = router;
    biometricsRef.current = biometricsToOffer;
  });

  useEffect(() => {
    if (!signedIn) return;
    void markOnboardingDone();
    void claimPermissionsPrompt().then(async (shouldPrompt) => {
      if (!shouldPrompt) return;
      // Someone who already allowed notifications and has nothing else to enable (an existing user after an update)
      // would only see a pointless screen: skip it.
      const needsNotifications = isNotificationsSupported && !(await isNotificationPermissionGranted());
      if ((needsNotifications || biometricsRef.current) && signedInRef.current) routerRef.current.push(PERMISSIONS);
    });
  }, [signedIn]);
}

export default function TabsLayout() {
  const { colors, reduceMotion } = useTheme();
  useFirstRunFlow();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <AppTabs {...props} />}
        screenOptions={{
          headerShown: false,
          // Cross-fade between tabs; none at all when the user prefers reduced motion.
          animation: reduceMotion ? 'none' : 'fade',
          sceneStyle: { backgroundColor: colors.background },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="finance" options={{ title: modules.finance.label }} />
        <Tabs.Screen name="fashion" options={{ title: modules.fashion.label }} />
        <Tabs.Screen name="saved" options={{ title: modules.saved.label }} />
        <Tabs.Screen name="fitness" options={{ title: modules.fitness.label }} />
        <Tabs.Screen name="food" options={{ title: modules.food.label }} />
        <Tabs.Screen name="skincare" options={{ title: modules.skincare.label }} />
        <Tabs.Screen name="notes" options={{ title: modules.notes.label }} />
        <Tabs.Screen name="time" options={{ title: modules.time.label }} />
        <Tabs.Screen name="ai" options={{ title: modules.ai.label }} />
      </Tabs>
      <FloatingAiWidget />
    </View>
  );
}
