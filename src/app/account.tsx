import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NOT_CONFIGURED_ERROR, useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/ChipGroup';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { useT } from '@/i18n';
import { radius, spacing, typography, useThemedStyles, type Colors } from '@/theme';

type Mode = 'signIn' | 'signUp';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountScreen() {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasTried, setHasTried] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const emailError = EMAIL_PATTERN.test(trimmedEmail) ? null : t('emailError');
  const passwordError =
    password.length >= MIN_PASSWORD_LENGTH ? null : t('passwordError', { n: MIN_PASSWORD_LENGTH });

  const handleSubmit = async () => {
    setHasTried(true);
    setServerError(null);
    setNotice(null);
    if (emailError || passwordError || isSubmitting) return;
    setIsSubmitting(true);
    const result =
      mode === 'signIn' ? await signIn(trimmedEmail, password) : await signUp(trimmedEmail, password);
    setIsSubmitting(false);
    if (result.error) {
      // Supabase's own messages are shown as-is (English); ours are translated.
      setServerError(result.error === NOT_CONFIGURED_ERROR ? t('notConfigured') : result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setNotice(t('confirmEmailSent', { email: trimmedEmail }));
      setMode('signIn');
      return;
    }
    router.back();
  };

  const submitLabel = isSubmitting ? t('pleaseWait') : mode === 'signIn' ? t('signIn') : t('createAccount');

  return (
    <Screen>
      <Text style={styles.intro}>{t('accountIntro')}</Text>
      <ChipGroup
        options={[
          { value: 'signIn' as const, label: t('signIn') },
          { value: 'signUp' as const, label: t('createAccount') },
        ]}
        selected={mode}
        onSelect={setMode}
      />
      <Field
        label={t('email')}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={hasTried ? emailError : null}
      />
      <Field
        label={t('password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
        textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
        error={hasTried ? passwordError : null}
      />
      {serverError && (
        <Text style={styles.error} accessibilityRole="alert">
          {serverError}
        </Text>
      )}
      {notice && (
        <View style={styles.notice} accessibilityRole="alert">
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
      <Button label={submitLabel} onPress={handleSubmit} />
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    intro: { ...typography.body, color: colors.textSecondary },
    error: { ...typography.caption, color: colors.danger },
    notice: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryTint },
    noticeText: { ...typography.body, color: colors.textPrimary },
  });
