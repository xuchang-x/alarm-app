import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, Platform } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
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

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate.getHours(), selectedDate.getMinutes());
    }
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosContainer}>
        <DateTimePicker
          value={dateValue}
          mode="time"
          display="spinner"
          onChange={handleChange}
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
          onChange={handleChange}
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
