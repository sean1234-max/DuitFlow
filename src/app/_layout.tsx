import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/auth/AuthContext';
import { FinanceProvider } from '@/finance/FinanceContext';
import { useColors } from '@/theme';
import { ThemePreferenceProvider } from '@/themePreference';

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
          presentation: 'modal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="add" options={{ title: 'Transaction' }} />
        <Stack.Screen name="budget" options={{ title: 'Budget' }} />
        <Stack.Screen name="goal" options={{ title: 'Savings goal' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
      </Stack>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        <FinanceProvider>
          <AppStack />
        </FinanceProvider>
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}
