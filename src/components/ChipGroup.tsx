import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useThemedStyles, type Colors } from '@/theme';

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
};

// Single-choice row of pill buttons, announced as a radio group.
export function ChipGroup<T extends string>({ options, selected, onSelect }: Props<T>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map(({ value, label }) => {
        const isSelected = value === selected;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={label}
            aria-checked={isSelected}
            onPress={() => onSelect(value)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    chipText: { ...typography.caption, color: colors.textPrimary },
  });
