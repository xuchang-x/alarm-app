import { Platform } from 'react-native';
import type { Alarm, AlarmAdjustment } from '@/types/alarm';
import { computeRingDatesInRange } from '@/services/scheduler';
import {
  SCHEDULE_DAYS_AHEAD,
  SCHEDULE_MAX_PER_ALARM,
} from '@/constants';
import { DEFAULT_SOUND_ID, findSoundPreset } from '@/constants/sounds';
import {
  scheduleAlarmNotifications,
  cancelAlarmNotifications,
  scheduleSnooze as scheduleSnoozeNotification,
  replenishNotifications,
} from '@/services/notification';
import type { ScheduleResult } from '@/services/notification';

export type { ScheduleResult };
import { AlarmRing } from '../../modules/alarm-ring/src/index';

/**
 * 响铃调度统一入口（平台分发）：
 *
 * - Android（dev build）：走本地原生模块 modules/alarm-ring —— AlarmManager 精确触发
 *   + 前台服务 MediaPlayer 循环播放，ringDurationSeconds 到时自停（真「循环够 30 秒」）。
 * - iOS / Expo Go / 模块不可用：降级走原 expo-notifications 路径（一声提示音）。
 *
 * store 层不感知平台差异，调用语义与原 notification.ts 保持一致。
 */

/** 响铃循环播放的目标时长（秒）：短音循环补齐、长音截断。改 50s 只改这里。 */
const RING_DURATION_SECONDS = 30;

/** 原生模块类型（modules/alarm-ring，仅 Android 存在，否则为 null） */
type AlarmRingModule = NonNullable<typeof AlarmRing>;

function getNative(): AlarmRingModule | null {
  return AlarmRing;
}

function isAndroidNative(): boolean {
  return getNative() !== null;
}

