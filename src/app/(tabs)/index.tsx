import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useFinance } from '@/finance/FinanceContext';
import { forecastMonthEnd, monthTransactions } from '@/finance/insights';
import { signedAmountSen, summarize, typeLabelKey, type Transaction } from '@/finance/transactions';
import { useCategoryLabel, useDateFormat, useLanguage, useT } from '@/i18n';
import { formatMYR } from '@/money';
import { brand, radius, spacing, typography, useThemedStyles, type Colors } from '@/theme';

function SummaryCard({ transactions }: { transactions: readonly Transaction[] }) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const { incomeSen, spendingSen, netSen } = summarize(monthTransactions(transactions, new Date()));
  return (
    <Card>
      <Text style={styles.caption}>{t('thisMonth')}</Text>
      <Text style={styles.balance}>{formatMYR(netSen)}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.caption}>{t('incomeAmount', { amount: formatMYR(incomeSen) })}</Text>
        <Text style={styles.caption}>{t('spendingAmount', { amount: formatMYR(spendingSen) })}</Text>
      </View>
    </Card>
  );
}

function ForecastCard({ transactions }: { transactions: readonly Transaction[] }) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const forecast = forecastMonthEnd(transactions, new Date());
  return (
    <Card>
      <Text style={styles.caption}>{t('monthEndEstimate')}</Text>
      <Text style={[styles.forecastValue, forecast.projectedNetSen < 0 && styles.negative]}>
        {formatMYR(forecast.projectedNetSen)}
      </Text>
      <Text style={styles.caption}>
        {t('forecastExplain', {
          amount: formatMYR(forecast.projectedSpendingSen),
          days: forecast.daysLeft,
        })}
      </Text>
      {!forecast.isReliable && <Text style={styles.caption}>{t('forecastEarly')}</Text>}
    </Card>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const { formatShortDay } = useDateFormat();
  const styles = useThemedStyles(createStyles);
  const signed = signedAmountSen(transaction);
  const name = transaction.category ? categoryLabel(transaction.category) : t(typeLabelKey(transaction.type));
  const title = transaction.type === 'refund' && transaction.category ? t('refundSuffix', { category: name }) : name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('editTransactionHint')}
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
  const t = useT();
  const { language } = useLanguage();
  const styles = useThemedStyles(createStyles);
  const { transactions } = useFinance();
  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.slogan}>{language === 'zh' ? brand.sloganZh : brand.slogan}</Text>
            <SummaryCard transactions={transactions} />
            <ForecastCard transactions={transactions} />
            <Button label={t('askAiButton')} variant="secondary" onPress={() => router.push('/ask')} />
            <Text style={styles.sectionTitle}>{t('transactions')}</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{t('noTransactions')}</Text>}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
      />
      <View style={styles.footer}>
        <Button label={t('addTransactionButton')} onPress={() => router.push('/add')} />
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
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
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
