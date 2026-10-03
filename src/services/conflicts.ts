import { addDays } from 'date-fns';
import type { Alarm, AlarmAdjustment } from '@/types/alarm';
import { computeRingDatesInRange } from '@/services/scheduler';
import { formatDate, today } from '@/utils/date';

export type AdjustmentLoader = (alarmId: number) => Promise<AlarmAdjustment[]>;

/**
 * 在未来 30 天内按「同一天同一分钟」检测提醒冲突。
 * 只返回实际会发生碰撞的闹钟，调用方可以将结果作为非阻断提示展示。
 */
export async function findConflictingAlarms(
  target: Alarm,
  alarms: Alarm[],
  loadAdjustments: AdjustmentLoader,
  horizonDays = 30
): Promise<Alarm[]> {
  const start = today();
  const end = addDays(start, horizonDays);
  const targetAdjustments = target.id > 0 ? await loadAdjustments(target.id) : [];
  const targetDates = computeRingDatesInRange(target, start, end, targetAdjustments);
  const targetKeys = new Set(targetDates.map((date) => `${formatDate(date)}-${target.hour}-${target.minute}`));
  if (targetKeys.size === 0) return [];

  const conflicts: Alarm[] = [];
  for (const alarm of alarms) {
    if (!alarm.enabled || alarm.id === target.id) continue;
    const adjustments = await loadAdjustments(alarm.id);
    const dates = computeRingDatesInRange(alarm, start, end, adjustments);
    const hasConflict = dates.some((date) => targetKeys.has(`${formatDate(date)}-${alarm.hour}-${alarm.minute}`));
    if (hasConflict) conflicts.push(alarm);
  }
  return conflicts;
}
