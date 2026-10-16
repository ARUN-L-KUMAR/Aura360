import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { fontFamily, typeScale, useTheme } from '@/theme';

/**
 * Page transitions. Pushed screens use the platform default (iOS slide with edge-swipe back, Android's native push).
 * Modal screens slide up from the bottom on both platforms (iOS gets its native sheet via `presentation`). With
 * reduce-motion on, everything becomes a plain cross-fade.
 */
function modal(title: string, reduceMotion: boolean) {
  return {
    presentation: 'modal' as const,
    title,
    animation: reduceMotion ? ('fade' as const) : Platform.OS === 'android' ? ('slide_from_bottom' as const) : ('default' as const),
  };
}

export default function AppLayout() {
  const { colors, reduceMotion } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontFamily: fontFamily.semiBold,
            fontSize: typeScale.title.fontSize,
            color: colors.text,
          },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animation: reduceMotion ? 'fade' : 'default',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="notifications/index" options={{ title: 'Notifications' }} />
        <Stack.Screen name="notifications/settings" options={{ title: 'Alerts & reminders' }} />
        <Stack.Screen name="module/[slug]" options={{ title: '' }} />
        <Stack.Screen name="finance/transaction" options={modal('Transaction', reduceMotion)} />
        <Stack.Screen name="finance/budget" options={modal('Budget', reduceMotion)} />
        <Stack.Screen name="finance/goal" options={modal('Goal', reduceMotion)} />
        <Stack.Screen name="finance/contribute" options={modal('Add money', reduceMotion)} />
        <Stack.Screen name="finance/balances" options={modal('Money on hand', reduceMotion)} />
        <Stack.Screen name="food/meal" options={modal('Log food', reduceMotion)} />
        <Stack.Screen name="food/targets" options={modal('Daily targets', reduceMotion)} />
        <Stack.Screen name="fitness/entry" options={modal('Fitness entry', reduceMotion)} />
        <Stack.Screen name="fitness/workout" options={modal('Workout', reduceMotion)} />
        <Stack.Screen name="time/log" options={modal('Time log', reduceMotion)} />
        <Stack.Screen name="notes/edit" options={modal('Note', reduceMotion)} />
        <Stack.Screen name="saved/add" options={modal('Save a link', reduceMotion)} />
        <Stack.Screen name="saved/item" options={modal('Saved item', reduceMotion)} />
        <Stack.Screen name="fashion/add" options={modal('Clothing Item', reduceMotion)} />
        <Stack.Screen name="fashion/outfit" options={modal('Curated Look', reduceMotion)} />
        <Stack.Screen name="ai/history" options={modal('Conversations', reduceMotion)} />
      </Stack>
      <OfflineBanner />
    </View>
  );
}
