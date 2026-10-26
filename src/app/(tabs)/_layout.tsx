import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline' },
  { name: 'insights', title: 'Insights', icon: 'pie-chart-outline' },
  { name: 'budgets', title: 'Budgets', icon: 'wallet-outline' },
  { name: 'goals', title: 'Goals', icon: 'flag-outline' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Mint is too light for icons on white, so the active tab uses the text color.
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.icon,
      }}
    >
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: name === 'index' ? 'DuitFlow' : title,
            tabBarLabel: title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name={icon}
                color={typeof color === 'string' ? color : colors.icon}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
