import { format, addDays, startOfDay, isBefore, isAfter, isEqual } from 'date-fns';

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
