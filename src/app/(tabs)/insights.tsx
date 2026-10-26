import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { addMonths } from '@/dates';
import { useFinance } from '@/finance/FinanceContext';
import { monthTransactions, spendingByCategory } from '@/finance/insights';
import { summarize } from '@/finance/transactions';
import { useCategoryLabel, useDateFormat, useT, type Translate } from '@/i18n';
import { formatMYR } from '@/money';
import { spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

function spendingChangeText(t: Translate, currentSen: number, previousSen: number): string {
  if (previousSen === 0) return t('noSpendingLastMonth');
  const change = (currentSen - previousSen) / previousSen;
  if (change === 0) return t('sameAsLastMonth');
  const percent = formatPercent(Math.abs(change));
  return change > 0 ? t('moreThanLastMonth', { percent }) : t('lessThanLastMonth', { percent });
}

export default function InsightsScreen() {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const { formatMonth } = useDateFormat();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { transactions } = useFinance();
  const [monthOffset, setMonthOffset] = useState(0);

  const month = addMonths(new Date(), monthOffset);
  const current = monthTransactions(transactions, month);
  const { incomeSen, spendingSen, netSen } = summarize(current);
  const previousSpendingSen = summarize(
    monthTransactions(transactions, addMonths(month, -1)),
  ).spendingSen;
  const categories = spendingByCategory(current);
  const isCurrentMonth = monthOffset === 0;

  return (
    <Screen>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('previousMonth')}
          hitSlop={spacing.sm}
          onPress={() => setMonthOffset((m) => m - 1)}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.monthText} accessibilityRole="header">
          {formatMonth(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nextMonth')}
          accessibilityState={{ disabled: isCurrentMonth }}
          disabled={isCurrentMonth}
          hitSlop={spacing.sm}
          onPress={() => setMonthOffset((m) => m + 1)}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isCurrentMonth ? colors.border : colors.textPrimary}
          />
        </Pressable>
      </View>

      <Card>
        <View style={styles.statRow}>
          <Text style={styles.caption}>{t('income')}</Text>
          <Text style={styles.statValue}>{formatMYR(incomeSen)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.caption}>{t('spending')}</Text>
          <Text style={styles.statValue}>{formatMYR(spendingSen)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.caption}>{t('net')}</Text>
          <Text style={[styles.statValue, netSen < 0 && styles.negative]}>{formatMYR(netSen)}</Text>
        </View>
        <Text style={styles.caption}>{spendingChangeText(t, spendingSen, previousSpendingSen)}</Text>
      </Card>

      <Text style={styles.sectionTitle}>{t('whereMoneyWent')}</Text>
      {categories.length === 0 ? (
        <Text style={styles.empty}>{t('noSpendingThisMonth')}</Text>
      ) : (
        <Card>
          {categories.map(({ category, spentSen, share }) => {
            const label = categoryLabel(category);
            return (
              <View key={category} style={styles.categoryRow}>
                <View style={styles.statRow}>
                  <Text style={styles.body}>{label}</Text>
                  <Text style={styles.body}>
                    {t('percentOfTotal', { amount: formatMYR(spentSen), percent: formatPercent(share) })}
                  </Text>
                </View>
                <ProgressBar
                  ratio={share}
                  color={colors.accent}
                  label={t('shareOfSpending', { category: label, percent: formatPercent(share) })}
                />
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthText: { ...typography.title, color: colors.textPrimary },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    statValue: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    negative: { color: colors.danger },
    caption: { ...typography.caption, color: colors.textSecondary },
    body: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
    sectionTitle: { ...typography.title, color: colors.textPrimary },
    empty: { ...typography.body, color: colors.textSecondary },
    categoryRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  });
