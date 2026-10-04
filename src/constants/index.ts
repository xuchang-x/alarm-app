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
export { COLORS, NATIVE_DIALOG_LABELS } from './theme';

export const ALARM_CATEGORIES = [
  { key: 'work', label: '工作', color: '#6C5CE7' },
  { key: 'life', label: '生活', color: '#E79A4D' },
  { key: 'sport', label: '运动', color: '#45B89C' },
  { key: 'other', label: '其他', color: '#8A839C' },
] as const;
