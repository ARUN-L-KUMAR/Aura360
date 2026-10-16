import '@/i18n';

import { Stack, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { AnimatedSplash } from '@/components/animated-splash';
import { ErrorBoundary } from '@/components/error-boundary';
import { BiometricLockScreen } from '@/components/biometric-lock-screen';
import { addNotificationResponseListener, notificationService } from '@/lib/notifications';
import { installGlobalErrorHandler } from '@/lib/global-errors';
import { registerForServerPush } from '@/lib/push';
import { analytics } from '@/lib/telemetry';
import { AuthProvider, useAuth } from '@/providers/auth';
import { NotifyProvider } from '@/providers/notify';
import { OfflineProvider } from '@/providers/offline';
import { BiometricsProvider, useBiometrics } from '@/providers/biometrics';
import { QueryProvider } from '@/providers/query';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
installGlobalErrorHandler();

function RootStack() {
  const { status } = useAuth();
  const { reduceMotion } = useTheme();

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

/** Reports each screen the user opens (route path only: no params, no content). */
function useScreenTracking() {
  const pathname = usePathname();
  useEffect(() => {
    analytics.screen(pathname);
  }, [pathname]);
}

function RootContent() {
  useScreenTracking();
  const router = useRouter();
  const { scheme } = useTheme();
  const { status } = useAuth();
  const { isLocked } = useBiometrics();
  const signedIn = status === 'signedIn';
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const fontsReady = fontsLoaded || !!fontError || fontTimeout;

  // The animated splash hides the native one once it is drawn. This is only a safety net in case it never mounts.
  useEffect(() => {
    const timer = setTimeout(() => void SplashScreen.hideAsync().catch(() => {}), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (signedIn) {
      void notificationService.rescheduleAll();
      void registerForServerPush();
    }
  }, [signedIn]);

  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const route = response?.notification?.request?.content?.data?.route;
      if (typeof route === 'string') {
        router.push(route as any);
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootStack />
      {!splashDone && <AnimatedSplash ready={status !== 'loading' && fontsReady} onFinish={finishSplash} />}
      {signedIn && isLocked ? <BiometricLockScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
        <QueryProvider>
          <AuthProvider>
            <OfflineProvider>
              <ThemeProvider>
                <NotifyProvider>
                  <BiometricsProvider>
                    <RootContent />
                  </BiometricsProvider>
                </NotifyProvider>
              </ThemeProvider>
            </OfflineProvider>
          </AuthProvider>
        </QueryProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
