import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants';
import { parseDate, formatDate } from '@/utils/date';

interface CycleSettingsProps {
  intervalDays: number;
  startDate: string;
  onIntervalChange: (days: number) => void;
  onStartDateChange: (date: string) => void;
}

export default function CycleSettings({
  intervalDays,
  startDate,
  onIntervalChange,
  onStartDateChange,
}: CycleSettingsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [intervalText, setIntervalText] = useState(String(intervalDays));

  const handleIntervalChange = (text: string) => {
    // 只允许输入数字
    const cleaned = text.replace(/[^0-9]/g, '');
    setIntervalText(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num > 0) {
      onIntervalChange(num);
    }
  };

  const handleIntervalBlur = () => {
    // 失焦时如果为空或 0，回填为当前有效值
    const num = parseInt(intervalText, 10);
    if (isNaN(num) || num <= 0) {
      setIntervalText(String(intervalDays));
    }
  };

  const handleDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      onStartDateChange(formatDate(selectedDate));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>每</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={intervalText}
            onChangeText={handleIntervalChange}
            onBlur={handleIntervalBlur}
            keyboardType="number-pad"
            placeholderTextColor={COLORS.textDisabled}
          />
          <Text style={styles.unit}>天一次</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>起始日期</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>{startDate}</Text>
        </Pressable>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={parseDate(startDate)}
          mode="date"
          display="default"
          onChange={handleDateChange}
          themeVariant="dark"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 60,
  },
  unit: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  dateButton: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
});
