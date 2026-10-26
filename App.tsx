import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { brand, colors, formatMYR, radius, spacing, typography } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.wordmark} accessibilityRole="header">
            {brand.name}
          </Text>
          <Text style={styles.slogan}>{brand.slogan}</Text>
          <Text style={styles.slogan}>{brand.sloganZh}</Text>

          <View style={styles.card}>
            <Text style={styles.caption}>Total balance</Text>
            <Text style={styles.balance}>{formatMYR(0)}</Text>
            <Text style={styles.caption}>Track • Plan • Achieve</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Get started</Text>
          </Pressable>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  wordmark: { ...typography.display, color: colors.secondary },
  slogan: { ...typography.body, color: colors.textSecondary },
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caption: { ...typography.caption, color: colors.textSecondary },
  balance: { ...typography.display, color: colors.textPrimary },
  button: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { ...typography.title, color: colors.textOnPrimary },
});
