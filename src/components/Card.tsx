import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useThemedStyles, type Colors } from '@/theme';

export function Card({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.card}>{children}</View>;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      gap: spacing.xs,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
