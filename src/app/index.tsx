import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMYR } from '@/money';
import { brand, colors, radius, spacing, typography } from '@/theme';
import {
  isSameMonth,
  signedAmountSen,
  summarize,
  TRANSACTION_TYPES,
  type Transaction,
} from '@/transactions/model';
import { useTransactions } from '@/transactions/TransactionsContext';

const typeLabel = (t: Transaction) =>
  TRANSACTION_TYPES.find((option) => option.value === t.type)?.label ?? t.type;

function SummaryCard({ transactions }: { transactions: readonly Transaction[] }) {
  const now = new Date();
  const { incomeSen, spendingSen, netSen } = summarize(
    transactions.filter((t) => isSameMonth(t.occurredAt, now)),
  );
  return (
    <View style={styles.card}>
      <Text style={styles.caption}>This month</Text>
      <Text style={styles.balance}>{formatMYR(netSen)}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.caption}>Income {formatMYR(incomeSen)}</Text>
        <Text style={styles.caption}>Spending {formatMYR(spendingSen)}</Text>
      </View>
    </View>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const signed = signedAmountSen(transaction);
  const date = new Date(transaction.occurredAt).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
  });
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>
          {transaction.category ?? typeLabel(transaction)}
        </Text>
        <Text style={styles.caption} numberOfLines={1}>
          {[date, transaction.note].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={[styles.rowAmount, signed < 0 && styles.rowAmountOut]}>
        {formatMYR(signed)}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { transactions } = useTransactions();
  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.slogan}>{brand.slogan}</Text>
            <SummaryCard transactions={transactions} />
            <Text style={styles.sectionTitle}>Transactions</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions yet. Add your first one below.</Text>
        }
        renderItem={({ item }) => <TransactionRow transaction={item} />}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/add')}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>+ Add transaction</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  slogan: { ...typography.body, color: colors.textSecondary },
  card: {
    marginVertical: spacing.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caption: { ...typography.caption, color: colors.textSecondary },
  balance: { ...typography.display, color: colors.textPrimary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { ...typography.title, color: colors.textPrimary },
  empty: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: colors.textPrimary },
  rowAmount: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  rowAmountOut: { color: colors.danger },
  button: {
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { ...typography.title, color: colors.textOnPrimary },
});
