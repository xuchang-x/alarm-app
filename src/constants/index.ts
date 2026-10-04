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

/** Eva / UI Kitten 风格颜色：浅色暖灰背景 + 紫蓝主色 */
export const COLORS = {
  background: '#F7F5FC',
  card: '#FFFFFF',
  input: '#F3F1F8',
  primary: '#6C5CE7',
  primaryDark: '#5545C8',
  primarySoft: '#EAE6FF',
  danger: '#E85D75',
  warning: '#E79A4D',
  success: '#45B89C',
  textPrimary: '#25223A',
  textSecondary: '#6D6880',
  textMuted: '#9C97AC',
  textDisabled: '#B9B5C4',
  border: '#E5E1F0',
  shadow: '#51468A',
  /** 今日页 hero 卡分隔线（primaryDark 低透明度） */
  heroDivider: 'rgba(85, 69, 200, 0.18)',
  /** 今日页节奏点阵未点亮色 */
  heroDotOff: '#D9D2F5',
} as const;

export const ALARM_CATEGORIES = [
  { key: 'work', label: '工作', color: '#6C5CE7' },
  { key: 'life', label: '生活', color: '#E79A4D' },
  { key: 'sport', label: '运动', color: '#45B89C' },
  { key: 'other', label: '其他', color: '#8A839C' },
] as const;
