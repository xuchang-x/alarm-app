import { Platform } from 'react-native';
import { addMinutes } from 'date-fns';
import type { Alarm, AlarmAdjustment } from '@/types/alarm';
import {
  getAlarmDescription,
  computeTriggerTimestamps,
} from '@/services/scheduler';
import { makeNotificationId, formatDate } from '@/utils/date';
import { NOTIFICATION_CATEGORY, NOTIFICATION_ID_PREFIX } from '@/constants';

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
 * 为闹钟调度通知。
 *
 * 四类闹钟统一逐日物化（含 daily/weekly，不用系统 DAILY/WEEKLY repeating
 * trigger）：与原生响铃层 computeTriggerTimestamps 同源，skip 调整对四类
 * 闹钟语义一致。按 SCHEDULE_MAX_PER_ALARM 截断，避免超出系统调度上限
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
  const { timestamps, truncated } = computeTriggerTimestamps(alarm, adjustments);
  let scheduled = 0;
  let failed = false;

  for (const timestamp of timestamps) {
    const triggerDate = new Date(timestamp);
    try {
      await Notifications!.scheduleNotificationAsync({
        identifier: makeNotificationId(alarm.id, triggerDate),
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
        `[notification] 调度闹钟 #${alarm.id} ${formatDate(triggerDate)} 失败:`,
        error
      );
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

/** 检查并补充调度（App 启动时调用）。四类闹钟统一补排：逐日物化后同样受 60 条截断约束，截断续期依赖本函数在回前台时续上。 */
export async function replenishNotifications(
  alarms: Alarm[],
  getAdjustments: (alarmId: number) => Promise<AlarmAdjustment[]>
): Promise<void> {
  if (!isAvailable()) return;
  for (const alarm of alarms) {
    if (!alarm.enabled) continue;

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
