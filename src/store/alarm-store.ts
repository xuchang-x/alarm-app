import { create } from 'zustand';
import type {
  Alarm,
  AdjustmentType,
  CreateAlarmInput,
  UpdateAlarmInput,
} from '@/types/alarm';
import * as repo from '@/db/alarm-repository';
import { computeNextRingDate } from '@/services/scheduler';
import {
  scheduleAlarmNotifications,
  cancelAlarmNotifications,
  scheduleSnooze as scheduleSnoozeNotification,
} from '@/services/notification';

interface AlarmStore {
  alarms: Alarm[];
  loading: boolean;

  /** 从数据库加载所有闹钟 */
  loadAlarms: () => Promise<void>;

  /** 创建闹钟 */
  createAlarm: (input: CreateAlarmInput) => Promise<Alarm>;

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

  loadAlarms: async () => {
    set({ loading: true });
    try {
      const alarms = await repo.getAllAlarms();
      set({ alarms });
    } finally {
      set({ loading: false });
    }
  },

  createAlarm: async (input) => {
    const alarm = await repo.createAlarm(input);
    const adjustments = await repo.getAdjustments(alarm.id);
    await scheduleAlarmNotifications(alarm, adjustments);
    await get().loadAlarms();
    return alarm;
  },

  updateAlarm: async (id, input) => {
    await repo.updateAlarm(id, input);
    const updated = await repo.getAlarmById(id);
    if (updated) {
      const adjustments = await repo.getAdjustments(id);
      await scheduleAlarmNotifications(updated, adjustments);
    }
    await get().loadAlarms();
  },

  deleteAlarm: async (id) => {
    await cancelAlarmNotifications(id);
    await repo.deleteAlarm(id);
    await get().loadAlarms();
  },

  toggleAlarm: async (id) => {
    const toggled = await repo.toggleAlarm(id);
    const adjustments = await repo.getAdjustments(id);
    await scheduleAlarmNotifications(toggled, adjustments);
    await get().loadAlarms();
  },

  addAdjustment: async (id, type, date) => {
    await repo.addAdjustment(id, type, date);
    const alarm = await repo.getAlarmById(id);
    if (alarm) {
      const adjustments = await repo.getAdjustments(id);
      await scheduleAlarmNotifications(alarm, adjustments);
    }
    await get().loadAlarms();
  },

  snooze: async (id) => {
    const alarm = await repo.getAlarmById(id);
    if (alarm) {
      await scheduleSnoozeNotification(alarm);
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
