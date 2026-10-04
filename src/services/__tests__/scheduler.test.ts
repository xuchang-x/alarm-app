import { computeRingDatesInRange, computeNextRingDate } from '../scheduler';
import { formatDate, parseDate } from '../../utils/date';
import type { Alarm, AlarmAdjustment, AlarmType, Weekday } from '../../types/alarm';

/** 创建测试用闹钟 */
function makeAlarm(overrides: Partial<Alarm> & { type: AlarmType }): Alarm {
  return {
    id: 1,
    hour: 8,
    minute: 0,
    label: '',
    enabled: true,
    onceDate: null,
    weekdays: null,
    intervalDays: null,
    startDate: null,
    snoozeMinutes: 10,
    soundId: null,
    customSoundUri: null,
    customSoundTitle: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
    category: overrides.category ?? 'other',
  };
}

function makeAdjustment(
  overrides: Partial<AlarmAdjustment> & { type: 'skip' | 'add'; date: string }
): AlarmAdjustment {
  return {
    id: 1,
    alarmId: 1,
    createdAt: '',
    ...overrides,
  };
}

describe('computeRingDatesInRange — once 类型', () => {
  it('日期在范围内时返回该日期', () => {
    const alarm = makeAlarm({ type: 'once', onceDate: '2025-06-20' });
    const start = parseDate('2025-06-15');
    const end = parseDate('2025-06-25');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual(['2025-06-20']);
  });

  it('日期不在范围内时返回空', () => {
    const alarm = makeAlarm({ type: 'once', onceDate: '2025-06-20' });
    const start = parseDate('2025-06-21');
    const end = parseDate('2025-06-30');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates).toEqual([]);
  });

  it('onceDate 为 null 时返回空', () => {
    const alarm = makeAlarm({ type: 'once' });
    const start = parseDate('2025-06-15');
    const end = parseDate('2025-06-25');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates).toEqual([]);
  });
});

describe('computeRingDatesInRange — daily 类型', () => {
  it('范围内每天都有', () => {
    const alarm = makeAlarm({ type: 'daily' });
    const start = parseDate('2025-06-20');
    const end = parseDate('2025-06-22');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual([
      '2025-06-20',
      '2025-06-21',
      '2025-06-22',
    ]);
  });

  it('同一天返回 1 条', () => {
    const alarm = makeAlarm({ type: 'daily' });
    const date = parseDate('2025-06-20');
    const dates = computeRingDatesInRange(alarm, date, date);
    expect(dates.map(formatDate)).toEqual(['2025-06-20']);
  });
});

describe('computeRingDatesInRange — weekly 类型', () => {
  it('只返回选定星期的日期', () => {
    // 2025-06-16 是周一，2025-06-22 是周日
    const alarm = makeAlarm({
      type: 'weekly',
      weekdays: [1, 5] as Weekday[], // 周一、周五
    });
    const start = parseDate('2025-06-16');
    const end = parseDate('2025-06-22');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual([
      '2025-06-16', // 周一
      '2025-06-20', // 周五
    ]);
  });

  it('选择周日（7）能正确匹配', () => {
    const alarm = makeAlarm({
      type: 'weekly',
      weekdays: [7] as Weekday[], // 周日
    });
    const start = parseDate('2025-06-16'); // 周一
    const end = parseDate('2025-06-22'); // 周日
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual(['2025-06-22']);
  });

  it('weekdays 为空返回空', () => {
    const alarm = makeAlarm({ type: 'weekly', weekdays: [] });
    const start = parseDate('2025-06-16');
    const end = parseDate('2025-06-22');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates).toEqual([]);
  });
});

