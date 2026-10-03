/** 闹钟类型 */
export type AlarmType = 'once' | 'daily' | 'weekly' | 'cycle';

/** 预设提醒分类 */
export type AlarmCategory = 'work' | 'life' | 'sport' | 'other';

/** 闹钟调整类型 */
export type AdjustmentType = 'skip' | 'add';

/** 星期编号：1=周一，7=周日 */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 闹钟数据模型（对应数据库 alarms 表） */
export interface Alarm {
  id: number;
  type: AlarmType;
  hour: number;
  minute: number;
  label: string;
  category: AlarmCategory;
  enabled: boolean;

  /** once 专用：响铃日期 'YYYY-MM-DD' */
  onceDate: string | null;

  /** weekly 专用：勾选的星期列表 */
  weekdays: Weekday[] | null;

  /** cycle 专用：间隔天数 */
  intervalDays: number | null;

  /** cycle 专用：起始日期 'YYYY-MM-DD' */
  startDate: string | null;

  /** 贪睡延迟分钟数 */
  snoozeMinutes: number;

  createdAt: string;
  updatedAt: string;
}

/** 闹钟调整记录（对应数据库 alarm_adjustments 表） */
export interface AlarmAdjustment {
  id: number;
  alarmId: number;
  type: AdjustmentType;
  /** 目标日期 'YYYY-MM-DD' */
  date: string;
  createdAt: string;
}

/** 创建闹钟的输入参数 */
export interface CreateAlarmInput {
  type: AlarmType;
  hour: number;
  minute: number;
  label?: string;
  category?: AlarmCategory;
  onceDate?: string;
  weekdays?: Weekday[];
  intervalDays?: number;
  startDate?: string;
  snoozeMinutes?: number;
}

/** 更新闹钟的输入参数 */
export interface UpdateAlarmInput {
  type?: AlarmType;
  hour?: number;
  minute?: number;
  label?: string;
  category?: AlarmCategory;
  enabled?: boolean;
  onceDate?: string;
  weekdays?: Weekday[];
  intervalDays?: number;
  startDate?: string;
  snoozeMinutes?: number;
}
