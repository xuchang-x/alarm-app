import type { Alarm, AlarmAdjustment } from '@/types/alarm';

// useTodayOverview 顶层 import 了 alarm-store → alarm-repository → expo-sqlite，
// 单测只需要纯函数，mock 掉原生包避免模块加载失败
jest.mock('expo-sqlite', () => ({ openDatabaseSync: jest.fn() }));
jest.mock('@/db/alarm-repository', () => ({ getAdjustments: jest.fn() }));
jest.mock('@/services/notification', () => ({
  scheduleAlarmNotifications: jest.fn(),
  cancelAlarmNotifications: jest.fn(),
  scheduleSnooze: jest.fn(),
}));

import { deriveTodayOverview } from '../useTodayOverview';

/** 构造测试用闹钟对象（补默认字段） */
function makeAlarm(partial: Partial<Alarm> & Pick<Alarm, 'id' | 'type' | 'hour' | 'minute'>): Alarm {
  return {
    label: `提醒 ${partial.id}`,
    category: 'other',
    enabled: true,
    onceDate: null,
    weekdays: null,
    intervalDays: null,
    startDate: null,
    snoozeMinutes: 10,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...partial,
  };
}

/** 今天 + 指定时刻（真实系统时间会由 fake timers 固定） */
function atTime(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** 格式化为 YYYY-MM-DD（用本地时区，与业务代码一致） */
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('deriveTodayOverview', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('今日有 daily 闹钟：出现在 todayItems，nextRing 指向它', () => {
    jest.useFakeTimers().setSystemTime(atTime(10, 0));
    const alarms = [makeAlarm({ id: 1, type: 'daily', hour: 18, minute: 30 })];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.todayItems).toHaveLength(1);
    expect(overview.todayItems[0].alarm.id).toBe(1);
    expect(overview.todayItems[0].passed).toBe(false);
    expect(overview.nextRing?.alarm.id).toBe(1);
    expect(overview.nextRing?.daysUntil).toBe(0);
    expect(overview.greeting).toBe('今天有 1 个提醒');
  });

  it('已过时刻的今日实例标记 passed=true', () => {
    jest.useFakeTimers().setSystemTime(atTime(20, 0));
    const alarms = [makeAlarm({ id: 1, type: 'daily', hour: 8, minute: 0 })];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.todayItems[0].passed).toBe(true);
    // 已过的 daily，下一次是明天
    expect(overview.nextRing?.daysUntil).toBe(1);
  });

  it('todayItems 按时刻升序排列', () => {
    jest.useFakeTimers().setSystemTime(atTime(6, 0));
    const alarms = [
      makeAlarm({ id: 1, type: 'daily', hour: 20, minute: 0 }),
      makeAlarm({ id: 2, type: 'daily', hour: 7, minute: 30 }),
      makeAlarm({ id: 3, type: 'daily', hour: 9, minute: 0 }),
    ];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.todayItems.map((item) => item.alarm.id)).toEqual([2, 3, 1]);
  });

  it('nextRing 取时刻最近者（同日比时分）', () => {
    jest.useFakeTimers().setSystemTime(atTime(6, 0));
    const alarms = [
      makeAlarm({ id: 1, type: 'daily', hour: 15, minute: 0 }),
      makeAlarm({ id: 2, type: 'daily', hour: 9, minute: 0 }),
      makeAlarm({ id: 3, type: 'daily', hour: 12, minute: 0 }),
    ];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.nextRing?.alarm.id).toBe(2);
  });

  it('cycle 闹钟带节奏信息：4 天周期今天第 2 天（非响铃日仅挂 nextRing）', () => {
    const now = atTime(10, 0);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    jest.useFakeTimers().setSystemTime(now);
    const alarms = [
      makeAlarm({
        id: 1,
        type: 'cycle',
        hour: 18,
        minute: 0,
        intervalDays: 4,
        startDate: toDateString(yesterday),
      }),
    ];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    // 昨天是周期第 1 天，今天第 2 天，不是响铃日
    expect(overview.todayItems).toHaveLength(0);
    expect(overview.nextRing?.rhythm).toEqual({ intervalDays: 4, dayIndex: 2 });
    expect(overview.nextRing?.daysUntil).toBe(3);
  });

  it('cycle 闹钟的 skip 调整生效：今天被跳过则不出现在 todayItems', () => {
    const now = atTime(10, 0);
    const todayStr = toDateString(new Date(now));

    jest.useFakeTimers().setSystemTime(now);
    const alarms = [
      makeAlarm({ id: 1, type: 'cycle', hour: 18, minute: 0, intervalDays: 2, startDate: todayStr }),
    ];
    const adjustments = new Map<number, AlarmAdjustment[]>([
      [1, [{ id: 1, alarmId: 1, type: 'skip', date: todayStr, createdAt: '2025-01-01' }]],
    ]);
    const overview = deriveTodayOverview(alarms, adjustments, new Date());

    expect(overview.todayItems).toHaveLength(0);
    // 下一次是 2 天后
    expect(overview.nextRing?.daysUntil).toBe(2);
    expect(overview.greeting).toBe('今天没有提醒，下一个在 2 天后');
  });

  it('今天无提醒但有未来的 once 闹钟：greeting 指出还有几天', () => {
    jest.useFakeTimers().setSystemTime(atTime(10, 0));
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    const alarms = [
      makeAlarm({ id: 1, type: 'once', hour: 9, minute: 0, onceDate: toDateString(inThreeDays) }),
    ];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.todayItems).toHaveLength(0);
    expect(overview.nextRing?.daysUntil).toBe(3);
    expect(overview.greeting).toBe('今天没有提醒，下一个在 3 天后');
  });

  it('明天响的 once 闹钟：daysUntil=1，greeting 用「明天」', () => {
    jest.useFakeTimers().setSystemTime(atTime(10, 0));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const alarms = [
      makeAlarm({ id: 1, type: 'once', hour: 9, minute: 0, onceDate: toDateString(tomorrow) }),
    ];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.nextRing?.daysUntil).toBe(1);
    expect(overview.greeting).toBe('今天没有提醒，下一个在 明天');
  });

  it('已暂停的闹钟不参与任何计算', () => {
    jest.useFakeTimers().setSystemTime(atTime(10, 0));
    const alarms = [
      makeAlarm({ id: 1, type: 'daily', hour: 11, minute: 0, enabled: false }),
    ];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.todayItems).toHaveLength(0);
    expect(overview.nextRing).toBeNull();
    expect(overview.greeting).toBe('今天没有提醒');
  });

  it('空列表：全部为空态', () => {
    jest.useFakeTimers().setSystemTime(atTime(10, 0));
    const overview = deriveTodayOverview([], new Map(), new Date());

    expect(overview.nextRing).toBeNull();
    expect(overview.todayItems).toHaveLength(0);
    expect(overview.greeting).toBe('今天没有提醒');
  });

  it('今天有提醒时 greeting 不受未来 once 响铃影响', () => {
    jest.useFakeTimers().setSystemTime(atTime(6, 0));
    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);

    const alarms = [
      makeAlarm({ id: 1, type: 'daily', hour: 8, minute: 0 }),
      makeAlarm({ id: 2, type: 'once', hour: 9, minute: 0, onceDate: toDateString(inFiveDays) }),
    ];
    const overview = deriveTodayOverview(alarms, new Map(), new Date());

    expect(overview.greeting).toBe('今天有 1 个提醒');
    expect(overview.nextRing?.alarm.id).toBe(1);
  });
});
