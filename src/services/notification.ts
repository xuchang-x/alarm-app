import { Platform } from 'react-native';
import { addMinutes } from 'date-fns';
import type { Alarm, AlarmAdjustment } from '@/types/alarm';
import { computeRingDatesInRange } from '@/services/scheduler';
import { today, addDaysToDate, makeNotificationId, formatTime, formatDate } from '@/utils/date';
import {
  SCHEDULE_DAYS_AHEAD,
  SCHEDULE_MAX_PER_ALARM,
  NOTIFICATION_CATEGORY,
  NOTIFICATION_ID_PREFIX,
} from '@/constants';

/**
 * 动态导入 expo-notifications
 * Expo Go（SDK 53+）中该模块加载即抛异常，通过 try-catch 降级为空操作
 */
let Notifications: typeof import('expo-notifications') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
} catch {
  console.warn('expo-notifications 不可用（可能在 Expo Go 中运行），通知功能已禁用');
}

/** 通知是否可用 */
function isAvailable(): boolean {
  return Notifications !== null;
}

export type NotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unavailable';

/** 获取当前通知权限，供设置页展示。 */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!isAvailable()) return 'unavailable';
  const { status } = await Notifications!.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/** 配置前台通知处理 */
export function setupNotificationHandler(): void {
  if (!isAvailable()) return;
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** 注册通知 category（贪睡 + 关闭按钮） */
export async function setupNotificationCategory(): Promise<void> {
  if (!isAvailable()) return;
  await Notifications!.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
    {
      identifier: 'snooze',
      buttonTitle: '稍后提醒',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'dismiss',
      buttonTitle: '关闭',
      options: { isDestructive: true },
    },
  ]);
}

