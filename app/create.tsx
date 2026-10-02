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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  const createAlarm = useAlarmStore((state) => state.createAlarm);
  const [type, setType] = useState<AlarmType>('once');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState('');
  const [snoozeMinutes, setSnoozeMinutes] = useState(DEFAULT_SNOOZE_MINUTES);
  const [onceDate, setOnceDate] = useState(formatDate(today()));
  const [showOnceDatePicker, setShowOnceDatePicker] = useState(false);
  const [weekdays, setWeekdays] = useState<Weekday[]>([1]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [startDate, setStartDate] = useState(formatDate(today()));
  const [saving, setSaving] = useState(false);

  const handleOnceDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowOnceDatePicker(false);
    if (selectedDate) setOnceDate(formatDate(selectedDate));
  };

  const handleSnoozeChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0 && num <= 60) setSnoozeMinutes(num);
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
    } catch (_error) {
      Alert.alert('错误', '创建闹钟失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>取消</Text>
          </Pressable>
          <Text style={styles.headerTitle}>新建闹钟</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>NEW REMINDER</Text>
            <Text style={styles.heroTitle}>安排一个时间</Text>
            <TimePicker
              hour={hour}
              minute={minute}
              onChange={(nextHour, nextMinute) => {
                setHour(nextHour);
                setMinute(nextMinute);
              }}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>重复方式</Text>
            <Text style={styles.sectionHint}>选择提醒发生的规律</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map(({ key, label: typeLabel }) => (
                <Pressable
                  key={key}
                  style={[styles.typeChip, type === key && styles.typeChipActive]}
                  onPress={() => setType(key)}
                >
                  <Text style={[styles.typeChipText, type === key && styles.typeChipTextActive]}>
                    {typeLabel}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {type === 'once' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>日期</Text>
              <Text style={styles.sectionHint}>这次提醒在哪一天发生</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowOnceDatePicker(true)}>
                <View>
                  <Text style={styles.dateLabel}>提醒日期</Text>
                  <Text style={styles.dateText}>{onceDate}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              {showOnceDatePicker && (
                <DateTimePicker
                  value={new Date(onceDate + 'T00:00:00')}
                  mode="date"
                  display="default"
                  onChange={handleOnceDateChange}
                  themeVariant="light"
                  minimumDate={today()}
                />
              )}
            </View>
          )}

          {type === 'weekly' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>选择星期</Text>
              <Text style={styles.sectionHint}>每周在选中的日期提醒</Text>
              <WeekdaySelector selected={weekdays} onChange={setWeekdays} />
            </View>
          )}

          {type === 'cycle' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>周期设置</Text>
              <Text style={styles.sectionHint}>按固定间隔重复提醒</Text>
              <CycleSettings
                intervalDays={intervalDays}
                startDate={startDate}
                onIntervalChange={setIntervalDays}
                onStartDateChange={setStartDate}
              />
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>提醒信息</Text>
            <Text style={styles.sectionHint}>给这条提醒加一个容易识别的名字</Text>
            <TextInput
              style={styles.labelInput}
              value={label}
              onChangeText={setLabel}
              placeholder="例如：晨间服药"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              maxLength={50}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.snoozeHeader}>
              <View>
                <Text style={styles.sectionTitle}>贪睡时长</Text>
                <Text style={styles.sectionHint}>通知后延迟再次提醒</Text>
              </View>
              <View style={styles.snoozeInputWrapper}>
                <TextInput
                  style={styles.snoozeInput}
                  value={String(snoozeMinutes)}
                  onChangeText={handleSnoozeChange}
                  keyboardType="number-pad"
                  selectionColor={COLORS.primary}
                />
                <Text style={styles.snoozeUnit}>分钟</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveButton, saving && styles.saveButtonDisabled, pressed && styles.saveButtonPressed]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存闹钟'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: { minWidth: 56, paddingVertical: 8 },
  headerButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  headerTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  headerPlaceholder: { minWidth: 56 },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  hero: { paddingVertical: 12 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  heroTitle: { marginTop: 6, marginBottom: 18, color: COLORS.textPrimary, fontSize: 27, fontWeight: '800' },
  sectionCard: {
    padding: 17,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  sectionHint: { marginTop: 4, marginBottom: 13, color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 },
  typeRow: { flexDirection: 'row', gap: 7 },
  typeChip: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, backgroundColor: COLORS.input },
  typeChipActive: { backgroundColor: COLORS.primary },
  typeChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.input,
  },
  dateLabel: { color: COLORS.textSecondary, fontSize: 11 },
  dateText: { marginTop: 3, color: COLORS.primaryDark, fontSize: 15, fontWeight: '700' },
  chevron: { color: COLORS.textMuted, fontSize: 25 },
  labelInput: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.input,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  snoozeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  snoozeInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  snoozeInput: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  snoozeUnit: { color: COLORS.textSecondary, fontSize: 13 },
  saveButton: {
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  saveButtonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.99 }] },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
