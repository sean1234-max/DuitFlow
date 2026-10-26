import { StyleSheet, View } from 'react-native';

import { radius, useThemedStyles, type Colors } from '@/theme';

type Props = { ratio: number; color: string; label: string };

export function ProgressBar({ ratio, color, label }: Props) {
  const styles = useThemedStyles(createStyles);
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radius.pill },
  });
