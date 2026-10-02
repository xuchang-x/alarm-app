import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, Platform } from 'react-native';
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
          themeVariant="dark"
        />
      </View>
    );
  }

  return (
    <View>
      <Pressable style={styles.androidTrigger} onPress={() => setShow(true)}>
        <Text style={styles.timeText}>{formatTime(hour, minute)}</Text>
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
  },
  androidTrigger: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '300',
    color: COLORS.textPrimary,
  },
});
