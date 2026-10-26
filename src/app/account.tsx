import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/ChipGroup';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { spacing, typography, useThemedStyles, type Colors } from '@/theme';

type Mode = 'signIn' | 'signUp';

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'signIn', label: 'Sign in' },
  { value: 'signUp', label: 'Create account' },
];
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountScreen() {
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
  const emailError = EMAIL_PATTERN.test(trimmedEmail) ? null : 'Enter a valid email address.';
  const passwordError =
    password.length >= MIN_PASSWORD_LENGTH
      ? null
      : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

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
      setServerError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setNotice(`We sent a confirmation link to ${trimmedEmail}. Open it, then sign in here.`);
      setMode('signIn');
      return;
    }
    router.back();
  };

  const submitLabel = isSubmitting ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account';

  return (
    <Screen>
      <Text style={styles.intro}>
        Sign in to back up your records and use DuitFlow on more than one phone. Anything you
        recorded before signing in will be added to your account.
      </Text>
      <ChipGroup options={MODE_OPTIONS} selected={mode} onSelect={setMode} />
      <Field
        label="Email"
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
        label="Password"
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
    notice: { padding: spacing.md, borderRadius: 12, backgroundColor: colors.primaryTint },
    noticeText: { ...typography.body, color: colors.textPrimary },
  });
