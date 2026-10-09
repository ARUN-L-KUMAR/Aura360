import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="module/[slug]" options={{ title: '' }} />
      <Stack.Screen name="finance/transaction" options={{ presentation: 'modal', title: 'Transaction' }} />
      <Stack.Screen name="finance/budget" options={{ presentation: 'modal', title: 'Budget' }} />
      <Stack.Screen name="finance/goal" options={{ presentation: 'modal', title: 'Goal' }} />
      <Stack.Screen name="finance/contribute" options={{ presentation: 'modal', title: 'Add money' }} />
      <Stack.Screen name="finance/balances" options={{ presentation: 'modal', title: 'Money on hand' }} />
      <Stack.Screen name="food/meal" options={{ presentation: 'modal', title: 'Log food' }} />
      <Stack.Screen name="food/targets" options={{ presentation: 'modal', title: 'Daily targets' }} />
      <Stack.Screen name="fitness/entry" options={{ presentation: 'modal', title: 'Fitness entry' }} />
      <Stack.Screen name="fitness/workout" options={{ presentation: 'modal', title: 'Workout' }} />
      <Stack.Screen name="time/log" options={{ presentation: 'modal', title: 'Time log' }} />
      <Stack.Screen name="notes/edit" options={{ presentation: 'modal', title: 'Note' }} />
      <Stack.Screen name="saved/add" options={{ presentation: 'modal', title: 'Save a link' }} />
      <Stack.Screen name="saved/item" options={{ presentation: 'modal', title: 'Saved item' }} />
      <Stack.Screen name="fashion/add" options={{ presentation: 'modal', title: 'Clothing Item' }} />
      <Stack.Screen name="fashion/outfit" options={{ presentation: 'modal', title: 'Curated Look' }} />
      <Stack.Screen name="ai/history" options={{ presentation: 'modal', title: 'Conversations' }} />
    </Stack>
  );
}
