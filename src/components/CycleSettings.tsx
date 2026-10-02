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
          themeVariant="light"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.input,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 9,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  unit: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dateButton: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  dateText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
});
