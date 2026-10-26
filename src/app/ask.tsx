import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { useLanguage, useT, type Translate } from '@/i18n';
import { supabase } from '@/supabase';
import { radius, spacing, typography, useThemedStyles, type Colors } from '@/theme';

type Turn = { role: 'user' | 'assistant'; content: string };

const QUESTION_MAX_LENGTH = 500;
const HISTORY_SENT = 6; // matches the Edge Function's limit
const DAILY_LIMIT = 20;

// Turns the function's error code into a message in the user's language.
async function errorText(t: Translate, error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context;
  const body = context ? await context.json().catch(() => null) : null;
  if (body?.error === 'limit') return t('askLimitReached', { n: body.limit ?? DAILY_LIMIT });
  const detail = body?.error ?? (error instanceof Error ? error.message : 'unknown');
  return t('askFailed', { error: String(detail) });
}

export default function AskScreen() {
  const t = useT();
  const { language } = useLanguage();
  const styles = useThemedStyles(createStyles);
  const { session } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase || !session) {
    return (
      <Screen>
        <Text style={styles.body}>{t('askSignInRequired')}</Text>
        <Button label={t('signInOrCreate')} onPress={() => router.replace('/account')} />
      </Screen>
    );
  }
  const client = supabase;

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isAsking) return;
    setError(null);
    setIsAsking(true);
    setQuestion('');
    const history = turns.slice(-HISTORY_SENT);
    setTurns((current) => [...current, { role: 'user', content: trimmed }]);
    const { data, error: invokeError } = await client.functions.invoke<{ answer: string }>('ask', {
      body: { question: trimmed, history, language },
    });
    setIsAsking(false);
    if (invokeError || !data?.answer) {
      setTurns((current) => current.slice(0, -1)); // let them retry the same question
      setQuestion(trimmed);
      setError(await errorText(t, invokeError));
      return;
    }
    setTurns((current) => [...current, { role: 'assistant', content: data.answer }]);
  };

  const suggestions = [t('askSuggestion1'), t('askSuggestion2'), t('askSuggestion3')];

  return (
    <Screen>
      <Text style={styles.caption}>{t('askIntro')}</Text>

      {turns.length === 0 &&
        suggestions.map((s) => <Button key={s} label={s} variant="secondary" onPress={() => ask(s)} />)}

      {turns.map((turn, index) => (
        <View
          key={index}
          style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.aiBubble]}
          accessibilityLabel={`${turn.role === 'user' ? t('you') : t('assistant')}: ${turn.content}`}
        >
          <Text style={styles.speaker}>{turn.role === 'user' ? t('you') : t('assistant')}</Text>
          <Text style={styles.body} selectable>
            {turn.content}
          </Text>
        </View>
      ))}

      {isAsking && (
        <Text style={styles.caption} accessibilityLiveRegion="polite">
          {t('thinking')}
        </Text>
      )}
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <Field
        label={t('ask')}
        value={question}
        onChangeText={setQuestion}
        placeholder={t('askPlaceholder')}
        maxLength={QUESTION_MAX_LENGTH}
        multiline
        onSubmitEditing={() => ask(question)}
      />
      <Button label={isAsking ? t('thinking') : t('ask')} onPress={() => ask(question)} />
      <Text style={styles.caption}>{t('askDisclaimer')}</Text>
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    caption: { ...typography.caption, color: colors.textSecondary },
    body: { ...typography.body, color: colors.textPrimary },
    error: { ...typography.caption, color: colors.danger },
    speaker: { ...typography.caption, color: colors.textSecondary },
    bubble: { padding: spacing.md, borderRadius: radius.md, gap: spacing.xs },
    userBubble: { backgroundColor: colors.primaryTint, marginLeft: spacing.xl },
    aiBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.xl,
    },
  });