/** 生成闹钟描述文本（与 notification.ts 保持一致的用户可见文案） */
function getAlarmDescription(alarm: Alarm): string {
  const time = `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
  switch (alarm.type) {
    case 'once':
      return `一次性闹钟 ${time}`;
    case 'daily':
      return `每天 ${time}`;
    case 'weekly':
      return `每周 ${time}`;
    case 'cycle':
      return `每${alarm.intervalDays}天 ${time}`;
    default:
      return `闹钟 ${time}`;
  }
}

/**
 * 计算单个闹钟未来 RING_DURATION 内的全部触发时间戳（Android 原生路径用）。
 * daily/weekly 统一按「逐日展开 + 按规则过滤」，替代原通知库的 DAILY/WEEKLY trigger，
 * 保证四类闹钟在原生侧的调度策略一致（触发后原生链式排下一个）。
 */
function computeTriggerTimestamps(
  alarm: Alarm,
  adjustments: AlarmAdjustment[]
): number[] {
  const rangeStart = new Date();
  const rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + SCHEDULE_DAYS_AHEAD);

  const dates = computeRingDatesInRange(alarm, rangeStart, rangeEnd, adjustments);
  const timestamps: number[] = [];

  for (const date of dates) {
    if (timestamps.length >= SCHEDULE_MAX_PER_ALARM) break;
    const triggerAt = new Date(date);
    triggerAt.setHours(alarm.hour, alarm.minute, 0, 0);
    if (triggerAt.getTime() > Date.now()) {
      timestamps.push(triggerAt.getTime());
    }
  }
  return timestamps;
}

/**
 * 铃声字段透传（007）：本地音乐 URI 优先；选了本地音乐时 soundId 置 null
 * （避免 URI 失效后回退到已不相关的内置音）；否则用内置音，老数据/未知 id
 * 兑底默认音。soundId 传的是 raw 资源名（`ars_` 前缀），映射在此完成，
 * 原生层直接 getIdentifier 查 res/raw。
 */
function computeSoundFields(
  alarm: Alarm
): { soundId: string | null; soundUri: string | null } {
  if (alarm.customSoundUri) {
    return { soundId: null, soundUri: alarm.customSoundUri };
  }
  const preset =
    findSoundPreset(alarm.soundId) ?? findSoundPreset(DEFAULT_SOUND_ID);
  return { soundId: preset?.rawName ?? null, soundUri: null };
}

/**
 * 为闹钟调度响铃（Android 原生 / 其他平台通知，二选一）
 * 语义与原 scheduleAlarmNotifications 一致：先取消旧的再排新的。
 */
export async function scheduleAlarmRinging(
  alarm: Alarm,
  adjustments: AlarmAdjustment[] = []
): Promise<ScheduleResult> {
  if (isAndroidNative()) {
    const native = getNative()!;
    try {
      await native.cancelAlarm(alarm.id);
    } catch (error) {
      return { ok: false, reason: 'error', error };
    }

    if (!alarm.enabled) return { ok: true, scheduled: 0, truncated: false };

    const triggers = computeTriggerTimestamps(alarm, adjustments);
    const description = getAlarmDescription(alarm);
    const sound = computeSoundFields(alarm);

    try {
      await native.syncAlarms([{
        alarmId: alarm.id,
        title: alarm.label || description,
        body: description,
        triggers,
        snoozeMinutes: alarm.snoozeMinutes,
        ringDurationSeconds: RING_DURATION_SECONDS,
        soundId: sound.soundId,
        soundUri: sound.soundUri,
      }]);
    } catch (error) {
      return { ok: false, reason: 'error', error };
    }

    return {
      ok: true,
      scheduled: triggers.length,
      truncated: triggers.length >= SCHEDULE_MAX_PER_ALARM,
    };
  }

  // 降级：原 expo-notifications 路径（iOS / Expo Go）
  return scheduleAlarmNotifications(alarm, adjustments);
}

/** 取消指定闹钟的响铃调度 */
export async function cancelAlarmRinging(alarmId: number): Promise<void> {
  if (isAndroidNative()) {
    await getNative()!.cancelAlarm(alarmId);
    return;
  }
  await cancelAlarmNotifications(alarmId);
}

/** 贪睡：Android 原生直接追加触发；其他平台排一条贪睡通知 */
export async function scheduleAlarmSnooze(alarm: Alarm): Promise<void> {
  if (isAndroidNative()) {
    await getNative()!.scheduleSnooze(alarm.id);
    return;
  }
  await scheduleSnoozeNotification(alarm);
}

/** 启动/回前台时的补排兜底（App 被杀后原生层自身可靠，此处主要兜截断续期） */
export async function replenishAlarmRinging(
  alarms: Alarm[],
  getAdjustments: (alarmId: number) => Promise<AlarmAdjustment[]>
): Promise<void> {
  if (isAndroidNative()) {
    const native = getNative()!;
    const plans = [];
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const adjustments = await getAdjustments(alarm.id);
      const triggers = computeTriggerTimestamps(alarm, adjustments);
      if (triggers.length === 0) continue;
      const description = getAlarmDescription(alarm);
      const sound = computeSoundFields(alarm);
      plans.push({
        alarmId: alarm.id,
        title: alarm.label || description,
        body: description,
        triggers,
        snoozeMinutes: alarm.snoozeMinutes,
        ringDurationSeconds: RING_DURATION_SECONDS,
        soundId: sound.soundId,
        soundUri: sound.soundUri,
      });
    }
    if (plans.length > 0) {
      await native.syncAlarms(plans);
    }
    return;
  }
  await replenishNotifications(alarms, getAdjustments);
}

/** 精确闹钟权限是否可用（仅 Android 有意义，供设置页提示） */
export function canScheduleExactAlarms(): boolean {
  if (!isAndroidNative()) return false;
  try {
    return getNative()!.canScheduleExactAlarms();
  } catch {
    return false;
  }
}

/** 停止当前响铃（用户在 App 内主动停止时调用） */
export async function stopRinging(): Promise<void> {
  if (!isAndroidNative()) return;
  await getNative()!.stopRinging();
}
