import { create } from 'zustand';
import type {
  Alarm,
  AdjustmentType,
  CreateAlarmInput,
  UpdateAlarmInput,
} from '@/types/alarm';
import * as repo from '@/db/alarm-repository';
import { computeNextRingDate } from '@/services/scheduler';
import { addDaysToDate, formatDate, today } from '@/utils/date';
import {
  scheduleAlarmRinging,
  cancelAlarmRinging,
  scheduleAlarmSnooze,
  type ScheduleResult,
} from '@/services/ring-scheduler';

/** 调度失败时给用户的一致提示文案（Expo Go 环境下不会出现此分支） */
const SCHEDULE_FAILED_MESSAGE =
  '提醒已保存，但通知调度失败（可能是系统通知权限被拒绝）。开启后请在系统设置中允许通知。';

interface AlarmStore {
  alarms: Alarm[];
  loading: boolean;
  /** 最近一次调度失败信息（供页面提示「已落库但调度失败」） */
  lastScheduleFailure: string | null;

  /** 从数据库加载所有闹钟 */
  loadAlarms: () => Promise<void>;

  /** 调度后统一处理：失败时记录提示文案（数据已落库，不回滚不重试） */
  _applyScheduleResult: (result: ScheduleResult) => void;

  /** 创建闹钟 */
  createAlarm: (input: CreateAlarmInput) => Promise<Alarm>;

  /** 复制闹钟 */
  duplicateAlarm: (id: number) => Promise<Alarm>;

  /** 更新闹钟 */
  updateAlarm: (id: number, input: UpdateAlarmInput) => Promise<void>;

  /** 删除闹钟 */
  deleteAlarm: (id: number) => Promise<void>;

  /** 切换闹钟开关 */
  toggleAlarm: (id: number) => Promise<void>;

  /** 跳过下一次 / 临时加一次 */
  addAdjustment: (
    id: number,
    type: AdjustmentType,
    date: string
  ) => Promise<void>;

  /** 贪睡 */
  snooze: (id: number) => Promise<void>;
}

export const useAlarmStore = create<AlarmStore>((set, get) => ({
  alarms: [],
  loading: false,
  lastScheduleFailure: null,

  loadAlarms: async () => {
    set({ loading: true });
    try {
      const alarms = await repo.getAllAlarms();
      set({ alarms });
    } finally {
      set({ loading: false });
    }
  },

  /** 调度后统一处理：失败时记录提示文案（数据已落库，不回滚不重试） */
  _applyScheduleResult(result: ScheduleResult): void {
    set({ lastScheduleFailure: result.ok ? null : SCHEDULE_FAILED_MESSAGE });
  },

  createAlarm: async (input) => {
    const alarm = await repo.createAlarm(input);
    const adjustments = await repo.getAdjustments(alarm.id);
    get()._applyScheduleResult(
      await scheduleAlarmRinging(alarm, adjustments)
    );
    await get().loadAlarms();
    return alarm;
  },

  duplicateAlarm: async (id) => {
    const source = await repo.getAlarmById(id);
    if (!source) {
      throw new Error(`闹钟 #${id} 不存在`);
    }
    // 一次性闹钟副本从明天开始；用本地日历日计算，
    // 禁用 toISOString().slice(0,10)（UTC 日期在东八区会偏早一天）
    const tomorrow = addDaysToDate(today(), 1);
    const alarm = await repo.createAlarm({
      type: source.type,
      hour: source.hour,
      minute: source.minute,
      label: source.label ? `${source.label} 副本` : '提醒副本',
      category: source.category,
      onceDate: source.type === 'once' ? formatDate(tomorrow) : undefined,
      weekdays: source.type === 'weekly' ? source.weekdays ?? undefined : undefined,
      intervalDays: source.type === 'cycle' ? source.intervalDays ?? undefined : undefined,
      startDate: source.type === 'cycle' ? source.startDate ?? undefined : undefined,
      snoozeMinutes: source.snoozeMinutes,
      soundId: source.soundId ?? undefined,
      customSoundUri: source.customSoundUri,
      customSoundTitle: source.customSoundTitle,
    });
    const adjustments = await repo.getAdjustments(alarm.id);
    get()._applyScheduleResult(
      await scheduleAlarmRinging(alarm, adjustments)
    );
    await get().loadAlarms();
    return alarm;
  },

  updateAlarm: async (id, input) => {
    await repo.updateAlarm(id, input);
    const updated = await repo.getAlarmById(id);
    if (updated) {
      const adjustments = await repo.getAdjustments(id);
      get()._applyScheduleResult(
        await scheduleAlarmRinging(updated, adjustments)
      );
    }
    await get().loadAlarms();
  },

  deleteAlarm: async (id) => {
    try {
      await cancelAlarmRinging(id);
    } catch (error) {
      // 通知取消失败不阻断删除（数据库是唯一真相，孤儿通知到期自然消亡）
      console.warn(`[alarm-store] 取消闹钟 #${id} 通知失败:`, error);
    }
    await repo.deleteAlarm(id);
    await get().loadAlarms();
  },

  toggleAlarm: async (id) => {
    // 读当前库内状态并按目标值置位，避免快速连点时「读-改-写」竞态
    const current = await repo.getAlarmById(id);
    if (!current) {
      throw new Error(`闹钟 #${id} 不存在`);
    }
    const toggled = await repo.setAlarmEnabled(id, !current.enabled);
    const adjustments = await repo.getAdjustments(id);
    get()._applyScheduleResult(
      await scheduleAlarmRinging(toggled, adjustments)
    );
    await get().loadAlarms();
  },

  addAdjustment: async (id, type, date) => {
    await repo.addAdjustment(id, type, date);
    const alarm = await repo.getAlarmById(id);
    if (alarm) {
      const adjustments = await repo.getAdjustments(id);
      get()._applyScheduleResult(
        await scheduleAlarmRinging(alarm, adjustments)
      );
    }
    await get().loadAlarms();
  },

  snooze: async (id) => {
    const alarm = await repo.getAlarmById(id);
    if (alarm) {
      try {
        await scheduleAlarmSnooze(alarm);
      } catch (error) {
        console.warn(`[alarm-store] 调度贪睡响铃失败（闹钟 #${id}）:`, error);
      }
    }
  },
}));

/**
 * 获取闹钟的下次响铃日期（用于列表展示）
 * 纯计算函数，不在 store 中缓存
 */
export async function getNextRingDate(alarm: Alarm): Promise<Date | null> {
  const adjustments = await repo.getAdjustments(alarm.id);
  return computeNextRingDate(alarm, adjustments);
}
