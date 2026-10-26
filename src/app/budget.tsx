import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { useFinance } from '@/finance/FinanceContext';
import type { Category } from '@/finance/transactions';
import { useCategoryLabel, useT } from '@/i18n';
import { formatAmountInput, parseAmountToSen } from '@/money';
import { typography, useThemedStyles, type Colors } from '@/theme';

export default function BudgetScreen() {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ category?: string }>();
  const { budgets, setBudget, removeBudget } = useFinance();
  const editing = budgets.find((b) => b.category === params.category);

  const [category, setCategory] = useState<Category>(editing?.category ?? 'Food & Drinks');
  const [amountText, setAmountText] = useState(editing ? formatAmountInput(editing.limitSen) : '');
  const [hasTriedSave, setHasTriedSave] = useState(false);

  const limitSen = parseAmountToSen(amountText);
  const isReplacing = !editing && budgets.some((b) => b.category === category);

  const handleSave = () => {
    setHasTriedSave(true);
    if (limitSen === null) return;
    setBudget(category, limitSen);
    router.back();
  };

  const handleDelete = () => {
    if (!editing) return;
    confirmDestructive(
      t('removeBudgetTitle', { category: categoryLabel(editing.category) }),
      t('removeBudgetMessage'),
      { confirm: t('removeBudget'), cancel: t('cancel') },
      () => {
        removeBudget(editing.category);
        router.back();
      },
    );
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: editing
            ? t('screenBudget', { category: categoryLabel(editing.category) })
            : t('screenAddBudget'),
        }}
      />
      {!editing && <CategoryPicker selected={category} onSelect={setCategory} />}
      {isReplacing && (
        <Text style={styles.caption}>{t('replaceBudget', { category: categoryLabel(category) })}</Text>
      )}

      <Field
        label={t('monthlyLimit')}
        value={amountText}
        onChangeText={setAmountText}
        placeholder="0.00"
        keyboardType="decimal-pad"
        isLarge
        error={hasTriedSave && limitSen === null ? t('amountError') : null}
      />

      <Button label={t('save')} onPress={handleSave} />
      {editing && <Button label={t('removeBudget')} variant="danger" onPress={handleDelete} />}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    caption: { ...typography.caption, color: colors.textSecondary },
  });
