import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants';
import { formatTime } from '@/utils/date';

interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export default function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const [show, setShow] = useState(false);

  const dateValue = new Date();
  dateValue.setHours(hour, minute, 0, 0);

  // 新 API：仅在用户确认选中时间时触发（date 非可选）
  const handleValueChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    onChange(date.getHours(), date.getMinutes());
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosContainer}>
        <DateTimePicker
          value={dateValue}
          mode="time"
          display="spinner"
          onValueChange={handleValueChange}
          themeVariant="light"
        />
      </View>
    );
  }

  return (
    <View>
      <Pressable style={styles.androidTrigger} onPress={() => setShow(true)}>
        <Text style={styles.timeLabel}>提醒时间</Text>
        <Text style={styles.timeText}>{formatTime(hour, minute)}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={dateValue}
          mode="time"
          display="spinner"
          onValueChange={handleValueChange}
          onDismiss={() => setShow(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iosContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.card,
  },
  androidTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.card,
  },
  timeLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  timeText: {
    color: COLORS.primary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  chevron: {
    marginLeft: 10,
    color: COLORS.textMuted,
    fontSize: 25,
  },
});
