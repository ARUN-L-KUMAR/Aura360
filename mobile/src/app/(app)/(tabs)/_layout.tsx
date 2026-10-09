import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { modules, type IconName } from '@/features/modules';
import { useTheme } from '@/theme';

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="finance" options={{ title: modules.finance.label, tabBarIcon: tabIcon(modules.finance.icon) }} />
      <Tabs.Screen name="fitness" options={{ title: modules.fitness.label, tabBarIcon: tabIcon(modules.fitness.icon) }} />
      <Tabs.Screen name="food" options={{ title: modules.food.label, tabBarIcon: tabIcon(modules.food.icon) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('grid-outline') }} />
    </Tabs>
  );
}
