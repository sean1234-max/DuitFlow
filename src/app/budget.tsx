import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/ChipGroup';
import { AMOUNT_ERROR, Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { useFinance } from '@/finance/FinanceContext';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/finance/transactions';
import { formatAmountInput, parseAmountToSen } from '@/money';
import { spacing, typography, useThemedStyles, type Colors } from '@/theme';

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }));

export default function BudgetScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ category?: string }>();
  const { budgets, setBudget, removeBudget } = useFinance();
  const editing = budgets.find((b) => b.category === params.category);

  const [category, setCategory] = useState<ExpenseCategory>(editing?.category ?? 'Food & Drinks');
  const [amountText, setAmountText] = useState(editing ? formatAmountInput(editing.limitSen) : '');
  const [hasTriedSave, setHasTriedSave] = useState(false);

  const limitSen = parseAmountToSen(amountText);
  const replacing = !editing && budgets.find((b) => b.category === category);

  const handleSave = () => {
    setHasTriedSave(true);
    if (limitSen === null) return;
    setBudget(category, limitSen);
    router.back();
  };

  const handleDelete = () => {
    if (!editing) return;
    confirmDestructive(`Remove ${editing.category} budget?`, 'Your transactions are not affected.', () => {
      removeBudget(editing.category);
      router.back();
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: editing ? `${editing.category} budget` : 'Add budget' }} />
      {!editing && (
        <View style={styles.wrapper}>
          <Text style={styles.label}>Category</Text>
          <ChipGroup options={CATEGORY_OPTIONS} selected={category} onSelect={setCategory} />
          {replacing && (
            <Text style={styles.label}>
              {category} already has a budget; saving will replace it.
            </Text>
          )}
        </View>
      )}

      <Field
        label="Monthly limit (RM)"
        value={amountText}
        onChangeText={setAmountText}
        placeholder="0.00"
        keyboardType="decimal-pad"
        isLarge
        error={hasTriedSave && limitSen === null ? AMOUNT_ERROR : null}
      />

      <Button label="Save" onPress={handleSave} />
      {editing && <Button label="Remove budget" variant="danger" onPress={handleDelete} />}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary },
  });
