import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { budgetProgress, type BudgetStatus } from '@/finance/budgets';
import { useFinance } from '@/finance/FinanceContext';
import { monthTransactions, spendingByCategory } from '@/finance/insights';
import { EXPENSE_CATEGORIES } from '@/finance/transactions';
import { formatMYR } from '@/money';
import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

export default function BudgetsScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { budgets, transactions } = useFinance();

  const spentByCategory = new Map(
    spendingByCategory(monthTransactions(transactions, new Date())).map((c) => [c.category, c.spentSen]),
  );
  const rows = [...budgets]
    .sort((a, b) => EXPENSE_CATEGORIES.indexOf(a.category) - EXPENSE_CATEGORIES.indexOf(b.category))
    .map((budget) => ({
      budget,
      progress: budgetProgress(budget.limitSen, spentByCategory.get(budget.category) ?? 0),
    }));
  const totalLimit = rows.reduce((sum, r) => sum + r.budget.limitSen, 0);
  const totalProgress = budgetProgress(
    totalLimit,
    rows.reduce((sum, r) => sum + r.progress.spentSen, 0),
  );

  const statusColor: Record<BudgetStatus, string> = {
    ok: colors.accent,
    warning: colors.warning,
    over: colors.danger,
  };
  // Blue is for bars only (3.7:1 on white is too light for text); amber and red pass as text.
  const statusTextColor = (status: BudgetStatus) =>
    status === 'ok' ? colors.textSecondary : statusColor[status];
  const statusText = (remainingSen: number) =>
    remainingSen >= 0 ? `${formatMYR(remainingSen)} left` : `${formatMYR(-remainingSen)} over`;

  return (
    <Screen>
      <Text style={styles.caption}>Monthly limits per category. Resets on the 1st.</Text>

      {rows.length > 0 && (
        <Card>
          <Text style={styles.caption}>Total this month</Text>
          <Text style={styles.total}>
            {formatMYR(totalProgress.spentSen)} of {formatMYR(totalLimit)}
          </Text>
          <ProgressBar
            ratio={totalProgress.ratio}
            color={statusColor[totalProgress.status]}
            label="Total budget used"
          />
          <Text style={[styles.caption, { color: statusTextColor(totalProgress.status) }]}>
            {statusText(totalProgress.remainingSen)}
          </Text>
        </Card>
      )}

      {rows.length === 0 && (
        <Text style={styles.empty}>
          No budgets yet. Set a monthly limit for a category to see how much you have left.
        </Text>
      )}

      {rows.map(({ budget, progress }) => (
        <Pressable
          key={budget.category}
          accessibilityRole="button"
          accessibilityHint="Edit or remove this budget"
          onPress={() => router.push({ pathname: '/budget', params: { category: budget.category } })}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowHeader}>
            <Text style={styles.body}>{budget.category}</Text>
            <Text style={styles.caption}>
              {formatMYR(progress.spentSen)} / {formatMYR(budget.limitSen)}
            </Text>
          </View>
          <ProgressBar
            ratio={progress.ratio}
            color={statusColor[progress.status]}
            label={`${budget.category} budget used`}
          />
          <Text style={[styles.caption, { color: statusTextColor(progress.status) }]}>
            {statusText(progress.remainingSen)}
          </Text>
        </Pressable>
      ))}

      <Button label="+ Add budget" onPress={() => router.push('/budget')} />
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    caption: { ...typography.caption, color: colors.textSecondary },
    body: { ...typography.body, color: colors.textPrimary },
    total: { ...typography.title, color: colors.textPrimary },
    empty: { ...typography.body, color: colors.textSecondary },
    row: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    rowPressed: { opacity: 0.7 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  });
