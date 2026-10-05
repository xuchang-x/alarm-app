import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { Weekday } from '@/types/alarm';
import { COLORS, SKIN } from '@/constants';

interface WeekdaySelectorProps {
  selected: Weekday[];
  onChange: (weekdays: Weekday[]) => void;
}

const DAY_LABELS: { key: Weekday; label: string }[] = [
  { key: 1, label: '一' },
  { key: 2, label: '二' },
  { key: 3, label: '三' },
  { key: 4, label: '四' },
  { key: 5, label: '五' },
  { key: 6, label: '六' },
  { key: 7, label: '日' },
];

export default function WeekdaySelector({
  selected,
  onChange,
}: WeekdaySelectorProps) {
  const toggleDay = (day: Weekday) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort());
    }
  };

  return (
    <View style={styles.container}>
      {DAY_LABELS.map(({ key, label }) => {
        const isSelected = selected.includes(key);
        return (
          <Pressable
            key={key}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => toggleDay(key)}
          >
            <Text
              style={[styles.chipText, isSelected && styles.chipTextSelected]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  chip: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: COLORS.input,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: SKIN.brand.onPrimary,
    fontWeight: '600',
  },
});
