import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, spacing, typography, useThemedStyles, type Colors } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ label, onPress, variant = 'primary' }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed]}
    >
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    base: {
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderColor: colors.border },
    danger: { backgroundColor: colors.surface, borderColor: colors.danger },
    pressed: { opacity: 0.85 },
    label: { ...typography.title },
    primaryLabel: { color: colors.textOnPrimary },
    secondaryLabel: { color: colors.textPrimary },
    dangerLabel: { color: colors.danger },
  });
