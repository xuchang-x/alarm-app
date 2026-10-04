import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants';
import { formatDate, parseDate, today } from '@/utils/date';

interface CycleFieldsProps {
  intervalDays: number;
  startDate: string;
  onIntervalChange: (days: number) => void;
  onStartDateChange: (date: string) => void;
}

const MIN_INTERVAL = 1;
const MAX_INTERVAL = 365;

/**
 * 每 N 天周期设置：间隔步进 + 今天/明天开始快捷项 + 起始日期。
 */
export default function CycleFields({
  intervalDays,
  startDate,
  onIntervalChange,
  onStartDateChange,
}: CycleFieldsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const step = (delta: number) => {
    const next = Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, intervalDays + delta));
    onIntervalChange(next);
  };

  const isToday = startDate === formatDate(today());
  const isTomorrow = startDate === formatDate(new Date(today().getTime() + 86_400_000));

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) onStartDateChange(formatDate(selectedDate));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.fieldLabel}>每隔几天响一次</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="减少间隔天数"
          style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
          onPress={() => step(-1)}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <View style={styles.stepValue}>
          <Text style={styles.stepValueText}>{intervalDays}</Text>
          <Text style={styles.stepUnit}>天</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="增加间隔天数"
          style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
          onPress={() => step(1)}
        >
          <Text style={styles.stepButtonText}>＋</Text>
        </Pressable>
      </View>

      <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>从哪天开始算</Text>
      <View style={styles.chips}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: isToday }}
          style={[styles.chip, isToday && styles.chipActive]}
          onPress={() => onStartDateChange(formatDate(today()))}
        >
          <Text style={[styles.chipText, isToday && styles.chipTextActive]}>今天开始</Text>
        </Pressable>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: isTomorrow }}
          style={[styles.chip, isTomorrow && styles.chipActive]}
          onPress={() =>
            onStartDateChange(formatDate(new Date(today().getTime() + 86_400_000)))
          }
        >
          <Text style={[styles.chipText, isTomorrow && styles.chipTextActive]}>明天开始</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.chip}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.chipText}>选日期 ›</Text>
        </Pressable>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={parseDate(startDate)}
          mode="date"
          display="default"
          design="material"
          onChange={handleDateChange}
          themeVariant="light"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  fieldLabelGap: {
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPressed: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  stepButtonText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  stepValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  stepValueText: {
    color: COLORS.primaryDark,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  stepUnit: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.primaryDark,
  },
});
