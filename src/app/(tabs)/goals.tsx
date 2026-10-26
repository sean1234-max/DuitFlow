import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { useFinance } from '@/finance/FinanceContext';
import { goalProgress } from '@/finance/goals';
import { useT } from '@/i18n';
import { formatMYR } from '@/money';
import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

export default function GoalsScreen() {
  const t = useT();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { goals } = useFinance();

  return (
    <Screen>
      <Text style={styles.caption}>{t('goalsIntro')}</Text>

      {goals.length === 0 && <Text style={styles.empty}>{t('noGoals')}</Text>}

      {goals.map((goal) => {
        const progress = goalProgress(goal);
        const percent = `${Math.round(progress.ratio * 100)}%`;
        const status = progress.isComplete
          ? t('goalReached')
          : t('toGo', { amount: formatMYR(progress.remainingSen) });
        return (
          <Pressable
            key={goal.id}
            accessibilityRole="button"
            accessibilityHint={t('editGoalHint')}
            onPress={() => router.push({ pathname: '/goal', params: { id: goal.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.name}>{goal.name}</Text>
              <Text style={styles.caption}>{percent}</Text>
            </View>
            <ProgressBar
              ratio={progress.ratio}
              color={progress.isComplete ? colors.primary : colors.accent}
              label={t('goalSavedPercent', { name: goal.name, percent })}
            />
            <Text style={styles.caption}>
              {t('xOfY', { x: formatMYR(goal.savedSen), y: formatMYR(goal.targetSen) })} · {status}
            </Text>
          </Pressable>
        );
      })}

      <Button label={t('newGoalButton')} onPress={() => router.push('/goal')} />
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    caption: { ...typography.caption, color: colors.textSecondary },
    empty: { ...typography.body, color: colors.textSecondary },
    name: { ...typography.title, color: colors.textPrimary, flexShrink: 1 },
    row: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    rowPressed: { opacity: 0.7 },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
  });
