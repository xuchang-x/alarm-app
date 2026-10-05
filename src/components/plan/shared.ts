import { getAlarmCategory } from '@/constants';
import type { CalendarInstance } from '@/services/calendar';

/** 计划页日历组件共享常量与工具 */

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

/** 提醒实例的分类色（未知分类兜底「其他」） */
export function getCategoryColor(instance: CalendarInstance): string {
  return getAlarmCategory(instance.alarm.category).color;
}
