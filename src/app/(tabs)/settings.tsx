import { ScrollView, StyleSheet, Text } from 'react-native';

import { ChipGroup } from '@/components/ChipGroup';
import { spacing, typography, useThemedStyles, type Colors } from '@/theme';
import { useThemePreference, type ThemePreference } from '@/themePreference';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useThemePreference();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Appearance</Text>
      <ChipGroup options={APPEARANCE_OPTIONS} selected={preference} onSelect={setPreference} />
      <Text style={styles.hint}>System follows your phone&apos;s light/dark setting.</Text>
    </ScrollView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { padding: spacing.lg, gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary },
    hint: { ...typography.caption, color: colors.textSecondary },
  });
