import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { FloatingAiWidget } from '@/components/ai/floating-ai-widget';
import { AppTabs } from '@/components/app-tabs';
import { modules } from '@/features/modules';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <AppTabs {...props} />}
        screenOptions={{
          headerShown: false,
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
