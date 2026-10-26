import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { useFinance } from '@/finance/FinanceContext';
import { GOAL_NAME_MAX_LENGTH, goalProgress, type Goal } from '@/finance/goals';
import { useT } from '@/i18n';
import { formatAmountInput, formatMYR, parseAmountToSen } from '@/money';
import { spacing, typography, useThemedStyles, type Colors } from '@/theme';

function ContributionCard({ goal }: { goal: Goal }) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const { contributeToGoal } = useFinance();
  const [amountText, setAmountText] = useState('');
  const [hasTried, setHasTried] = useState(false);
  const amountSen = parseAmountToSen(amountText);
  const { remainingSen, isComplete } = goalProgress(goal);

  const apply = (direction: 1 | -1) => {
    setHasTried(true);
    if (amountSen === null) return;
    contributeToGoal(goal.id, direction * amountSen);
    setAmountText('');
    setHasTried(false);
  };

  return (
    <Card>
      <Text style={styles.caption}>{t('savedSoFar')}</Text>
      <Text style={styles.saved}>
        {t('xOfY', { x: formatMYR(goal.savedSen), y: formatMYR(goal.targetSen) })}
      </Text>
      <Text style={styles.caption}>
        {isComplete ? t('goalReached') : t('toGo', { amount: formatMYR(remainingSen) })}
      </Text>
      <View style={styles.contribution}>
        <Field
          label={t('amountRm')}
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={hasTried && amountSen === null ? t('amountError') : null}
        />
        <Button label={t('addMoney')} onPress={() => apply(1)} />
        <Button label={t('withdraw')} variant="secondary" onPress={() => apply(-1)} />
      </View>
    </Card>
  );
}

export default function GoalScreen() {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { goals, addGoal, updateGoal, deleteGoal } = useFinance();
  const existing = goals.find((g) => g.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [targetText, setTargetText] = useState(existing ? formatAmountInput(existing.targetSen) : '');
  const [hasTriedSave, setHasTriedSave] = useState(false);

  const trimmedName = name.trim();
  const targetSen = parseAmountToSen(targetText);

  const handleSave = () => {
    setHasTriedSave(true);
    if (!trimmedName || targetSen === null) return;
    const input = { name: trimmedName, targetSen };
    if (existing) updateGoal(existing.id, input);
    else addGoal(input);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    confirmDestructive(
      t('deleteGoalTitle', { name: existing.name }),
      t('cannotUndo'),
      { confirm: t('delete'), cancel: t('cancel') },
      () => {
        deleteGoal(existing.id);
        router.back();
      },
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? existing.name : t('screenNewGoal') }} />
      {existing && <ContributionCard goal={existing} />}

      {existing && <Text style={styles.sectionTitle}>{t('goalDetails')}</Text>}
      <Field
        label={t('goalName')}
        value={name}
        onChangeText={setName}
        placeholder={t('goalNamePlaceholder')}
        maxLength={GOAL_NAME_MAX_LENGTH}
        error={hasTriedSave && !trimmedName ? t('goalNameError') : null}
      />
      <Field
        label={t('targetAmount')}
        value={targetText}
        onChangeText={setTargetText}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={hasTriedSave && targetSen === null ? t('amountError') : null}
      />

      <Button label={existing ? t('saveChanges') : t('createGoal')} onPress={handleSave} />
      {existing && <Button label={t('deleteGoal')} variant="danger" onPress={handleDelete} />}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    caption: { ...typography.caption, color: colors.textSecondary },
    saved: { ...typography.title, color: colors.textPrimary },
    contribution: { gap: spacing.sm, marginTop: spacing.sm },
    sectionTitle: { ...typography.title, color: colors.textPrimary },
  });
