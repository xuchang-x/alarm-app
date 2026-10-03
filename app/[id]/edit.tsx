import { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAlarmStore } from '@/store/alarm-store';
import * as repo from '@/db/alarm-repository';
import { findConflictingAlarms } from '@/services/conflicts';
import TimePicker from '@/components/TimePicker';
import { NavBar, PageHeading } from '@/components/PageHeader';
import WeekdaySelector from '@/components/WeekdaySelector';
import CycleSettings from '@/components/CycleSettings';
import type { Alarm, AlarmCategory, AlarmType, Weekday } from '@/types/alarm';
import { ALARM_CATEGORIES, COLORS } from '@/constants';
import { formatDate, today } from '@/utils/date';

const TYPE_OPTIONS: { key: AlarmType; label: string }[] = [
  { key: 'once', label: '一次' },
  { key: 'daily', label: '每天' },
  { key: 'weekly', label: '每周' },
  { key: 'cycle', label: '周期' },
];

function confirmConflicts(labels: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      '发现时间冲突',
      `未来 30 天内有 ${labels.length} 个提醒会在同一时间响铃：${labels.join('、')}`,
      [
        { text: '返回修改', style: 'cancel', onPress: () => resolve(false) },
        { text: '仍然保存', onPress: () => resolve(true) },
      ]
    );
  });
}

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const updateAlarm = useAlarmStore((state) => state.updateAlarm);
  const [loading, setLoading] = useState(true);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [type, setType] = useState<AlarmType>('once');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<AlarmCategory>('other');
  const [snoozeMinutes, setSnoozeMinutes] = useState(10);
  const [onceDate, setOnceDate] = useState(formatDate(today()));
  const [showOnceDatePicker, setShowOnceDatePicker] = useState(false);
  const [weekdays, setWeekdays] = useState<Weekday[]>([1]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [startDate, setStartDate] = useState(formatDate(today()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAlarm() {
      const alarmId = parseInt(id, 10);
      if (isNaN(alarmId)) {
        Alert.alert('错误', '无效的闹钟 ID');
        router.back();
        return;
      }

      const found = await repo.getAlarmById(alarmId);
      if (!found) {
        Alert.alert('错误', '闹钟不存在');
        router.back();
        return;
      }

      setAlarm(found);
      setType(found.type);
      setHour(found.hour);
      setMinute(found.minute);
      setLabel(found.label);
      setCategory(found.category);
      setSnoozeMinutes(found.snoozeMinutes);
      if (found.onceDate) setOnceDate(found.onceDate);
      if (found.weekdays) setWeekdays(found.weekdays);
      if (found.intervalDays) setIntervalDays(found.intervalDays);
      if (found.startDate) setStartDate(found.startDate);
      setLoading(false);
    }

    loadAlarm();
  }, [id, router]);

  const handleOnceDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowOnceDatePicker(false);
    if (selectedDate) setOnceDate(formatDate(selectedDate));
  };

  const handleSnoozeChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0 && num <= 60) setSnoozeMinutes(num);
  };

  const handleSave = async () => {
    if (!alarm) return;
    if (type === 'weekly' && weekdays.length === 0) {
      Alert.alert('提示', '请至少选择一个星期');
      return;
    }

    const draft: Alarm = {
      ...alarm,
      type,
      hour,
      minute,
      label: label.trim(),
      category,
      onceDate: type === 'once' ? onceDate : null,
      weekdays: type === 'weekly' ? weekdays : null,
      intervalDays: type === 'cycle' ? intervalDays : null,
      startDate: type === 'cycle' ? startDate : null,
      snoozeMinutes,
    };
    const conflicts = await findConflictingAlarms(draft, useAlarmStore.getState().alarms, repo.getAdjustments);
    if (conflicts.length > 0 && !(await confirmConflicts(conflicts.map((item) => item.label || '未命名提醒')))) return;

    setSaving(true);
    try {
      await updateAlarm(alarm.id, {
        type,
        hour,
        minute,
        label: label.trim(),
        category,
        snoozeMinutes,
        onceDate: type === 'once' ? onceDate : undefined,
        weekdays: type === 'weekly' ? weekdays : undefined,
        intervalDays: type === 'cycle' ? intervalDays : undefined,
        startDate: type === 'cycle' ? startDate : undefined,
      });
      router.back();
    } catch (_error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>正在加载闹钟</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <NavBar
          title="编辑闹钟"
          leftAction={{ label: '取消', onPress: () => router.back() }}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <PageHeading
              eyebrow="EDIT REMINDER"
              title="调整你的安排"
              style={styles.heroHeading}
              right={
                <View style={[styles.enabledPill, !alarm?.enabled && styles.disabledPill]}>
                  <View style={[styles.enabledDot, !alarm?.enabled && styles.disabledDot]} />
                  <Text style={styles.enabledText}>{alarm?.enabled ? '已开启' : '已暂停'}</Text>
                </View>
              }
            />
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
              placeholder="例如：早班闹钟"
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

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>分类</Text>
            <Text style={styles.sectionHint}>用颜色快速识别提醒用途</Text>
            <View style={styles.categoryGrid}>
              {ALARM_CATEGORIES.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.categoryChip, category === item.key && { borderColor: item.color, backgroundColor: `${item.color}18` }]}
                  onPress={() => setCategory(item.key)}
                >
                  <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                  <Text style={styles.categoryText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveButton, saving && styles.saveButtonDisabled, pressed && styles.saveButtonPressed]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存修改'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 13 },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  hero: { paddingVertical: 12 },
  heroHeading: { marginBottom: 18 },
  enabledPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#E3F5EE' },
  disabledPill: { backgroundColor: COLORS.input },
  enabledDot: { width: 7, height: 7, marginRight: 6, borderRadius: 4, backgroundColor: COLORS.success },
  disabledDot: { backgroundColor: COLORS.textDisabled },
  enabledText: { color: COLORS.success, fontSize: 11, fontWeight: '700' },
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
  dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, backgroundColor: COLORS.input },
  dateLabel: { color: COLORS.textSecondary, fontSize: 11 },
  dateText: { marginTop: 3, color: COLORS.primaryDark, fontSize: 15, fontWeight: '700' },
  chevron: { color: COLORS.textMuted, fontSize: 25 },
  labelInput: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, backgroundColor: COLORS.input, color: COLORS.textPrimary, fontSize: 14 },
  snoozeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  snoozeInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  snoozeInput: { minWidth: 48, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, backgroundColor: COLORS.primarySoft, color: COLORS.primaryDark, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  snoozeUnit: { color: COLORS.textSecondary, fontSize: 13 },
  saveButton: { alignItems: 'center', marginTop: 22, paddingVertical: 15, borderRadius: 16, backgroundColor: COLORS.primary, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 },
  saveButtonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.99 }] },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.input },
  categoryDot: { width: 8, height: 8, marginRight: 6, borderRadius: 4 },
  categoryText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
});
