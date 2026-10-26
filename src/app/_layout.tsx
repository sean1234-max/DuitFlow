import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useColors } from '@/theme';
import { TransactionsProvider } from '@/transactions/TransactionsContext';

export default function RootLayout() {
  const colors = useColors();
  return (
    <TransactionsProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'DuitFlow' }} />
        <Stack.Screen name="add" options={{ title: 'Add transaction', presentation: 'modal' }} />
      </Stack>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
    </TransactionsProvider>
  );
}