describe('computeRingDatesInRange — cycle 类型', () => {
  it('从起始日期开始按间隔计算', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 3,
      startDate: '2025-06-10',
    });
    const start = parseDate('2025-06-10');
    const end = parseDate('2025-06-20');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual([
      '2025-06-10',
      '2025-06-13',
      '2025-06-16',
      '2025-06-19',
    ]);
  });

  it('起始日在范围之前，正确跳到范围内', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 5,
      startDate: '2025-06-01',
    });
    const start = parseDate('2025-06-15');
    const end = parseDate('2025-06-25');
    // 从 6/1 开始每 5 天: 6/1, 6/6, 6/11, 6/16, 6/21, 6/26
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual(['2025-06-16', '2025-06-21']);
  });

  it('起始日在范围之后返回空', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 3,
      startDate: '2025-07-01',
    });
    const start = parseDate('2025-06-10');
    const end = parseDate('2025-06-20');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates).toEqual([]);
  });

  it('skip 调整正确跳过日期', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 3,
      startDate: '2025-06-10',
    });
    const adjustments: AlarmAdjustment[] = [
      makeAdjustment({ type: 'skip', date: '2025-06-13' }),
    ];
    const start = parseDate('2025-06-10');
    const end = parseDate('2025-06-20');
    const dates = computeRingDatesInRange(alarm, start, end, adjustments);
    expect(dates.map(formatDate)).toEqual([
      '2025-06-10',
      // 6/13 被跳过
      '2025-06-16',
      '2025-06-19',
    ]);
  });

  it('add 调整正确追加日期', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 5,
      startDate: '2025-06-10',
    });
    const adjustments: AlarmAdjustment[] = [
      makeAdjustment({ type: 'add', date: '2025-06-12' }),
    ];
    const start = parseDate('2025-06-10');
    const end = parseDate('2025-06-20');
    const dates = computeRingDatesInRange(alarm, start, end, adjustments);
    expect(dates.map(formatDate)).toEqual([
      '2025-06-10',
      '2025-06-12', // 追加
      '2025-06-15',
      '2025-06-20',
    ]);
  });

  it('intervalDays 为 null 返回空', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: null,
      startDate: '2025-06-10',
    });
    const start = parseDate('2025-06-10');
    const end = parseDate('2025-06-20');
    expect(computeRingDatesInRange(alarm, start, end)).toEqual([]);
  });

  it('跨月计算', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 10,
      startDate: '2025-06-25',
    });
    const start = parseDate('2025-06-25');
    const end = parseDate('2025-07-15');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual([
      '2025-06-25',
      '2025-07-05',
      '2025-07-15',
    ]);
  });

  it('跨年计算', () => {
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 15,
      startDate: '2025-12-20',
    });
    const start = parseDate('2025-12-20');
    const end = parseDate('2026-01-20');
    const dates = computeRingDatesInRange(alarm, start, end);
    expect(dates.map(formatDate)).toEqual([
      '2025-12-20',
      '2026-01-04',
      '2026-01-19',
    ]);
  });
});

describe('computeNextRingDate', () => {
  it('once 类型 — 未来日期返回该日期', () => {
    // 使用距今 30 天后的日期，确保在 365 天搜索范围内
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureDate = formatDate(future);
    const alarm = makeAlarm({ type: 'once', onceDate: futureDate });
    const next = computeNextRingDate(alarm);
    expect(next).not.toBeNull();
    expect(formatDate(next!)).toBe(futureDate);
  });

  it('once 类型 — 过去日期返回 null', () => {
    const alarm = makeAlarm({ type: 'once', onceDate: '2020-01-01' });
    const next = computeNextRingDate(alarm);
    expect(next).toBeNull();
  });

  it('daily 类型 — 总是返回一个日期', () => {
    const alarm = makeAlarm({ type: 'daily' });
    const next = computeNextRingDate(alarm);
    expect(next).not.toBeNull();
  });

  it('weekly 类型 — 返回未来的匹配星期', () => {
    const alarm = makeAlarm({
      type: 'weekly',
      weekdays: [1, 2, 3, 4, 5, 6, 7] as Weekday[], // 每天
    });
    const next = computeNextRingDate(alarm);
    expect(next).not.toBeNull();
  });

  it('cycle 类型 — 未来起始日期返回起始日', () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    const futureStart = formatDate(future);
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 7,
      startDate: futureStart,
    });
    const next = computeNextRingDate(alarm);
    expect(next).not.toBeNull();
    expect(formatDate(next!)).toBe(futureStart);
  });

  it('cycle 类型 — skip 后返回下一个未被跳过的日期', () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    const futureStart = formatDate(future);
    const futureNext = new Date(future);
    futureNext.setDate(futureNext.getDate() + 7);
    const futureNextStr = formatDate(futureNext);
    const alarm = makeAlarm({
      type: 'cycle',
      intervalDays: 7,
      startDate: futureStart,
    });
    const adjustments: AlarmAdjustment[] = [
      makeAdjustment({ type: 'skip', date: futureStart }),
    ];
    const next = computeNextRingDate(alarm, adjustments);
    expect(next).not.toBeNull();
    expect(formatDate(next!)).toBe(futureNextStr);
  });
});