/** 创建 Android 通知频道 */
export async function setupNotificationChannel(): Promise<void> {
  if (!isAvailable()) return;
  if (Platform.OS === 'android') {
    await Notifications!.setNotificationChannelAsync('alarm-channel', {
      name: '闹钟提醒',
      importance: Notifications!.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

/** 申请通知权限 */
export async function requestPermissions(): Promise<boolean> {
  if (!isAvailable()) return false;
  const { status: existingStatus } =
    await Notifications!.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications!.requestPermissionsAsync();
  return status === 'granted';
}

/** 生成闹钟描述文本 */
function getAlarmDescription(alarm: Alarm): string {
  const time = formatTime(alarm.hour, alarm.minute);
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

/** 调度结果：区分「成功」「无通知能力」「调度失败」三类，供上层决策 */
export type ScheduleResult =
  | { ok: true; scheduled: number; truncated: boolean }
  | { ok: false; reason: 'unavailable' | 'error'; error?: unknown };

function buildNotificationContent(
  alarm: Alarm,
  description: string
): {
  title: string;
  body: string;
  categoryIdentifier: string;
  data: { alarmId: number };
  sound: boolean;
} {
  return {
    title: alarm.label || description,
    body: description,
    categoryIdentifier: NOTIFICATION_CATEGORY,
    data: { alarmId: alarm.id },
    sound: true,
  };
}

/**
 * 为闹钟调度通知
 * daily/weekly 使用原生 repeat trigger，once/cycle 使用 date trigger。
 *
 * once/cycle 按 SCHEDULE_MAX_PER_ALARM 截断，避免超出系统调度上限
 * （iOS 最多 64 条，超限会被系统静默丢弃）；截断后依赖回前台补排继续往后续。
 * 单条调度失败不中断整体（保留已调度部分），返回结果供上层提示。
 */
export async function scheduleAlarmNotifications(
  alarm: Alarm,
  adjustments: AlarmAdjustment[] = []
): Promise<ScheduleResult> {
  if (!isAvailable()) return { ok: false, reason: 'unavailable' };

  // 先取消该闹钟已有的通知（若权限被拒导致后续失败，旧通知也不残留）
  try {
    await cancelAlarmNotifications(alarm.id);
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }

  if (!alarm.enabled) return { ok: true, scheduled: 0, truncated: false };

  const description = getAlarmDescription(alarm);
  const content = buildNotificationContent(alarm, description);
  let scheduled = 0;
  let truncated = false;
  let failed = false;

  switch (alarm.type) {
    case 'daily': {
      try {
        await Notifications!.scheduleNotificationAsync({
          identifier: `${NOTIFICATION_ID_PREFIX}-${alarm.id}-daily`,
          content,
          trigger: {
            type: Notifications!.SchedulableTriggerInputTypes.DAILY,
            channelId: 'alarm-channel',
            hour: alarm.hour,
            minute: alarm.minute,
          },
        });
        scheduled = 1;
      } catch (error) {
        failed = true;
        console.warn(`[notification] 调度 daily 闹钟 #${alarm.id} 失败:`, error);
      }
      break;
    }

    case 'weekly': {
      if (!alarm.weekdays) break;
      for (const weekday of alarm.weekdays) {
        try {
          await Notifications!.scheduleNotificationAsync({
            identifier: `${NOTIFICATION_ID_PREFIX}-${alarm.id}-weekly-${weekday}`,
            content,
            trigger: {
              type: Notifications!.SchedulableTriggerInputTypes.WEEKLY,
              channelId: 'alarm-channel',
              weekday: weekday === 7 ? 1 : weekday + 1,
              hour: alarm.hour,
              minute: alarm.minute,
            },
          });
          scheduled += 1;
        } catch (error) {
          failed = true;
          console.warn(
            `[notification] 调度 weekly 闹钟 #${alarm.id} 星期${weekday} 失败:`,
            error
          );
        }
      }
      break;
    }

    case 'once':
    case 'cycle': {
      const rangeStart = today();
      const rangeEnd = addDaysToDate(rangeStart, SCHEDULE_DAYS_AHEAD);
      const dates = computeRingDatesInRange(
        alarm,
        rangeStart,
        rangeEnd,
        adjustments
      );

      for (const date of dates) {
        if (scheduled >= SCHEDULE_MAX_PER_ALARM) {
          truncated = true;
          break;
        }
        const triggerDate = new Date(date);
        triggerDate.setHours(alarm.hour, alarm.minute, 0, 0);

        if (triggerDate <= new Date()) continue;

        try {
          await Notifications!.scheduleNotificationAsync({
            identifier: makeNotificationId(alarm.id, date),
            content,
            trigger: {
              type: Notifications!.SchedulableTriggerInputTypes.DATE,
              channelId: 'alarm-channel',
              date: triggerDate,
            },
          });
          scheduled += 1;
        } catch (error) {
          failed = true;
          console.warn(
            `[notification] 调度闹钟 #${alarm.id} ${formatDate(date)} 失败:`,
            error
          );
        }
      }
      break;
    }
  }

  if (failed && scheduled === 0) {
    return { ok: false, reason: 'error' };
  }
  return { ok: true, scheduled, truncated };
}

/** 取消指定闹钟的所有通知 */
export async function cancelAlarmNotifications(
  alarmId: number
): Promise<void> {
  if (!isAvailable()) return;
  const scheduled =
    await Notifications!.getAllScheduledNotificationsAsync();
  const prefix = `${NOTIFICATION_ID_PREFIX}-${alarmId}-`;
  const toCancel = scheduled
    .filter((n) => n.identifier.startsWith(prefix))
    .map((n) => n.identifier);

  for (const id of toCancel) {
    await Notifications!.cancelScheduledNotificationAsync(id);
  }
}

/** 调度一条贪睡通知 */
export async function scheduleSnooze(alarm: Alarm): Promise<void> {
  if (!isAvailable()) return;
  const snoozeDate = addMinutes(new Date(), alarm.snoozeMinutes);
  const description = getAlarmDescription(alarm);

  await Notifications!.scheduleNotificationAsync({
    identifier: `${NOTIFICATION_ID_PREFIX}-${alarm.id}-snooze-${Date.now()}`,
    content: {
      title: alarm.label || description,
      body: `${alarm.snoozeMinutes} 分钟后再次提醒`,
      categoryIdentifier: NOTIFICATION_CATEGORY,
      data: { alarmId: alarm.id },
      sound: true,
    },
    trigger: {
      type: Notifications!.SchedulableTriggerInputTypes.DATE,
      channelId: 'alarm-channel',
      date: snoozeDate,
    },
  });
}

/** 检查并补充调度（App 启动时调用） */
export async function replenishNotifications(
  alarms: Alarm[],
  getAdjustments: (alarmId: number) => Promise<AlarmAdjustment[]>
): Promise<void> {
  if (!isAvailable()) return;
  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    if (alarm.type === 'daily' || alarm.type === 'weekly') continue;

    const adjustments = await getAdjustments(alarm.id);
    await scheduleAlarmNotifications(alarm, adjustments);
  }
}

/**
 * 注册通知响应监听器（安全版本）
 * 在 Expo Go 中返回 null
 */
export function addNotificationResponseListener(
  listener: (response: import('expo-notifications').NotificationResponse) => void
): { remove: () => void } | null {
  if (!isAvailable()) return null;
  return Notifications!.addNotificationResponseReceivedListener(listener);
}
