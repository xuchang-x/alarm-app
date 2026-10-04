import { useEffect, useState, useCallback } from 'react';
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
import SkinDatePicker from '@/components/common/SkinDatePicker';
import { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAlarmStore } from '@/store/alarm-store';
import { useSettingsStore } from '@/store/settings-store';
import * as repo from '@/db/alarm-repository';
import { findConflictingAlarms } from '@/services/conflicts';
import TimePicker from '@/components/alarm-form/TimePicker';
import WeekdaySelector from '@/components/alarm-form/WeekdaySelector';
import type { Alarm, AlarmCategory, AlarmType, Weekday } from '@/types/alarm';
import { COLORS, DEFAULT_SNOOZE_MINUTES } from '@/constants';
import { formatDate, today } from '@/utils/date';
import FrequencySelector from './FrequencySelector';
import CycleFields from './CycleFields';
import OptionalFields from './OptionalFields';
import SoundPickerField from './SoundPickerField';
import type { SoundSelection } from './SoundPickerModal';
import { DEFAULT_SOUND_ID } from '@/constants/sounds';

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
  /** 表单内容变化回调（用于「取消时未保存确认」） */
  onDirtyChange?: (dirty: boolean) => void;
  /** 保存成功后的回调（一般是 router.back()） */
  onSaved: () => void;
  /** 编辑态传入删除回调；传入时底部渲染「删除这个提醒」小字链接（创建态不传） */
  onDelete?: () => void;
}

/**
 * 创建/编辑共用的闹钟表单。
 *
 * 主线：先选「多久响一次」（创建态默认每 N 天），再选具体日期/星期/周期，
 * 名称、分类、稍后提醒收纳为附加信息。内部标识符（snooze 等）不变，
 * 仅用户可见文案用「稍后提醒」。
 */
export default function AlarmForm({ initialAlarm, onDirtyChange, onSaved, onDelete }: AlarmFormProps) {
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
  const [soundId, setSoundId] = useState<string | null>(
    initialAlarm?.soundId ?? null
  );
  const [customSoundUri, setCustomSoundUri] = useState<string | null>(
    initialAlarm?.customSoundUri ?? null
  );
  const [customSoundTitle, setCustomSoundTitle] = useState<string | null>(
    initialAlarm?.customSoundTitle ?? null
  );
  const [saving, setSaving] = useState(false);

  /** 标记表单已编辑（供外部「取消时未保存确认」）。
   * 注意：不能在 setDirty 的 updater 里调用 onDirtyChange，
   * updater 属于渲染阶段，会触发「render 期间更新其他组件」报错 */
  const markDirty = useCallback(() => {
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  // 原初值快照：用于回填、重置 dirty 标记
  useEffect(() => {
    onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAlarm]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // 创建态：设置加载后应用默认稍后提醒时长（编辑态不覆盖已存值）
  useEffect(() => {
    if (!initialAlarm) setSnoozeMinutes(defaultSnoozeMinutes);
  }, [defaultSnoozeMinutes, initialAlarm]);

  const handleOnceDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowOnceDatePicker(false);
    if (selectedDate) {
      setOnceDate(formatDate(selectedDate));
      markDirty();
    }
  };

  const handleSoundChange = (selection: SoundSelection): void => {
    setSoundId(selection.soundId);
    setCustomSoundUri(selection.customSoundUri);
    setCustomSoundTitle(selection.customSoundTitle);
    markDirty();
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
      soundId,
      customSoundUri,
      customSoundTitle,
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
          // 铃声三字段显式传值（支持 null 清空，切回内置音）
          soundId: soundId ?? undefined,
          customSoundUri,
          customSoundTitle,
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
          soundId: soundId ?? DEFAULT_SOUND_ID,
          customSoundUri,
          customSoundTitle,
        });
      }
      onDirtyChange?.(false);
      // 落库成功但通知调度失败时如实提示（数据已在，不报「创建失败」误导重试）
      const failure = useAlarmStore.getState().lastScheduleFailure;
      if (failure) {
        Alert.alert('提醒已保存', failure, [
          { text: '知道了', onPress: onSaved },
        ]);
        return;
      }
      onSaved();
    } catch (error) {
      console.warn('[AlarmForm] 保存提醒失败:', error);
      Alert.alert('错误', initialAlarm ? '保存失败，请重试' : '创建闹钟失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const savingText = saving ? '保存中...' : initialAlarm ? '保存修改' : '保存提醒';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
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
              markDirty();
            }}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>这个提醒多久响一次</Text>
          <Text style={styles.sectionHint}>选择提醒发生的规律</Text>
          <FrequencySelector value={type} onChange={(next) => { setType(next); markDirty(); }} />
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
              <SkinDatePicker
                value={new Date(onceDate + 'T00:00:00')}
                mode="date"
                display="default"
                onChange={handleOnceDateChange}
                minimumDate={today()}
              />
            ) : null}
          </View>
        ) : null}

        {type === 'weekly' ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>每周哪几天</Text>
            <Text style={styles.sectionHint}>每周在选中的日期提醒</Text>
            <WeekdaySelector selected={weekdays} onChange={(next) => { setWeekdays(next); markDirty(); }} />
          </View>
        ) : null}

        {type === 'cycle' ? (
          <View style={styles.sectionCard}>
            <CycleFields
              intervalDays={intervalDays}
              startDate={startDate}
              onIntervalChange={(next) => { setIntervalDays(next); markDirty(); }}
              onStartDateChange={(next) => { setStartDate(next); markDirty(); }}
            />
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>附加信息</Text>
          <View style={styles.optionalGap}>
            <OptionalFields
              label={label}
              onLabelChange={(next) => { setLabel(next); markDirty(); }}
              category={category}
              onCategoryChange={(next) => { setCategory(next); markDirty(); }}
              snoozeMinutes={snoozeMinutes}
              onSnoozeChange={(next) => { setSnoozeMinutes(next); markDirty(); }}
              soundId={soundId}
              customSoundUri={customSoundUri}
              customSoundTitle={customSoundTitle}
              onSoundChange={handleSoundChange}
            />
          </View>
        </View>

      </ScrollView>

      {/* 固定底部操作区：保存（主操作）常驻；删除弱化为小字链接，仅编辑态渲染 */}
      <View style={styles.footer}>
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
          <Text style={styles.saveButtonText}>{savingText}</Text>
        </Pressable>
        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.deleteLink, pressed && styles.deleteLinkPressed]}
            onPress={onDelete}
          >
            <Text style={styles.deleteLinkText}>删除这个提醒</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
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
  deleteLink: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteLinkPressed: { backgroundColor: '#FDECEF' },
  deleteLinkText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});
