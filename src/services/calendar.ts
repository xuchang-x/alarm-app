import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Alarm } from '@/types/alarm';
import { computeRingDatesInRange } from '@/services/scheduler';
import { formatDate } from '@/utils/date';
import type { AlarmAdjustment } from '@/types/alarm';

export type CalendarViewMode = 'month' | 'week' | 'threeDays' | 'day';

export interface CalendarInstance {
  alarm: Alarm;
  date: Date;
  dateKey: string;
}

export type AlarmAdjustmentLoader = (alarmId: number) => Promise<AlarmAdjustment[]>;

/** 取得指定视图需要计算的日期范围。月视图包含完整的六周网格。 */
export function getCalendarRange(
  anchor: Date,
  mode: CalendarViewMode
): { start: Date; end: Date } {
  if (mode === 'month') {
    const monthStart = startOfMonth(anchor);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: addDays(startOfWeek(monthStart, { weekStartsOn: 1 }), 41),
    };
  }
  if (mode === 'week') {
    return {
      start: startOfWeek(anchor, { weekStartsOn: 1 }),
      end: endOfWeek(anchor, { weekStartsOn: 1 }),
    };
  }
  if (mode === 'threeDays') {
    return { start: startOfDay(anchor), end: startOfDay(addDays(anchor, 2)) };
  }
  return { start: startOfDay(anchor), end: startOfDay(anchor) };
}

/** 计算指定范围内的日历实例，和通知调度共用同一套日期规则。 */
export async function getCalendarInstances(
  alarms: Alarm[],
  rangeStart: Date,
  rangeEnd: Date,
  includeDisabled = false,
  loadAdjustments: AlarmAdjustmentLoader
): Promise<CalendarInstance[]> {
  const visibleAlarms = alarms.filter((alarm) => includeDisabled || alarm.enabled);
  const grouped = await Promise.all(
    visibleAlarms.map(async (alarm) => {
      const adjustments = await loadAdjustments(alarm.id);
      const dates = computeRingDatesInRange(alarm, rangeStart, rangeEnd, adjustments);
      return dates.map((date) => {
        const instanceDate = startOfDay(date);
        instanceDate.setHours(alarm.hour, alarm.minute, 0, 0);
        return {
          alarm,
          date: instanceDate,
          dateKey: formatDate(instanceDate),
        };
      });
    })
  );

  const unique = new Map<string, CalendarInstance>();
  grouped.flat().forEach((instance) => {
    unique.set(`${instance.alarm.id}-${instance.dateKey}`, instance);
  });
  return [...unique.values()].sort((a, b) => {
    const dateOrder = a.date.getTime() - b.date.getTime();
    return dateOrder !== 0 ? dateOrder : a.alarm.label.localeCompare(b.alarm.label);
  });
}

/** 翻页：三天视图每次移动一天，便于连续浏览。 */
export function moveCalendarAnchor(
  anchor: Date,
  mode: CalendarViewMode,
  direction: -1 | 1
): Date {
  if (mode === 'month') return addMonths(anchor, direction);
  if (mode === 'week') return addWeeks(anchor, direction);
  if (mode === 'threeDays') return addDays(anchor, direction);
  return addDays(anchor, direction);
}
