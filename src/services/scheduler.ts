import { addDays, differenceInCalendarDays, getDay, startOfDay } from 'date-fns';
import type { Alarm, AlarmAdjustment, Weekday } from '@/types/alarm';
import {
  today,
  parseDate,
  isDateBefore,
  isDateAfter,
  formatDate,
  addDaysToDate,
  formatTime,
} from '@/utils/date';
import {
  SCHEDULE_DAYS_AHEAD,
  SCHEDULE_MAX_PER_ALARM,
} from '@/constants';

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
  // 天级归一：once/cycle 的响铃日期均为当天零时时间戳，若调用方传入含当天
  // 时刻的 rangeStart（如响铃调度直接传 new Date()），精确时间戳比较会把
  // 「当天」误判为已过去而丢弃，导致当天的一次性/周期闹钟不响。统一归一
  // 到当天零时，具体时刻是否已过由调用方（computeTriggerTimestamps 的
  // > Date.now()）过滤。
  const start = startOfDay(rangeStart);
  switch (alarm.type) {
    case 'once':
      return computeOnceDates(alarm, start, rangeEnd);
    case 'daily':
      return computeDailyDates(start, rangeEnd, adjustments);
    case 'weekly':
      return computeWeeklyDates(alarm, start, rangeEnd, adjustments);
    case 'cycle':
      return computeCycleDates(alarm, start, rangeEnd, adjustments);
    default:
      return [];
  }
}

/** 收集 skip 日期集合（四类闹钟统一过滤规则） */
function collectSkipDates(adjustments: AlarmAdjustment[]): Set<string> {
  return new Set(
    adjustments.filter((a) => a.type === 'skip').map((a) => a.date)
  );
}

/** 闹钟的用户可见描述文案（通知标题/正文与原生响铃通知共用） */
export function getAlarmDescription(alarm: Alarm): string {
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

/** 触发时刻物化结果 */
export interface TriggerPlan {
  /** 未来触发时间戳（升序，已按 SCHEDULE_MAX_PER_ALARM 截断） */
  timestamps: number[];
  /** 未来触发点是否超过截断上限（供上层续期/提示） */
  truncated: boolean;
}

/**
 * 计算单个闹钟未来 SCHEDULE_DAYS_AHEAD 天内的全部触发时间戳。
 * 四类闹钟统一逐日物化（不用系统 DAILY/WEEKLY repeating trigger），
 * 与 computeRingDatesInRange 同源，skip 调整对四类闹钟语义一致。
 */
export function computeTriggerTimestamps(
  alarm: Alarm,
  adjustments: AlarmAdjustment[] = []
): TriggerPlan {
  const rangeStart = today();
  const rangeEnd = addDaysToDate(rangeStart, SCHEDULE_DAYS_AHEAD);
  const dates = computeRingDatesInRange(alarm, rangeStart, rangeEnd, adjustments);

  const timestamps: number[] = [];
  let truncated = false;
  for (const date of dates) {
    const triggerAt = new Date(date);
    triggerAt.setHours(alarm.hour, alarm.minute, 0, 0);
    if (triggerAt.getTime() <= Date.now()) continue;
    if (timestamps.length >= SCHEDULE_MAX_PER_ALARM) {
      truncated = true;
      break;
    }
    timestamps.push(triggerAt.getTime());
  }
  return { timestamps, truncated };
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

/** 每天重复：范围内每天，过滤 skip */
function computeDailyDates(
  rangeStart: Date,
  rangeEnd: Date,
  adjustments: AlarmAdjustment[]
): Date[] {
  const skipDates = collectSkipDates(adjustments);
  const dates: Date[] = [];
  let current = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  while (!isDateAfter(current, end)) {
    if (!skipDates.has(formatDate(current))) {
      dates.push(current);
    }
    current = addDays(current, 1);
  }
  return dates;
}

/** 按星期重复：范围内匹配的星期几，过滤 skip */
function computeWeeklyDates(
  alarm: Alarm,
  rangeStart: Date,
  rangeEnd: Date,
  adjustments: AlarmAdjustment[]
): Date[] {
  if (!alarm.weekdays || alarm.weekdays.length === 0) return [];

  // 转换：我们的 1=周一..7=周日，JS getDay() 返回 0=周日..6=周六
  const jsWeekdays = new Set(
    alarm.weekdays.map((wd: Weekday) => (wd % 7))
  );
  const skipDates = collectSkipDates(adjustments);

  const dates: Date[] = [];
  let current = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  while (!isDateAfter(current, end)) {
    if (jsWeekdays.has(getDay(current)) && !skipDates.has(formatDate(current))) {
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
  const skipDates = collectSkipDates(adjustments);
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
