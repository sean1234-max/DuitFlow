import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  isLarge?: boolean;
};

// Labelled text input with an optional error message underneath.
export function Field({ label, error, isLarge = false, style, ...inputProps }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.icon}
        style={[styles.input, isLarge && styles.large, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    large: { ...typography.display },
    inputError: { borderColor: colors.danger },
    error: { ...typography.caption, color: colors.danger },
  });

export const AMOUNT_ERROR = 'Enter an amount above 0, with up to 2 decimals.';
