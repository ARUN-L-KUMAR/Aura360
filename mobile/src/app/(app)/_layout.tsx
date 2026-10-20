import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { useTranslation } from '@/i18n';
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
  const { t } = useTranslation('common');
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
        <Stack.Screen name="settings" options={{ title: t('screens.settings') }} />
        <Stack.Screen name="notifications/index" options={{ title: t('screens.notifications') }} />
        <Stack.Screen name="notifications/settings" options={{ title: t('screens.alertsReminders') }} />
        <Stack.Screen name="module/[slug]" options={{ title: '' }} />
        <Stack.Screen name="finance/transaction" options={modal(t('screens.transaction'), reduceMotion)} />
        <Stack.Screen name="finance/subscription" options={modal(t('screens.subscription'), reduceMotion)} />
        <Stack.Screen name="finance/budget" options={modal(t('screens.budget'), reduceMotion)} />
        <Stack.Screen name="finance/goal" options={modal(t('screens.goal'), reduceMotion)} />
        <Stack.Screen name="finance/contribute" options={modal(t('screens.addMoney'), reduceMotion)} />
        <Stack.Screen name="finance/balances" options={modal(t('screens.moneyOnHand'), reduceMotion)} />
        <Stack.Screen name="food/meal" options={modal(t('screens.logFood'), reduceMotion)} />
        <Stack.Screen name="food/targets" options={modal(t('screens.dailyTargets'), reduceMotion)} />
        <Stack.Screen name="fitness/entry" options={modal(t('screens.fitnessEntry'), reduceMotion)} />
        <Stack.Screen name="fitness/workout" options={modal(t('screens.workout'), reduceMotion)} />
        <Stack.Screen name="time/log" options={modal(t('screens.timeLog'), reduceMotion)} />
        <Stack.Screen name="notes/edit" options={modal(t('screens.note'), reduceMotion)} />
        <Stack.Screen name="saved/add" options={modal(t('screens.saveLink'), reduceMotion)} />
        <Stack.Screen name="saved/item" options={modal(t('screens.savedItem'), reduceMotion)} />
        <Stack.Screen name="fashion/add" options={modal(t('screens.clothingItem'), reduceMotion)} />
        <Stack.Screen name="fashion/outfit" options={modal(t('screens.curatedLook'), reduceMotion)} />
        <Stack.Screen name="ai/history" options={modal(t('screens.conversations'), reduceMotion)} />
      </Stack>
      <OfflineBanner />
    </View>
  );
}
