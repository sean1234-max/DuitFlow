import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { formatShortDay } from '@/dates';
import { useFinance } from '@/finance/FinanceContext';
import { forecastMonthEnd, monthTransactions } from '@/finance/insights';
import { signedAmountSen, summarize, typeLabel, type Transaction } from '@/finance/transactions';
import { formatMYR } from '@/money';
import { brand, radius, spacing, typography, useThemedStyles, type Colors } from '@/theme';

function SummaryCard({ transactions }: { transactions: readonly Transaction[] }) {
  const styles = useThemedStyles(createStyles);
  const { incomeSen, spendingSen, netSen } = summarize(monthTransactions(transactions, new Date()));
  return (
    <Card>
      <Text style={styles.caption}>This month</Text>
      <Text style={styles.balance}>{formatMYR(netSen)}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.caption}>Income {formatMYR(incomeSen)}</Text>
        <Text style={styles.caption}>Spending {formatMYR(spendingSen)}</Text>
      </View>
    </Card>
  );
}

function ForecastCard({ transactions }: { transactions: readonly Transaction[] }) {
  const styles = useThemedStyles(createStyles);
  const forecast = forecastMonthEnd(transactions, new Date());
  const isNegative = forecast.projectedNetSen < 0;
  return (
    <Card>
      <Text style={styles.caption}>Month-end estimate</Text>
      <Text style={[styles.forecastValue, isNegative && styles.negative]}>
        {formatMYR(forecast.projectedNetSen)}
      </Text>
      <Text style={styles.caption}>
        If you keep spending like this, about {formatMYR(forecast.projectedSpendingSen)} in total
        this month ({forecast.daysLeft} days left). Future income is not included.
      </Text>
      {!forecast.isReliable && (
        <Text style={styles.caption}>Early in the month, so this estimate may change a lot.</Text>
      )}
    </Card>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const styles = useThemedStyles(createStyles);
  const signed = signedAmountSen(transaction);
  const title = transaction.category
    ? `${transaction.category}${transaction.type === 'refund' ? ' (refund)' : ''}`
    : typeLabel(transaction.type);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Edit or delete this transaction"
      onPress={() => router.push({ pathname: '/add', params: { id: transaction.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.caption} numberOfLines={1}>
          {[formatShortDay(transaction.occurredAt), transaction.note].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={[styles.rowAmount, signed < 0 && styles.negative]}>{formatMYR(signed)}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const { transactions } = useFinance();
  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.slogan}>{brand.slogan}</Text>
            <SummaryCard transactions={transactions} />
            <ForecastCard transactions={transactions} />
            <Text style={styles.sectionTitle}>Transactions</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions yet. Add your first one below.</Text>
        }
        renderItem={({ item }) => <TransactionRow transaction={item} />}
      />
      <View style={styles.footer}>
        <Button label="+ Add transaction" onPress={() => router.push('/add')} />
      </View>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing.lg, gap: spacing.sm },
    header: { gap: spacing.md, marginBottom: spacing.sm },
    slogan: { ...typography.body, color: colors.textSecondary },
    caption: { ...typography.caption, color: colors.textSecondary },
    balance: { ...typography.display, color: colors.textPrimary },
    forecastValue: { ...typography.title, color: colors.textPrimary },
    negative: { color: colors.danger },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    sectionTitle: { ...typography.title, color: colors.textPrimary, marginTop: spacing.sm },
    empty: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.lg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    rowPressed: { opacity: 0.7 },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...typography.body, color: colors.textPrimary },
    rowAmount: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    footer: { padding: spacing.lg, paddingTop: spacing.sm },
  });
