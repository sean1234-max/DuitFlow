import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/ChipGroup';
import { Screen } from '@/components/Screen';
import { confirmDestructive } from '@/confirm';
import { exportTransactionsCsv } from '@/exportCsv';
import { useFinance, type SyncState } from '@/finance/FinanceContext';
import type { Recurring } from '@/finance/recurring';
import { typeLabelKey } from '@/finance/transactions';
import { useCategoryLabel, useLanguage, useT, type LanguagePreference, type TranslationKey } from '@/i18n';
import { formatMYR } from '@/money';
import { brand, radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';
import { useThemePreference, type ThemePreference } from '@/themePreference';

const SYNC_LABEL_KEYS: Record<SyncState, TranslationKey> = {
  local: 'syncLocal',
  syncing: 'syncSyncing',
  synced: 'syncSynced',
  error: 'syncError',
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

type RowProps = { title: string; subtitle?: string; actionLabel: string; onPress: () => void };

// A list row with a trailing delete icon.
function DeletableRow({ title, subtitle, actionLabel, onPress }: RowProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${actionLabel}: ${title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.body}>{title}</Text>
        {subtitle ? <Text style={styles.caption}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="trash-outline" size={20} color={colors.danger} />
    </Pressable>
  );
}

function AccountSection() {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const { isConfigured, session, signOut, deleteAccount } = useAuth();
  const { syncState, syncError, syncNow } = useFinance();
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isConfigured) {
    return (
      <Card>
        <Text style={styles.body}>{t('backupNotSetUp')}</Text>
        <Text style={styles.caption}>{t('savedOnPhone')}</Text>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <Text style={styles.body}>{t('syncLocal')}</Text>
        <Text style={styles.caption}>{t('signInPrompt')}</Text>
        <Button label={t('signInOrCreate')} onPress={() => router.push('/account')} />
      </Card>
    );
  }

  const handleSignOut = () =>
    confirmDestructive(t('signOutTitle'), t('signOutMessage'), { confirm: t('signOut'), cancel: t('cancel') }, () => {
      signOut().then(({ error }) => setActionError(error));
    });

  const handleDeleteAccount = () =>
    confirmDestructive(
      t('deleteAccountTitle'),
      t('deleteAccountMessage'),
      { confirm: t('deleteAccount'), cancel: t('cancel') },
      () => {
        deleteAccount().then(({ error }) =>
          setActionError(error ? t('deleteAccountFailed', { error }) : null),
        );
      },
    );

  return (
    <Card>
      <Text style={styles.caption}>{t('signedInAs')}</Text>
      <Text style={styles.body}>{session.user.email}</Text>
      <Text style={[styles.caption, syncState === 'error' && styles.error]}>
        {t(SYNC_LABEL_KEYS[syncState])}
        {syncState === 'error' && syncError ? ` (${syncError})` : ''}
      </Text>
      {syncState === 'error' && <Button label={t('syncNow')} variant="secondary" onPress={syncNow} />}
      <Button label={t('signOut')} variant="secondary" onPress={handleSignOut} />
      <Button label={t('deleteAccount')} variant="danger" onPress={handleDeleteAccount} />
      {actionError && <Text style={styles.error}>{actionError}</Text>}
    </Card>
  );
}

function RecurringSection() {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const styles = useThemedStyles(createStyles);
  const { recurring, deleteRecurring } = useFinance();

  const nameOf = (rule: Recurring) =>
    rule.note || (rule.category ? categoryLabel(rule.category) : t(typeLabelKey(rule.type)));

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('recurringTitle')}</Text>
      {recurring.length === 0 && <Text style={styles.caption}>{t('noRecurring')}</Text>}
      {recurring.map((rule) => (
        <DeletableRow
          key={rule.id}
          title={nameOf(rule)}
          subtitle={t('recurringDay', { day: rule.dayOfMonth, amount: formatMYR(rule.amountSen) })}
          actionLabel={t('delete')}
          onPress={() =>
            confirmDestructive(
              t('stopRecurringTitle', { name: nameOf(rule) }),
              t('stopRecurringMessage'),
              { confirm: t('delete'), cancel: t('cancel') },
              () => deleteRecurring(rule.id),
            )
          }
        />
      ))}
    </View>
  );
}

function CategoriesSection() {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const { categories, deleteCategory } = useFinance();
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('yourCategories')}</Text>
      {categories.length === 0 && <Text style={styles.caption}>{t('noCustomCategories')}</Text>}
      {categories.map((category) => (
        <DeletableRow
          key={category.id}
          title={category.name}
          actionLabel={t('delete')}
          onPress={() =>
            confirmDestructive(
              t('deleteCategoryTitle', { name: category.name }),
              t('deleteCategoryMessage'),
              { confirm: t('delete'), cancel: t('cancel') },
              () => deleteCategory(category.id),
            )
          }
        />
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const { preference: theme, setPreference: setTheme } = useThemePreference();
  const { preference: language, setPreference: setLanguage } = useLanguage();
  const { transactions } = useFinance();
  const [exportError, setExportError] = useState<string | null>(null);

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('themeSystem') },
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
  ];
  // Each language is named in itself so people can find their own.
  const languageOptions: { value: LanguagePreference; label: string }[] = [
    { value: 'system', label: t('languageSystem') },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'ms', label: 'Bahasa Melayu' },
  ];

  const handleExport = () => {
    setExportError(null);
    exportTransactionsCsv(transactions).catch((error: unknown) =>
      setExportError(t('exportFailed', { error: errorMessage(error) })),
    );
  };

  return (
    <Screen>
      <Text style={styles.label}>{t('accountAndBackup')}</Text>
      <AccountSection />

      <View style={styles.section}>
        <Text style={styles.label}>{t('language')}</Text>
        <ChipGroup options={languageOptions} selected={language} onSelect={setLanguage} />
        <Text style={styles.caption}>{t('languageHint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('appearance')}</Text>
        <ChipGroup options={themeOptions} selected={theme} onSelect={setTheme} />
        <Text style={styles.caption}>{t('themeHint')}</Text>
      </View>

      <RecurringSection />
      <CategoriesSection />

      <View style={styles.section}>
        <Text style={styles.label}>{t('exportData')}</Text>
        <Button label={t('exportCsv')} variant="secondary" onPress={handleExport} />
        {exportError && <Text style={styles.error}>{exportError}</Text>}
        <Button
          label={t('privacyPolicy')}
          variant="secondary"
          onPress={() => void Linking.openURL(brand.privacyPolicyUrl)}
        />
      </View>
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    section: { gap: spacing.sm, marginTop: spacing.md },
    label: { ...typography.caption, color: colors.textSecondary },
    caption: { ...typography.caption, color: colors.textSecondary },
    body: { ...typography.body, color: colors.textPrimary },
    error: { ...typography.caption, color: colors.danger },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    pressed: { opacity: 0.7 },
    rowText: { flex: 1, gap: 2 },
  });
