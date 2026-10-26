import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CategoryPicker } from '@/components/CategoryPicker';
import { ChipGroup } from '@/components/ChipGroup';
import { DateField } from '@/components/DateField';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { atLocalNoon } from '@/dates';
import { parseBankMessage } from '@/finance/bankMessage';
import { useFinance } from '@/finance/FinanceContext';
import { hasCategory, TRANSACTION_TYPES, type Category, type TransactionType } from '@/finance/transactions';
import { useT } from '@/i18n';
import { formatAmountInput, parseAmountToSen } from '@/money';
import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

const NOTE_MAX_LENGTH = 100;
const MESSAGE_MAX_LENGTH = 1000;

type MessageFill = { type: TransactionType; amountText: string; note: string };

// Paste a bank SMS / notification and pre-fill the form from it.
function MessageFiller({ onFill }: { onFill: (fill: MessageFill) => void }) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'filled' | 'failed'>('idle');

  if (!isOpen) {
    return <Button label={t('fillFromMessage')} variant="secondary" onPress={() => setIsOpen(true)} />;
  }

  const handleFill = () => {
    const parsed = parseBankMessage(text);
    if (!parsed) return setStatus('failed');
    onFill({ type: parsed.type, amountText: formatAmountInput(parsed.amountSen), note: parsed.note });
    setStatus('filled');
  };

  return (
    <View style={styles.panel}>
      <Field
        label={t('fillFromMessage')}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setStatus('idle');
        }}
        placeholder={t('pasteMessagePlaceholder')}
        multiline
        maxLength={MESSAGE_MAX_LENGTH}
        style={styles.messageInput}
        error={status === 'failed' ? t('messageNoAmount') : null}
      />
      {status === 'filled' && (
        <Text style={styles.notice} accessibilityRole="alert">
          {t('messageFilled')}
        </Text>
      )}
      <Button label={t('fillForm')} variant="secondary" onPress={handleFill} />
    </View>
  );
}

export default function TransactionScreen() {
  const t = useT();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { transactions, addTransaction, updateTransaction, deleteTransaction, addRecurring } =
    useFinance();
  const existing = transactions.find((tx) => tx.id === id);

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amountText, setAmountText] = useState(
    existing ? formatAmountInput(existing.amountSen) : '',
  );
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Food & Drinks');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(() =>
    atLocalNoon(existing ? new Date(existing.occurredAt) : new Date()),
  );
  const [isRepeating, setIsRepeating] = useState(false);
  const [hasTriedSave, setHasTriedSave] = useState(false);

  const amountSen = parseAmountToSen(amountText);
  const typeOptions = TRANSACTION_TYPES.map((o) => ({ value: o.value, label: t(o.labelKey) }));

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
    // A repeating rule creates this month's transaction itself (and every month after).
    else if (isRepeating)
      addRecurring({ ...input, dayOfMonth: date.getDate(), startDate: input.occurredAt });
    else addTransaction(input);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    confirmDestructive(
      t('deleteTransactionTitle'),
      t('cannotUndo'),
      { confirm: t('delete'), cancel: t('cancel') },
      () => {
        deleteTransaction(existing.id);
        router.back();
      },
    );
  };

  const handleFill = (fill: MessageFill) => {
    setType(fill.type);
    setAmountText(fill.amountText);
    if (fill.note) setNote(fill.note);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{ title: existing ? t('screenEditTransaction') : t('screenAddTransaction') }}
      />
      {!existing && <MessageFiller onFill={handleFill} />}

      <View style={styles.wrapper}>
        <Text style={styles.label}>{t('type')}</Text>
        <ChipGroup options={typeOptions} selected={type} onSelect={setType} />
      </View>

      <Field
        label={t('amountRm')}
        value={amountText}
        onChangeText={setAmountText}
        placeholder="0.00"
        keyboardType="decimal-pad"
        isLarge
        error={hasTriedSave && amountSen === null ? t('amountError') : null}
      />

      {hasCategory(type) && <CategoryPicker selected={category} onSelect={setCategory} />}

      <DateField date={date} onChange={setDate} />

      <Field
        label={t('note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('notePlaceholder')}
        maxLength={NOTE_MAX_LENGTH}
      />

      {!existing && (
        <View style={styles.panel}>
          <View style={styles.switchRow}>
            <Text style={styles.body}>{t('repeatMonthly')}</Text>
            <Switch
              accessibilityLabel={t('repeatMonthly')}
              value={isRepeating}
              onValueChange={setIsRepeating}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          {isRepeating && (
            <Text style={styles.label}>{t('repeatOnDay', { day: date.getDate() })}</Text>
          )}
        </View>
      )}

      <Button label={t('save')} onPress={handleSave} />
      {existing && <Button label={t('delete')} variant="danger" onPress={handleDelete} />}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary },
    body: { ...typography.body, color: colors.textPrimary, flex: 1 },
    panel: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    messageInput: { minHeight: 96, textAlignVertical: 'top' },
    notice: { ...typography.caption, color: colors.textPrimary },
  });
