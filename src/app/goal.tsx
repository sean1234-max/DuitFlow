import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AMOUNT_ERROR, Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { useFinance } from '@/finance/FinanceContext';
import { GOAL_NAME_MAX_LENGTH, goalProgress, type Goal } from '@/finance/goals';
import { formatAmountInput, formatMYR, parseAmountToSen } from '@/money';
import { spacing, typography, useThemedStyles, type Colors } from '@/theme';

function ContributionCard({ goal }: { goal: Goal }) {
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
      <Text style={styles.caption}>Saved so far</Text>
      <Text style={styles.saved}>
        {formatMYR(goal.savedSen)} of {formatMYR(goal.targetSen)}
      </Text>
      <Text style={styles.caption}>
        {isComplete ? 'Goal reached 🎉' : `${formatMYR(remainingSen)} to go`}
      </Text>
      <View style={styles.contribution}>
        <Field
          label="Amount (RM)"
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={hasTried && amountSen === null ? AMOUNT_ERROR : null}
        />
        <Button label="Add money" onPress={() => apply(1)} />
        <Button label="Withdraw" variant="secondary" onPress={() => apply(-1)} />
      </View>
    </Card>
  );
}

export default function GoalScreen() {
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
    confirmDestructive(`Delete "${existing.name}"?`, 'This cannot be undone.', () => {
      deleteGoal(existing.id);
      router.back();
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? existing.name : 'New goal' }} />
      {existing && <ContributionCard goal={existing} />}

      {existing && <Text style={styles.sectionTitle}>Goal details</Text>}
      <Field
        label="Goal name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Emergency fund"
        maxLength={GOAL_NAME_MAX_LENGTH}
        error={hasTriedSave && !trimmedName ? 'Give your goal a name.' : null}
      />
      <Field
        label="Target amount (RM)"
        value={targetText}
        onChangeText={setTargetText}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={hasTriedSave && targetSen === null ? AMOUNT_ERROR : null}
      />

      <Button label={existing ? 'Save changes' : 'Create goal'} onPress={handleSave} />
      {existing && <Button label="Delete goal" variant="danger" onPress={handleDelete} />}
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
