import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/auth/AuthContext';
import { FinanceProvider } from '@/finance/FinanceContext';
import { LanguageProvider, useT } from '@/i18n';
import { useColors } from '@/theme';
import { ThemePreferenceProvider } from '@/themePreference';

function AppStack() {
  const t = useT();
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
        <Stack.Screen name="add" options={{ title: t('screenAddTransaction') }} />
        <Stack.Screen name="budget" options={{ title: t('screenAddBudget') }} />
        <Stack.Screen name="goal" options={{ title: t('screenNewGoal') }} />
        <Stack.Screen name="account" options={{ title: t('screenAccount') }} />
        <Stack.Screen name="ask" options={{ title: t('screenAsk') }} />
      </Stack>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <LanguageProvider>
        <AuthProvider>
          <FinanceProvider>
            <AppStack />
          </FinanceProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemePreferenceProvider>
  );
}
