/** 批量预调度天数 */
export const SCHEDULE_DAYS_AHEAD = 90;

/** 单个闹钟一次性预调度的最大条数（iOS 系统上限 64 条，超限会被静默丢弃） */
export const SCHEDULE_MAX_PER_ALARM = 60;

/** 默认贪睡分钟数 */
export const DEFAULT_SNOOZE_MINUTES = 10;

/** 通知 ID 前缀 */
export const NOTIFICATION_ID_PREFIX = 'alarm';

/** 通知 category 标识 */
export const NOTIFICATION_CATEGORY = 'alarm';

/** App 皮肤色与原生弹窗文案统一定义在 theme.ts，这里 re-export 保持兼容 */
export {
  COLORS,
  SKIN,
  NATIVE_DIALOG_LABELS,
  getCurrentSkinTheme,
} from './theme';

import { SKIN } from './theme';
import type { AlarmCategory, AlarmType } from '@/types/alarm';

/** 闹钟类型的用户可见短标签（列表/筛选/时间轴/详情统一取用） */
export const ALARM_TYPE_LABELS: Record<AlarmType, string> = {
  once: '一次',
  daily: '每天',
  weekly: '每周',
  cycle: '周期',
};

/** 默认提醒时长的档位（设置页与表单共用） */
export const SNOOZE_OPTIONS = [5, 10, 15, 20, 30] as const;

export const ALARM_CATEGORIES = [
  { key: 'work', label: '工作', color: SKIN.brand.primary },
  { key: 'life', label: '生活', color: SKIN.status.warning },
  { key: 'sport', label: '运动', color: SKIN.status.success },
  { key: 'other', label: '其他', color: SKIN.misc.categoryNeutral },
] as const;

/** 分类查找（未知 key 兑底「其他」），列表卡/时间轴/今日卡/计划页共用 */
export function getAlarmCategory(
  category: AlarmCategory
): (typeof ALARM_CATEGORIES)[number] {
  return (
    ALARM_CATEGORIES.find((item) => item.key === category) ??
    ALARM_CATEGORIES[ALARM_CATEGORIES.length - 1]
  );
}
