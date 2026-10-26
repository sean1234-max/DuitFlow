import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useT, type TranslationKey } from '@/i18n';
import { useColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; titleKey: TranslationKey; icon: IconName }[] = [
  { name: 'index', titleKey: 'tabHome', icon: 'home-outline' },
  { name: 'insights', titleKey: 'tabInsights', icon: 'pie-chart-outline' },
  { name: 'budgets', titleKey: 'tabBudgets', icon: 'wallet-outline' },
  { name: 'goals', titleKey: 'tabGoals', icon: 'flag-outline' },
  { name: 'settings', titleKey: 'tabSettings', icon: 'settings-outline' },
];

export default function TabsLayout() {
  const t = useT();
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
      {TABS.map(({ name, titleKey, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: name === 'index' ? 'DuitFlow' : t(titleKey),
            tabBarLabel: t(titleKey),
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
