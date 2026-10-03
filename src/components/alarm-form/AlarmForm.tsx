import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAlarmStore } from '@/store/alarm-store';
import { useSettingsStore } from '@/store/settings-store';
import * as repo from '@/db/alarm-repository';
import { findConflictingAlarms } from '@/services/conflicts';
import TimePicker from '@/components/TimePicker';
import WeekdaySelector from '@/components/WeekdaySelector';
import type { Alarm, AlarmCategory, AlarmType, Weekday } from '@/types/alarm';
import { COLORS, DEFAULT_SNOOZE_MINUTES } from '@/constants';
import { formatDate, today } from '@/utils/date';
import FrequencySelector from './FrequencySelector';
import CycleFields from './CycleFields';
import OptionalFields from './OptionalFields';

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

interface AlarmFormProps {
  /** 编辑态传入原闹钟；创建态不传 */
  initialAlarm?: Alarm;
  /** 保存成功后的回调（一般是 router.back()） */
  onSaved: () => void;
}

/**
 * 创建/编辑共用的闹钟表单。
 *
 * 主线：先选「多久响一次」（创建态默认每 N 天），再选具体日期/星期/周期，
 * 名称、分类、稍后提醒收纳为附加信息。内部标识符（snooze 等）不变，
 * 仅用户可见文案用「稍后提醒」。
 */
export default function AlarmForm({ initialAlarm, onSaved }: AlarmFormProps) {
  const createAlarm = useAlarmStore((state) => state.createAlarm);
  const updateAlarm = useAlarmStore((state) => state.updateAlarm);
  const defaultSnoozeMinutes = useSettingsStore((state) => state.settings.defaultSnoozeMinutes);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  const [type, setType] = useState<AlarmType>(initialAlarm?.type ?? 'cycle');
  const [hour, setHour] = useState(initialAlarm?.hour ?? 9);
  const [minute, setMinute] = useState(initialAlarm?.minute ?? 0);
  const [label, setLabel] = useState(initialAlarm?.label ?? '');
  const [category, setCategory] = useState<AlarmCategory>(initialAlarm?.category ?? 'other');
  const [snoozeMinutes, setSnoozeMinutes] = useState(
    initialAlarm?.snoozeMinutes ?? DEFAULT_SNOOZE_MINUTES
  );
  const [onceDate, setOnceDate] = useState(initialAlarm?.onceDate ?? formatDate(today()));
  const [showOnceDatePicker, setShowOnceDatePicker] = useState(false);
  const [weekdays, setWeekdays] = useState<Weekday[]>(initialAlarm?.weekdays ?? [1]);
  const [intervalDays, setIntervalDays] = useState(initialAlarm?.intervalDays ?? 2);
  const [startDate, setStartDate] = useState(initialAlarm?.startDate ?? formatDate(today()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // 创建态：设置加载后应用默认稍后提醒时长（编辑态不覆盖已存值）
  useEffect(() => {
    if (!initialAlarm) setSnoozeMinutes(defaultSnoozeMinutes);
  }, [defaultSnoozeMinutes, initialAlarm]);

  const handleOnceDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowOnceDatePicker(false);
    if (selectedDate) setOnceDate(formatDate(selectedDate));
  };

  const handleSave = async () => {
    if (type === 'weekly' && weekdays.length === 0) {
      Alert.alert('提示', '请至少选择一个星期');
      return;
    }

    const conflictsDraft: Alarm = {
      id: initialAlarm?.id ?? -1,
      type,
      hour,
      minute,
      label: label.trim(),
      category,
      enabled: initialAlarm?.enabled ?? true,
      onceDate: type === 'once' ? onceDate : null,
      weekdays: type === 'weekly' ? weekdays : null,
      intervalDays: type === 'cycle' ? intervalDays : null,
      startDate: type === 'cycle' ? startDate : null,
      snoozeMinutes,
      createdAt: initialAlarm?.createdAt ?? '',
      updatedAt: initialAlarm?.updatedAt ?? '',
    };
    const conflicts = await findConflictingAlarms(
      conflictsDraft,
      useAlarmStore.getState().alarms,
      repo.getAdjustments
    );
    if (
      conflicts.length > 0 &&
      !(await confirmConflicts(conflicts.map((item) => item.label || '未命名提醒')))
    ) {
      return;
    }

    setSaving(true);
    try {
      if (initialAlarm) {
        await updateAlarm(initialAlarm.id, {
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
      } else {
        await createAlarm({
          type,
          hour,
          minute,
          label: label.trim() || undefined,
          category,
          snoozeMinutes,
          onceDate: type === 'once' ? onceDate : undefined,
          weekdays: type === 'weekly' ? weekdays : undefined,
          intervalDays: type === 'cycle' ? intervalDays : undefined,
          startDate: type === 'cycle' ? startDate : undefined,
        });
      }
      onSaved();
    } catch (_error) {
      Alert.alert('错误', initialAlarm ? '保存失败，请重试' : '创建闹钟失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
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
          <Text style={styles.sectionTitle}>这个提醒多久响一次</Text>
          <Text style={styles.sectionHint}>选择提醒发生的规律</Text>
          <FrequencySelector value={type} onChange={setType} />
        </View>

        {type === 'once' ? (
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
            {showOnceDatePicker ? (
              <DateTimePicker
                value={new Date(onceDate + 'T00:00:00')}
                mode="date"
                display="default"
                onChange={handleOnceDateChange}
                themeVariant="light"
                minimumDate={initialAlarm ? undefined : today()}
              />
            ) : null}
          </View>
        ) : null}

        {type === 'weekly' ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>每周哪几天</Text>
            <Text style={styles.sectionHint}>每周在选中的日期提醒</Text>
            <WeekdaySelector selected={weekdays} onChange={setWeekdays} />
          </View>
        ) : null}

        {type === 'cycle' ? (
          <View style={styles.sectionCard}>
            <CycleFields
              intervalDays={intervalDays}
              startDate={startDate}
              onIntervalChange={setIntervalDays}
              onStartDateChange={setStartDate}
            />
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>附加信息</Text>
          <View style={styles.optionalGap}>
            <OptionalFields
              label={label}
              onLabelChange={setLabel}
              category={category}
              onCategoryChange={setCategory}
              snoozeMinutes={snoozeMinutes}
              onSnoozeChange={setSnoozeMinutes}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.saveButton,
            saving && styles.saveButtonDisabled,
            pressed && styles.saveButtonPressed,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? '保存中...' : initialAlarm ? '保存修改' : '保存提醒'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  hero: { paddingVertical: 12 },
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
  optionalGap: { gap: 14 },
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
