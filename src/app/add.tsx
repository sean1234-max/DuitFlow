import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/ChipGroup';
import { AMOUNT_ERROR, Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { addDays, atLocalNoon, formatDay, isSameDay } from '@/dates';
import { useFinance } from '@/finance/FinanceContext';
import {
  EXPENSE_CATEGORIES,
  hasCategory,
  TRANSACTION_TYPES,
  type ExpenseCategory,
  type TransactionType,
} from '@/finance/transactions';
import { formatAmountInput, parseAmountToSen } from '@/money';
import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

const NOTE_MAX_LENGTH = 100;
const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }));

type DateStepperProps = { date: Date; onChange: (date: Date) => void };

// Day-by-day picker; future dates are blocked because transactions record what already happened.
function DateStepper({ date, onChange }: DateStepperProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const isToday = isSameDay(date, new Date());
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Date</Text>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={spacing.sm}
          onPress={() => onChange(addDays(date, -1))}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.dateText}>{isToday ? `Today · ${formatDay(date)}` : formatDay(date)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          accessibilityState={{ disabled: isToday }}
          disabled={isToday}
          hitSlop={spacing.sm}
          onPress={() => onChange(addDays(date, 1))}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? colors.border : colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function TransactionScreen() {
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const existing = transactions.find((t) => t.id === id);

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amountText, setAmountText] = useState(
    existing ? formatAmountInput(existing.amountSen) : '',
  );
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? 'Food & Drinks');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(() =>
    atLocalNoon(existing ? new Date(existing.occurredAt) : new Date()),
  );
  const [hasTriedSave, setHasTriedSave] = useState(false);

  const amountSen = parseAmountToSen(amountText);

  const handleSave = () => {
    setHasTriedSave(true);
    if (amountSen === null) return;
    const input = {
      type,
      amountSen,
      category: hasCategory(type) ? category : null,
      note: note.trim(),
      occurredAt: date.toISOString(),
    };
    if (existing) updateTransaction(existing.id, input);
    else addTransaction(input);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    confirmDestructive('Delete transaction?', 'This cannot be undone.', () => {
      deleteTransaction(existing.id);
      router.back();
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Edit transaction' : 'Add transaction' }} />
      <View style={styles.wrapper}>
        <Text style={styles.label}>Type</Text>
        <ChipGroup options={TRANSACTION_TYPES} selected={type} onSelect={setType} />
      </View>

      <Field
        label="Amount (RM)"
        value={amountText}
        onChangeText={setAmountText}
        placeholder="0.00"
        keyboardType="decimal-pad"
        isLarge
        error={hasTriedSave && amountSen === null ? AMOUNT_ERROR : null}
      />

      {hasCategory(type) && (
        <View style={styles.wrapper}>
          <Text style={styles.label}>Category</Text>
          <ChipGroup options={CATEGORY_OPTIONS} selected={category} onSelect={setCategory} />
        </View>
      )}

      <DateStepper date={date} onChange={setDate} />

      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Lunch at mamak"
        maxLength={NOTE_MAX_LENGTH}
      />

      <Button label="Save" onPress={handleSave} />
      {existing && <Button label="Delete" variant="danger" onPress={handleDelete} />}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    dateText: { ...typography.body, color: colors.textPrimary },
  });
