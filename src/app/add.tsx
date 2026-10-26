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
  View,
} from 'react-native';

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

type ChipProps = { label: string; isSelected: boolean; onPress: () => void };

function Chip({ label, isSelected, onPress }: ChipProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.chip, isSelected && styles.chipSelected]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

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
        <View style={styles.chips} accessibilityRole="radiogroup">
          {TRANSACTION_TYPES.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              isSelected={type === option.value}
              onPress={() => setType(option.value)}
            />
          ))}
        </View>

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
            <View style={styles.chips} accessibilityRole="radiogroup">
              {EXPENSE_CATEGORIES.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  isSelected={category === option}
                  onPress={() => setCategory(option)}
                />
              ))}
            </View>
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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    chipText: { ...typography.caption, color: colors.textPrimary },
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
