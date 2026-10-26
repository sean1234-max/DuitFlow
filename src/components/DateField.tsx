import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipGroup } from '@/components/ChipGroup';
import { addDays, atLocalNoon, isSameDay } from '@/dates';
import { useDateFormat, useT } from '@/i18n';
import { radius, spacing, typography, useColors, useThemedStyles, type Colors } from '@/theme';

type Props = { date: Date; onChange: (date: Date) => void };
type Quick = 'today' | 'yesterday' | 'other';

// Quick chips for the common cases plus the phone's own calendar. The native picker has
// no web version, so the web build falls back to day-by-day arrows.
// Future dates are blocked because transactions record what already happened.
export function DateField({ date, onChange }: Props) {
  const t = useT();
  const { formatDay } = useDateFormat();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const today = atLocalNoon(new Date());
  const yesterday = addDays(today, -1);
  const isToday = isSameDay(date, today);
  const quick: Quick = isToday ? 'today' : isSameDay(date, yesterday) ? 'yesterday' : 'other';

  const pick = (selected: Date | undefined) => {
    if (selected) onChange(atLocalNoon(selected));
  };
  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      maximumDate: today,
      onChange: (event, selected) => {
        if (event.type === 'set') pick(selected);
      },
    });

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t('date')}</Text>
      <ChipGroup
        options={[
          { value: 'today', label: t('today') },
          { value: 'yesterday', label: t('yesterday') },
          ...(quick === 'other' ? [{ value: 'other' as const, label: formatDay(date) }] : []),
        ]}
        selected={quick}
        onSelect={(value) => {
          if (value === 'today') onChange(today);
          if (value === 'yesterday') onChange(yesterday);
        }}
      />

      {Platform.OS === 'android' && (
        <Pressable
          accessibilityRole="button"
          onPress={openAndroidPicker}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.dateText}>{t('pickAnotherDate')}</Text>
        </Pressable>
      )}

      {Platform.OS === 'ios' && (
        <View style={styles.row}>
          <Text style={styles.dateText}>{t('pickAnotherDate')}</Text>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={today}
            accentColor={colors.textPrimary}
            onChange={(_event, selected) => pick(selected)}
          />
        </View>
      )}

      {Platform.OS === 'web' && (
        <View style={[styles.row, styles.stepper]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('previousDay')}
            hitSlop={spacing.sm}
            onPress={() => onChange(addDays(date, -1))}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.dateText}>{formatDay(date)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('nextDay')}
            accessibilityState={{ disabled: isToday }}
            disabled={isToday}
            hitSlop={spacing.sm}
            onPress={() => onChange(addDays(date, 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isToday ? colors.border : colors.textPrimary}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    label: { ...typography.caption, color: colors.textSecondary },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    stepper: { justifyContent: 'space-between' },
    pressed: { opacity: 0.7 },
    dateText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  });
