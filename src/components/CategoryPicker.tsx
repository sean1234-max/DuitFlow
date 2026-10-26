import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/ChipGroup';
import { Field } from '@/components/Field';
import { allCategories, isDuplicateCategory } from '@/finance/categories';
import { useFinance } from '@/finance/FinanceContext';
import { CATEGORY_MAX_LENGTH, isValidCategoryName, type Category } from '@/finance/transactions';
import { BUILT_IN_CATEGORY_NAMES, useCategoryLabel, useT } from '@/i18n';
import { spacing, typography, useThemedStyles, type Colors } from '@/theme';

const NEW_CATEGORY = '__new__';

type Props = { selected: Category; onSelect: (category: Category) => void };

// Built-in and custom categories, plus a "+ New category" chip that adds one inline.
export function CategoryPicker({ selected, onSelect }: Props) {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const styles = useThemedStyles(createStyles);
  const { categories, addCategory } = useFinance();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = [
    ...allCategories(categories).map((c) => ({ value: c, label: categoryLabel(c) })),
    { value: NEW_CATEGORY, label: t('newCategory') },
  ];

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!isValidCategoryName(trimmed)) return setError(t('categoryNameError'));
    const isTranslatedBuiltIn = BUILT_IN_CATEGORY_NAMES.some(
      (label) => label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isTranslatedBuiltIn || isDuplicateCategory(trimmed, categories)) {
      return setError(t('categoryExists'));
    }
    addCategory(trimmed);
    onSelect(trimmed);
    setName('');
    setError(null);
    setIsCreating(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t('category')}</Text>
      <ChipGroup
        options={options}
        selected={isCreating ? NEW_CATEGORY : selected}
        onSelect={(value) => {
          if (value === NEW_CATEGORY) return setIsCreating(true);
          setIsCreating(false);
          onSelect(value);
        }}
      />
      {isCreating && (
        <View style={styles.wrapper}>
          <Field
            label={t('newCategoryName')}
            value={name}
            onChangeText={setName}
            placeholder={t('newCategoryPlaceholder')}
            maxLength={CATEGORY_MAX_LENGTH}
            autoFocus
            error={error}
          />
          <Button label={t('add')} variant="secondary" onPress={handleAdd} />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary },
  });
