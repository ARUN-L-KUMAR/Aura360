import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/animated-splash';
import { BiometricLockScreen } from '@/components/biometric-lock-screen';
import { addNotificationResponseListener, notificationService } from '@/lib/notifications';
import { AuthProvider, useAuth } from '@/providers/auth';
import { BiometricsProvider, useBiometrics } from '@/providers/biometrics';
import { QueryProvider } from '@/providers/query';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { status } = useAuth();

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function RootContent() {
  const router = useRouter();
  const { scheme } = useTheme();
  const { status } = useAuth();
  const { isLocked } = useBiometrics();
  const signedIn = status === 'signedIn';
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  // The animated splash hides the native one once it is drawn. This is only a safety net in case it never mounts.
  useEffect(() => {
    const timer = setTimeout(() => void SplashScreen.hideAsync().catch(() => {}), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (signedIn) {
      void notificationService.rescheduleAll();
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
      {!splashDone && <AnimatedSplash ready={status !== 'loading'} onFinish={finishSplash} />}
      {signedIn && isLocked ? <BiometricLockScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <BiometricsProvider>
                <RootContent />
              </BiometricsProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
