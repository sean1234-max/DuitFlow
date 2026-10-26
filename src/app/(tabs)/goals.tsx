import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { useFinance } from '@/finance/FinanceContext';
import { goalProgress } from '@/finance/goals';
import { formatMYR } from '@/money';
import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

export default function GoalsScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { goals } = useFinance();

  return (
    <Screen>
      <Text style={styles.caption}>Save towards the things that matter to you.</Text>

      {goals.length === 0 && (
        <Text style={styles.empty}>
          No goals yet. Try an emergency fund, a trip, or a new phone.
        </Text>
      )}

      {goals.map((goal) => {
        const progress = goalProgress(goal);
        const percent = Math.round(progress.ratio * 100);
        return (
          <Pressable
            key={goal.id}
            accessibilityRole="button"
            accessibilityHint="Add money, edit, or delete this goal"
            onPress={() => router.push({ pathname: '/goal', params: { id: goal.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.name}>{goal.name}</Text>
              <Text style={styles.caption}>{percent}%</Text>
            </View>
            <ProgressBar
              ratio={progress.ratio}
              color={progress.isComplete ? colors.primary : colors.accent}
              label={`${goal.name}: ${percent}% saved`}
            />
            <Text style={styles.caption}>
              {formatMYR(goal.savedSen)} of {formatMYR(goal.targetSen)}
              {progress.isComplete ? ' · Goal reached 🎉' : ` · ${formatMYR(progress.remainingSen)} to go`}
            </Text>
          </Pressable>
        );
      })}

      <Button label="+ New goal" onPress={() => router.push('/goal')} />
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    caption: { ...typography.caption, color: colors.textSecondary },
    empty: { ...typography.body, color: colors.textSecondary },
    name: { ...typography.title, color: colors.textPrimary },
    row: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    rowPressed: { opacity: 0.7 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  });
