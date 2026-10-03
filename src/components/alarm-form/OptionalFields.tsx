import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import type { AlarmCategory } from '@/types/alarm';
import { ALARM_CATEGORIES, COLORS } from '@/constants';

interface OptionalFieldsProps {
  label: string;
  onLabelChange: (label: string) => void;
  category: AlarmCategory;
  onCategoryChange: (category: AlarmCategory) => void;
  snoozeMinutes: number;
  onSnoozeChange: (minutes: number) => void;
}

const SNOOZE_OPTIONS = [5, 10, 15, 20, 30] as const;

/**
 * 附加信息：名称、分类、稍后提醒时长（收纳区，非主线）。
 */
export default function OptionalFields({
  label,
  onLabelChange,
  category,
  onCategoryChange,
  snoozeMinutes,
  onSnoozeChange,
}: OptionalFieldsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.rowKey}>标签</Text>
        <TextInput
          style={styles.labelInput}
          value={label}
          onChangeText={onLabelChange}
          placeholder="未填写 · 例如：白班闹钟"
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.primary}
          maxLength={50}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowKey}>分类</Text>
        <View style={styles.categoryChips}>
          {ALARM_CATEGORIES.map((item) => {
            const active = category === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.categoryChip,
                  active && { borderColor: item.color, backgroundColor: `${item.color}18` },
                ]}
                onPress={() => onCategoryChange(item.key)}
              >
                <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                <Text style={styles.categoryText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowKey}>稍后提醒</Text>
        <View style={styles.snoozeChips}>
          {SNOOZE_OPTIONS.map((minutes) => {
            const active = snoozeMinutes === minutes;
            return (
              <Pressable
                key={minutes}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.snoozeChip, active && styles.snoozeChipActive]}
                onPress={() => onSnoozeChange(minutes)}
              >
                <Text style={[styles.snoozeChipText, active && styles.snoozeChipTextActive]}>
                  {minutes} 分钟
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    gap: 8,
  },
  rowKey: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  labelInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: COLORS.input,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.input,
  },
  categoryDot: {
    width: 8,
    height: 8,
    marginRight: 6,
    borderRadius: 4,
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  snoozeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  snoozeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  snoozeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  snoozeChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  snoozeChipTextActive: {
    color: COLORS.primaryDark,
  },
});
