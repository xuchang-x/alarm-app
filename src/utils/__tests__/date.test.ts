import {
  formatDate,
  today,
  addDaysToDate,
  isDateBefore,
  isDateAfter,
  isDateEqual,
  parseDate,
  makeNotificationId,
  formatTime,
  getCycleRhythm,
  daysUntil,
} from '../date';

describe('formatDate', () => {
  it('应将 Date 格式化为 YYYY-MM-DD', () => {
    const date = new Date(2025, 0, 5); // 2025-01-05
    expect(formatDate(date)).toBe('2025-01-05');
  });

  it('月份和日期应补零', () => {
    const date = new Date(2025, 2, 3); // 2025-03-03
    expect(formatDate(date)).toBe('2025-03-03');
  });
});

describe('today', () => {
  it('返回今天零点', () => {
    const t = today();
    expect(t.getHours()).toBe(0);
    expect(t.getMinutes()).toBe(0);
    expect(t.getSeconds()).toBe(0);
  });
});

describe('addDaysToDate', () => {
  it('日期加 N 天', () => {
    const base = new Date(2025, 0, 1);
    const result = addDaysToDate(base, 10);
    expect(formatDate(result)).toBe('2025-01-11');
  });

  it('跨月', () => {
    const base = new Date(2025, 0, 30);
    const result = addDaysToDate(base, 3);
    expect(formatDate(result)).toBe('2025-02-02');
  });

  it('跨年', () => {
    const base = new Date(2025, 11, 30);
    const result = addDaysToDate(base, 5);
    expect(formatDate(result)).toBe('2026-01-04');
  });
});

describe('isDateBefore / isDateAfter / isDateEqual', () => {
  const a = new Date(2025, 0, 1);
  const b = new Date(2025, 0, 2);

  it('a 在 b 之前', () => {
    expect(isDateBefore(a, b)).toBe(true);
    expect(isDateBefore(b, a)).toBe(false);
  });

  it('a 在 b 之后', () => {
    expect(isDateAfter(b, a)).toBe(true);
    expect(isDateAfter(a, b)).toBe(false);
  });

  it('相同日期相等', () => {
    expect(isDateEqual(a, new Date(2025, 0, 1))).toBe(true);
    expect(isDateEqual(a, b)).toBe(false);
  });
});

describe('parseDate', () => {
  it('解析 YYYY-MM-DD 字符串为 Date', () => {
    const date = parseDate('2025-06-15');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(5); // 0-indexed
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
  });
});

describe('makeNotificationId', () => {
  it('生成 alarm-{id}-{YYYYMMDD} 格式', () => {
    const date = new Date(2025, 5, 20); // 2025-06-20
    expect(makeNotificationId(3, date)).toBe('alarm-3-20250620');
  });
});

describe('formatTime', () => {
  it('时分补零', () => {
    expect(formatTime(8, 5)).toBe('08:05');
    expect(formatTime(23, 59)).toBe('23:59');
    expect(formatTime(0, 0)).toBe('00:00');
  });
});

describe('getCycleRhythm', () => {
  it('起始日当天是周期第 1 天', () => {
    const rhythm = getCycleRhythm('2025-01-01', 4, new Date(2025, 0, 1));
    expect(rhythm).toEqual({ intervalDays: 4, dayIndex: 1 });
  });

  it('周期内第 2 天', () => {
    const rhythm = getCycleRhythm('2025-01-01', 4, new Date(2025, 0, 2));
    expect(rhythm).toEqual({ intervalDays: 4, dayIndex: 2 });
  });

  it('跨多个周期后取模：第 9 天回到第 1 天（4 天周期）', () => {
    // 2025-01-01 起得 4 天周期：1,5,9,13…都是第 1 天
    const rhythm = getCycleRhythm('2025-01-01', 4, new Date(2025, 0, 9));
    expect(rhythm).toEqual({ intervalDays: 4, dayIndex: 1 });
  });

  it('参考日在起始日之前（周期未开始）返回 null', () => {
    const rhythm = getCycleRhythm('2025-01-10', 3, new Date(2025, 0, 1));
    expect(rhythm).toBeNull();
  });

  it('跨月边界正确计算', () => {
    // 2025-01-30 起 2 天周期：1/30、2/1 都是第 1 天
    const rhythm = getCycleRhythm('2025-01-30', 2, new Date(2025, 1, 1));
    expect(rhythm).toEqual({ intervalDays: 2, dayIndex: 1 });
  });

  it('非法参数返回 null', () => {
    expect(getCycleRhythm('', 4, new Date(2025, 0, 1))).toBeNull();
    expect(getCycleRhythm('2025-01-01', 0, new Date(2025, 0, 1))).toBeNull();
    expect(getCycleRhythm('2025-01-01', -2, new Date(2025, 0, 1))).toBeNull();
    expect(getCycleRhythm('2025-01-01', NaN, new Date(2025, 0, 1))).toBeNull();
  });
});

describe('daysUntil', () => {
  it('同一天为 0', () => {
    expect(daysUntil(new Date(2025, 0, 5), new Date(2025, 0, 5))).toBe(0);
  });

  it('未来日期为正数', () => {
    expect(daysUntil(new Date(2025, 0, 10), new Date(2025, 0, 5))).toBe(5);
  });

  it('过去日期为负数', () => {
    expect(daysUntil(new Date(2025, 0, 1), new Date(2025, 0, 5))).toBe(-4);
  });

  it('忽略时分秒按自然日计算', () => {
    expect(
      daysUntil(new Date(2025, 0, 6, 8, 30), new Date(2025, 0, 5, 23, 59))
    ).toBe(1);
  });
});
