import { addDays, differenceInCalendarDays, getDay, startOfDay } from 'date-fns';
import type { Alarm, AlarmAdjustment, Weekday } from '@/types/alarm';
import {
  today,
  parseDate,
  isDateBefore,
  isDateAfter,
  formatDate,
} from '@/utils/date';

/**
 * 计算闹钟在指定范围内的所有响铃日期
 *
 * @param alarm 闹钟数据
 * @param rangeStart 范围起始日期（含）
 * @param rangeEnd 范围结束日期（含）
 * @param adjustments 调整记录（仅 cycle 类型需要）
 * @returns 响铃日期数组，按日期升序排列
 */
export function computeRingDatesInRange(
  alarm: Alarm,
  rangeStart: Date,
  rangeEnd: Date,
  adjustments: AlarmAdjustment[] = []
): Date[] {
  switch (alarm.type) {
    case 'once':
      return computeOnceDates(alarm, rangeStart, rangeEnd);
    case 'daily':
      return computeDailyDates(rangeStart, rangeEnd);
    case 'weekly':
      return computeWeeklyDates(alarm, rangeStart, rangeEnd);
    case 'cycle':
      return computeCycleDates(alarm, rangeStart, rangeEnd, adjustments);
    default:
      return [];
  }
}

/**
 * 计算闹钟的下一次响铃日期
 *
 * @param alarm 闹钟数据
 * @param adjustments 调整记录（仅 cycle 类型需要）
 * @returns 下一次响铃日期，无则返回 null
 */
export function computeNextRingDate(
  alarm: Alarm,
  adjustments: AlarmAdjustment[] = []
): Date | null {
  const now = new Date();
  const todayDate = today();

  // 判断今天的闹钟时间是否已过
  const todayAlarmTime = new Date(todayDate);
  todayAlarmTime.setHours(alarm.hour, alarm.minute, 0, 0);
  const todayPassed = now > todayAlarmTime;

  // 搜索范围：从今天开始往后 365 天（足够找到下一次）
  const searchStart = todayPassed ? addDays(todayDate, 1) : todayDate;
  const searchEnd = addDays(todayDate, 365);

  const dates = computeRingDatesInRange(
    alarm,
    searchStart,
    searchEnd,
    adjustments
  );
  return dates.length > 0 ? dates[0] : null;
}

/** 一次性闹钟：如果日期在范围内则返回 */
function computeOnceDates(
  alarm: Alarm,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (!alarm.onceDate) return [];
  const date = startOfDay(parseDate(alarm.onceDate));
  if (
    !isDateBefore(date, rangeStart) &&
    !isDateAfter(date, rangeEnd)
  ) {
    return [date];
  }
  return [];
}

/** 每天重复：范围内每天 */
function computeDailyDates(rangeStart: Date, rangeEnd: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  while (!isDateAfter(current, end)) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

/** 按星期重复：范围内匹配的星期几 */
function computeWeeklyDates(
  alarm: Alarm,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (!alarm.weekdays || alarm.weekdays.length === 0) return [];

  // 转换：我们的 1=周一..7=周日，JS getDay() 返回 0=周日..6=周六
  const jsWeekdays = new Set(
    alarm.weekdays.map((wd: Weekday) => (wd % 7))
  );

  const dates: Date[] = [];
  let current = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  while (!isDateAfter(current, end)) {
    if (jsWeekdays.has(getDay(current))) {
      dates.push(current);
    }
    current = addDays(current, 1);
  }
  return dates;
}

/** 按间隔周期：从 startDate 开始每隔 intervalDays 天，过滤 skip、追加 add */
function computeCycleDates(
  alarm: Alarm,
  rangeStart: Date,
  rangeEnd: Date,
  adjustments: AlarmAdjustment[]
): Date[] {
  if (!alarm.startDate || !alarm.intervalDays || alarm.intervalDays <= 0) {
    return [];
  }

  const cycleStart = startOfDay(parseDate(alarm.startDate));
  const interval = alarm.intervalDays;

  // 收集 skip 和 add 日期
  const skipDates = new Set(
    adjustments.filter((a) => a.type === 'skip').map((a) => a.date)
  );
  const addDates = adjustments
    .filter((a) => a.type === 'add')
    .map((a) => startOfDay(parseDate(a.date)))
    .filter(
      (d) => !isDateBefore(d, rangeStart) && !isDateAfter(d, rangeEnd)
    );

  const dates: Date[] = [];

  // 计算第一个在 rangeStart 当天或之后的周期日期
  let current: Date;
  if (!isDateBefore(rangeStart, cycleStart)) {
    // rangeStart >= cycleStart
    const diffDays = differenceInCalendarDays(startOfDay(rangeStart), cycleStart);
    const skipCycles = Math.floor(diffDays / interval);
    current = addDays(cycleStart, skipCycles * interval);
    if (isDateBefore(current, rangeStart)) {
      current = addDays(current, interval);
    }
  } else {
    // rangeStart < cycleStart
    current = cycleStart;
  }

  const end = startOfDay(rangeEnd);
  while (!isDateAfter(current, end)) {
    const dateStr = formatDate(current);
    if (!skipDates.has(dateStr)) {
      dates.push(current);
    }
    current = addDays(current, interval);
  }

  // 追加 add 日期并排序
  dates.push(...addDates);
  dates.sort((a, b) => a.getTime() - b.getTime());

  return dates;
}
