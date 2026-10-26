import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text } from 'react-native';

import { spacing, typography, useColors } from '@/theme';
import { ThemePreferenceProvider } from '@/themePreference';
import { TransactionsProvider } from '@/transactions/TransactionsContext';

function AppStack() {
  const colors = useColors();
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'DuitFlow',
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/settings')}
                hitSlop={spacing.sm}
              >
                <Text style={{ ...typography.body, color: colors.textPrimary }}>Settings</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="add" options={{ title: 'Add transaction', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <TransactionsProvider>
        <AppStack />
      </TransactionsProvider>
    </ThemePreferenceProvider>
  );
}
