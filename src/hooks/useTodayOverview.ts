import { useEffect, useMemo, useState } from 'react';
import type { Alarm, AlarmAdjustment } from '@/types/alarm';
import { useAlarmStore } from '@/store/alarm-store';
import * as repo from '@/db/alarm-repository';
import { computeNextRingDate, computeRingDatesInRange } from '@/services/scheduler';
import { daysUntil, getCycleRhythm, today, type CycleRhythm } from '@/utils/date';

/** 下一次响铃信息（含倒计时所需原始值） */
export interface NextRingInfo {
  alarm: Alarm;
  /** 下一次响铃日期（自然日粒度，时刻取 alarm.hour/minute） */
  date: Date;
  /** 距今天还有几个自然日（0=今天） */
  daysUntil: number;
  /** 周期闹钟的节奏位置，非 cycle 为 null */
  rhythm: CycleRhythm | null;
}

/** 今日会响的一个提醒实例 */
export interface TodayItem {
  alarm: Alarm;
  /** 今天的响铃时刻是否已过（已响置灰） */
  passed: boolean;
  /** 周期闹钟的节奏位置，非 cycle 为 null */
  rhythm: CycleRhythm | null;
}

/** 今日页全量派生数据 */
export interface TodayOverview {
  nextRing: NextRingInfo | null;
  todayItems: TodayItem[];
  greeting: string;
}

function getRhythm(alarm: Alarm, reference: Date): CycleRhythm | null {
  if (alarm.type !== 'cycle' || !alarm.startDate || !alarm.intervalDays) {
    return null;
  }
  return getCycleRhythm(alarm.startDate, alarm.intervalDays, reference);
}

function formatDaysLabel(days: number): string {
  if (days <= 0) return '今天';
  if (days === 1) return '明天';
  return `${days} 天后`;
}

/**
 * 纯派生函数：由闹钟列表 + 调整记录 + 当前时间计算今日页数据。
 * 日期规则全部委托 scheduler 服务与 utils/date，不新写规则。
 */
export function deriveTodayOverview(
  alarms: Alarm[],
  adjustmentsMap: Map<number, AlarmAdjustment[]>,
  now: Date
): TodayOverview {
  const todayDate = today();
  const enabled = alarms.filter((alarm) => alarm.enabled);

  // 今日实例
  const todayItems: TodayItem[] = [];
  for (const alarm of enabled) {
    const adjustments = adjustmentsMap.get(alarm.id) ?? [];
    const dates = computeRingDatesInRange(alarm, todayDate, todayDate, adjustments);
    if (dates.length === 0) continue;
    const ringTime = new Date(todayDate);
    ringTime.setHours(alarm.hour, alarm.minute, 0, 0);
    todayItems.push({
      alarm,
      passed: now > ringTime,
      rhythm: getRhythm(alarm, todayDate),
    });
  }
  todayItems.sort((a, b) =>
    a.alarm.hour !== b.alarm.hour
      ? a.alarm.hour - b.alarm.hour
      : a.alarm.minute - b.alarm.minute
  );

  // 下一次响铃（时刻最近者）
  let nextRing: NextRingInfo | null = null;
  for (const alarm of enabled) {
    const adjustments = adjustmentsMap.get(alarm.id) ?? [];
    const date = computeNextRingDate(alarm, adjustments);
    if (!date) continue;
    if (
      !nextRing ||
      date < nextRing.date ||
      (date.getTime() === nextRing.date.getTime() &&
        (alarm.hour < nextRing.alarm.hour ||
          (alarm.hour === nextRing.alarm.hour && alarm.minute < nextRing.alarm.minute)))
    ) {
      nextRing = {
        alarm,
        date,
        daysUntil: daysUntil(date, todayDate),
        rhythm: getRhythm(alarm, todayDate),
      };
    }
  }

  // 问候语
  let greeting: string;
  if (todayItems.length > 0) {
    greeting = `今天有 ${todayItems.length} 个提醒`;
  } else if (nextRing) {
    greeting = `今天没有提醒，下一个在 ${formatDaysLabel(nextRing.daysUntil)}`;
  } else {
    greeting = '今天没有提醒';
  }

  return { nextRing, todayItems, greeting };
}

const EMPTY_OVERVIEW: TodayOverview = {
  nextRing: null,
  todayItems: [],
  greeting: '今天没有提醒',
};

/**
 * 今日页数据派生 hook。
 *
 * @param now 当前时间（由 useNow 每分钟驱动，触发重算倒计时与已响标记）
 */
export function useTodayOverview(now: Date): {
  overview: TodayOverview;
  loading: boolean;
} {
  const alarms = useAlarmStore((state) => state.alarms);
  const [adjustmentsMap, setAdjustmentsMap] = useState<Map<number, AlarmAdjustment[]>>(
    () => new Map()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadAdjustments = async () => {
      setLoading(alarms.length > 0);
      const map = new Map<number, AlarmAdjustment[]>();
      for (const alarm of alarms) {
        map.set(alarm.id, await repo.getAdjustments(alarm.id));
      }
      if (cancelled) return;
      setAdjustmentsMap(map);
      setLoading(false);
    };
    void loadAdjustments();
    return () => {
      cancelled = true;
    };
  }, [alarms]);

  const overview = useMemo(
    () => deriveTodayOverview(alarms, adjustmentsMap, now),
    [alarms, adjustmentsMap, now]
  );

  return { overview, loading };
}
