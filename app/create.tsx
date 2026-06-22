import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useAlarmStore } from '@/store/alarm-store';
import TimePicker from '@/components/TimePicker';
import WeekdaySelector from '@/components/WeekdaySelector';
import CycleSettings from '@/components/CycleSettings';
import type { AlarmType, Weekday } from '@/types/alarm';
import { COLORS, DEFAULT_SNOOZE_MINUTES } from '@/constants';
import { formatDate, today } from '@/utils/date';

const TYPE_OPTIONS: { key: AlarmType; label: string }[] = [
  { key: 'once', label: '一次' },
  { key: 'daily', label: '每天' },
  { key: 'weekly', label: '每周' },
  { key: 'cycle', label: '周期' },
];

export default function CreateScreen() {
  const router = useRouter();
  const createAlarm = useAlarmStore((s) => s.createAlarm);

  const [type, setType] = useState<AlarmType>('once');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState('');
  const [snoozeMinutes, setSnoozeMinutes] = useState(DEFAULT_SNOOZE_MINUTES);

  // once 专用
  const [onceDate, setOnceDate] = useState(formatDate(today()));
  const [showOnceDatePicker, setShowOnceDatePicker] = useState(false);

  // weekly 专用
  const [weekdays, setWeekdays] = useState<Weekday[]>([1]);

  // cycle 专用
  const [intervalDays, setIntervalDays] = useState(2);
  const [startDate, setStartDate] = useState(formatDate(today()));

  const [saving, setSaving] = useState(false);

  const handleOnceDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setShowOnceDatePicker(false);
    }
    if (selectedDate) {
      setOnceDate(formatDate(selectedDate));
    }
  };

  const handleSnoozeChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0 && num <= 60) {
      setSnoozeMinutes(num);
    }
  };

  const handleSave = async () => {
    if (type === 'weekly' && weekdays.length === 0) {
      Alert.alert('提示', '请至少选择一个星期');
      return;
    }

    setSaving(true);
    try {
      await createAlarm({
        type,
        hour,
        minute,
        label: label.trim() || undefined,
        snoozeMinutes,
        onceDate: type === 'once' ? onceDate : undefined,
        weekdays: type === 'weekly' ? weekdays : undefined,
        intervalDays: type === 'cycle' ? intervalDays : undefined,
        startDate: type === 'cycle' ? startDate : undefined,
      });
      router.back();
    } catch (error) {
      Alert.alert('错误', '创建闹钟失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 时间选择器 */}
        <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />

        {/* 闹钟类型 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>重复方式</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map(({ key, label: typeLabel }) => (
              <Pressable
                key={key}
                style={[styles.typeChip, type === key && styles.typeChipActive]}
                onPress={() => setType(key)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    type === key && styles.typeChipTextActive,
                  ]}
                >
                  {typeLabel}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 按类型动态展示设置项 */}
        {type === 'once' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>日期</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowOnceDatePicker(true)}
            >
              <Text style={styles.dateText}>{onceDate}</Text>
            </Pressable>
            {showOnceDatePicker && (
              <DateTimePicker
                value={new Date(onceDate + 'T00:00:00')}
                mode="date"
                display="default"
                onChange={handleOnceDateChange}
                themeVariant="dark"
                minimumDate={today()}
              />
            )}
          </View>
        )}

        {type === 'weekly' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>选择星期</Text>
            <WeekdaySelector selected={weekdays} onChange={setWeekdays} />
          </View>
        )}

        {type === 'cycle' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>周期设置</Text>
            <CycleSettings
              intervalDays={intervalDays}
              startDate={startDate}
              onIntervalChange={setIntervalDays}
              onStartDateChange={setStartDate}
            />
          </View>
        )}

        {/* 标签 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>标签</Text>
          <TextInput
            style={styles.labelInput}
            value={label}
            onChangeText={setLabel}
            placeholder="闹钟名称（选填）"
            placeholderTextColor={COLORS.textDisabled}
            maxLength={50}
          />
        </View>

        {/* 贪睡 */}
        <View style={styles.section}>
          <View style={styles.snoozeRow}>
            <Text style={styles.sectionTitle}>贪睡时长</Text>
            <View style={styles.snoozeInputWrapper}>
              <TextInput
                style={styles.snoozeInput}
                value={String(snoozeMinutes)}
                onChangeText={handleSnoozeChange}
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textDisabled}
              />
              <Text style={styles.snoozeUnit}>分钟</Text>
            </View>
          </View>
        </View>

        {/* 保存按钮 */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  labelInput: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  snoozeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snoozeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snoozeInput: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 60,
  },
  snoozeUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  saveButton: {
    marginTop: 36,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
