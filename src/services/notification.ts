import { Platform } from 'react-native';
import { addMinutes } from 'date-fns';
import type { Alarm, AlarmAdjustment } from '@/types/alarm';
import { computeRingDatesInRange } from '@/services/scheduler';
import { today, addDaysToDate, makeNotificationId, formatTime } from '@/utils/date';
import {
  SCHEDULE_DAYS_AHEAD,
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
      sound: 'default',
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

/**
 * 为闹钟调度通知
 * daily/weekly 使用原生 repeat trigger，once/cycle 使用 date trigger
 */
export async function scheduleAlarmNotifications(
  alarm: Alarm,
  adjustments: AlarmAdjustment[] = []
): Promise<void> {
  if (!isAvailable()) return;

  // 先取消该闹钟已有的通知
  await cancelAlarmNotifications(alarm.id);

  if (!alarm.enabled) return;

  const description = getAlarmDescription(alarm);
  const label = alarm.label || description;

  switch (alarm.type) {
    case 'daily': {
      await Notifications!.scheduleNotificationAsync({
        identifier: `${NOTIFICATION_ID_PREFIX}-${alarm.id}-daily`,
        content: {
          title: label,
          body: description,
          categoryIdentifier: NOTIFICATION_CATEGORY,
          data: { alarmId: alarm.id },
          sound: 'default',
        },
        trigger: {
          type: Notifications!.SchedulableTriggerInputTypes.DAILY,
          channelId: 'alarm-channel',
          hour: alarm.hour,
          minute: alarm.minute,
        },
      });
      break;
    }

    case 'weekly': {
      if (!alarm.weekdays) break;
      for (const weekday of alarm.weekdays) {
        await Notifications!.scheduleNotificationAsync({
          identifier: `${NOTIFICATION_ID_PREFIX}-${alarm.id}-weekly-${weekday}`,
          content: {
            title: label,
            body: description,
            categoryIdentifier: NOTIFICATION_CATEGORY,
            data: { alarmId: alarm.id },
            sound: 'default',
          },
          trigger: {
            type: Notifications!.SchedulableTriggerInputTypes.WEEKLY,
            channelId: 'alarm-channel',
            weekday: weekday === 7 ? 1 : weekday + 1,
            hour: alarm.hour,
            minute: alarm.minute,
          },
        });
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
        const triggerDate = new Date(date);
        triggerDate.setHours(alarm.hour, alarm.minute, 0, 0);

        if (triggerDate <= new Date()) continue;

        await Notifications!.scheduleNotificationAsync({
          identifier: makeNotificationId(alarm.id, date),
          content: {
            title: label,
            body: description,
            categoryIdentifier: NOTIFICATION_CATEGORY,
            data: { alarmId: alarm.id },
            sound: 'default',
          },
          trigger: {
            type: Notifications!.SchedulableTriggerInputTypes.DATE,
            channelId: 'alarm-channel',
            date: triggerDate,
          },
        });
      }
      break;
    }
  }
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
      sound: 'default',
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
