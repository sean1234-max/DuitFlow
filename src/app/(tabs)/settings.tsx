import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/ChipGroup';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { useFinance, type SyncState } from '@/finance/FinanceContext';
import { spacing, typography, useThemedStyles, type Colors } from '@/theme';
import { useThemePreference, type ThemePreference } from '@/themePreference';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const SYNC_LABELS: Record<SyncState, string> = {
  local: 'Saved on this phone only',
  syncing: 'Syncing…',
  synced: 'All changes backed up',
  error: 'Some changes are not backed up yet',
};

function AccountSection() {
  const styles = useThemedStyles(createStyles);
  const { isConfigured, session, signOut } = useAuth();
  const { syncState, syncError, syncNow } = useFinance();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (!isConfigured) {
    return (
      <Card>
        <Text style={styles.body}>Cloud backup is not set up yet.</Text>
        <Text style={styles.caption}>Your records are saved on this phone.</Text>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <Text style={styles.body}>{SYNC_LABELS.local}</Text>
        <Text style={styles.caption}>Sign in to back up your records and sync between phones.</Text>
        <Button label="Sign in or create account" onPress={() => router.push('/account')} />
      </Card>
    );
  }

  const handleSignOut = () =>
    confirmDestructive(
      'Sign out?',
      'Your records stay in your account and are removed from this phone.',
      () => {
        signOut().then(({ error }) => setSignOutError(error));
      },
    );

  return (
    <Card>
      <Text style={styles.caption}>Signed in as</Text>
      <Text style={styles.body}>{session.user.email}</Text>
      <Text style={[styles.caption, syncState === 'error' && styles.error]}>
        {SYNC_LABELS[syncState]}
        {syncState === 'error' && syncError ? ` (${syncError})` : ''}
      </Text>
      {syncState === 'error' && <Button label="Sync now" variant="secondary" onPress={syncNow} />}
      <Button label="Sign out" variant="danger" onPress={handleSignOut} />
      {signOutError && <Text style={styles.error}>{signOutError}</Text>}
    </Card>
  );
}

export default function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useThemePreference();
  return (
    <Screen>
      <Text style={styles.label}>Account & backup</Text>
      <AccountSection />

      <Text style={[styles.label, styles.spaced]}>Appearance</Text>
      <ChipGroup options={APPEARANCE_OPTIONS} selected={preference} onSelect={setPreference} />
      <Text style={styles.caption}>System follows your phone&apos;s light/dark setting.</Text>
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    label: { ...typography.caption, color: colors.textSecondary },
    spaced: { marginTop: spacing.md },
    caption: { ...typography.caption, color: colors.textSecondary },
    body: { ...typography.body, color: colors.textPrimary },
    error: { color: colors.danger },
  });
