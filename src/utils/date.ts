import {
  format,
  addDays,
  startOfDay,
  isBefore,
  isAfter,
  isEqual,
  differenceInCalendarDays,
} from 'date-fns';

/** 格式化日期为 'YYYY-MM-DD' */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** 获取今天的日期（零时零分零秒） */
export function today(): Date {
  return startOfDay(new Date());
}

/** 日期加 N 天 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/** a 在 b 之前（不含等于） */
export function isDateBefore(a: Date, b: Date): boolean {
  return isBefore(a, b);
}

/** a 在 b 之后（不含等于） */
export function isDateAfter(a: Date, b: Date): boolean {
  return isAfter(a, b);
}

/** a 和 b 是同一天 */
export function isDateEqual(a: Date, b: Date): boolean {
  return isEqual(startOfDay(a), startOfDay(b));
}

/** 解析 'YYYY-MM-DD' 字符串为 Date，返回当天零时 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** 生成通知 ID */
export function makeNotificationId(alarmId: number, date: Date): string {
  return `alarm-${alarmId}-${format(date, 'yyyyMMdd')}`;
}

/** 格式化时间为 HH:MM */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 周期节奏描述：今天是这个 N 天周期里的第几天 */
export interface CycleRhythm {
  /** 周期总天数 */
  intervalDays: number;
  /** 今天是周期内第几天，1 起 */
  dayIndex: number;
}

/**
 * 计算周期闹钟在参考日期上的节奏位置。
 *
 * @param startDate 周期起始日期 'YYYY-MM-DD'
 * @param intervalDays 周期间隔天数
 * @param reference 参考日期（通常为今天）
 * @returns 周期已开始时返回 { intervalDays, dayIndex }；未开始或参数非法返回 null
 */
export function getCycleRhythm(
  startDate: string,
  intervalDays: number,
  reference: Date
): CycleRhythm | null {
  if (!startDate || !Number.isFinite(intervalDays) || intervalDays <= 0) {
    return null;
  }
  const start = startOfDay(parseDate(startDate));
  const ref = startOfDay(reference);
  const diffDays = differenceInCalendarDays(ref, start);
  if (diffDays < 0) return null;
  return {
    intervalDays,
    dayIndex: (diffDays % intervalDays) + 1,
  };
}

/**
 * 计算目标日期距参考日期还有多少天（按自然日，同一天为 0）。
 *
 * @param target 目标日期
 * @param reference 参考日期，通常为今天
 */
export function daysUntil(target: Date, reference: Date): number {
  return differenceInCalendarDays(startOfDay(target), startOfDay(reference));
}
