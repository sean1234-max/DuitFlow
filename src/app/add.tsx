import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { ChipGroup } from '@/components/ChipGroup';
import { parseAmountToSen } from '@/money';
import {
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
  type Colors,
} from '@/theme';
import {
  EXPENSE_CATEGORIES,
  TRANSACTION_TYPES,
  type ExpenseCategory,
  type TransactionType,
} from '@/transactions/model';
import { useTransactions } from '@/transactions/TransactionsContext';

const NOTE_MAX_LENGTH = 100;
const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }));

export default function AddTransactionScreen() {
  const { addTransaction } = useTransactions();
  const [type, setType] = useState<TransactionType>('expense');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Drinks');
  const [note, setNote] = useState('');
  const [hasTriedSave, setHasTriedSave] = useState(false);
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const isNoteFocused = useRef(false);

  // The note field sits near the bottom; once the keyboard is up, scroll it into view.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      if (isNoteFocused.current) scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => subscription.remove();
  }, []);

  const amountSen = parseAmountToSen(amountText);
  const showAmountError = hasTriedSave && amountSen === null;

  const handleSave = () => {
    setHasTriedSave(true);
    if (amountSen === null) return;
    addTransaction({
      type,
      amountSen,
      category: type === 'expense' ? category : null,
      note: note.trim(),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Type</Text>
        <ChipGroup options={TRANSACTION_TYPES} selected={type} onSelect={setType} />

        <Text style={styles.label}>Amount (RM)</Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
          placeholderTextColor={colors.icon}
          keyboardType="decimal-pad"
          accessibilityLabel="Amount in ringgit"
          style={[styles.input, styles.amountInput, showAmountError && styles.inputError]}
        />
        {showAmountError && (
          <Text style={styles.errorText}>Enter an amount above 0, with up to 2 decimals.</Text>
        )}

        {type === 'expense' && (
          <>
            <Text style={styles.label}>Category</Text>
            <ChipGroup
              options={CATEGORY_OPTIONS}
              selected={category}
              onSelect={setCategory}
            />
          </>
        )}

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Lunch at mamak"
          placeholderTextColor={colors.icon}
          maxLength={NOTE_MAX_LENGTH}
          onFocus={() => {
            isNoteFocused.current = true;
          }}
          onBlur={() => {
            isNoteFocused.current = false;
          }}
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Save</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { padding: spacing.lg, gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    amountInput: { ...typography.display },
    inputError: { borderColor: colors.danger },
    errorText: { ...typography.caption, color: colors.danger },
    button: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    buttonPressed: { opacity: 0.85 },
    buttonText: { ...typography.title, color: colors.textOnPrimary },
  });
