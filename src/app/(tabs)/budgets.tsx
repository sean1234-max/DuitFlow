import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { budgetProgress, type BudgetStatus } from '@/finance/budgets';
import { allCategories } from '@/finance/categories';
import { useFinance } from '@/finance/FinanceContext';
import { monthTransactions, spendingByCategory } from '@/finance/insights';
import { useCategoryLabel, useT } from '@/i18n';
import { formatMYR } from '@/money';
import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

export default function BudgetsScreen() {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { budgets, transactions, categories } = useFinance();

  const order = allCategories(categories);
  const spentByCategory = new Map(
    spendingByCategory(monthTransactions(transactions, new Date())).map((c) => [c.category, c.spentSen]),
  );
  const rows = [...budgets]
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
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
    remainingSen >= 0
      ? t('left', { amount: formatMYR(remainingSen) })
      : t('over', { amount: formatMYR(-remainingSen) });

  return (
    <Screen>
      <Text style={styles.caption}>{t('budgetsIntro')}</Text>

      {rows.length > 0 && (
        <Card>
          <Text style={styles.caption}>{t('totalThisMonth')}</Text>
          <Text style={styles.total}>
            {t('xOfY', { x: formatMYR(totalProgress.spentSen), y: formatMYR(totalLimit) })}
          </Text>
          <ProgressBar
            ratio={totalProgress.ratio}
            color={statusColor[totalProgress.status]}
            label={t('totalBudgetUsed')}
          />
          <Text style={[styles.caption, { color: statusTextColor(totalProgress.status) }]}>
            {statusText(totalProgress.remainingSen)}
          </Text>
        </Card>
      )}

      {rows.length === 0 && <Text style={styles.empty}>{t('noBudgets')}</Text>}

      {rows.map(({ budget, progress }) => {
        const label = categoryLabel(budget.category);
        return (
          <Pressable
            key={budget.category}
            accessibilityRole="button"
            accessibilityHint={t('editBudgetHint')}
            onPress={() => router.push({ pathname: '/budget', params: { category: budget.category } })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.body}>{label}</Text>
              <Text style={styles.caption}>
                {formatMYR(progress.spentSen)} / {formatMYR(budget.limitSen)}
              </Text>
            </View>
            <ProgressBar
              ratio={progress.ratio}
              color={statusColor[progress.status]}
              label={t('budgetUsed', { category: label })}
            />
            <Text style={[styles.caption, { color: statusTextColor(progress.status) }]}>
              {statusText(progress.remainingSen)}
            </Text>
          </Pressable>
        );
      })}

      <Button label={t('addBudgetButton')} onPress={() => router.push('/budget')} />
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    caption: { ...typography.caption, color: colors.textSecondary },
    body: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
    total: { ...typography.title, color: colors.textPrimary },
    empty: { ...typography.body, color: colors.textSecondary },
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
