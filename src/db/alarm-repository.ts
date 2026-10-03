import { getDatabase } from './connection';
import type {
  Alarm,
  AlarmAdjustment,
  AlarmCategory,
  AlarmType,
  AdjustmentType,
  CreateAlarmInput,
  UpdateAlarmInput,
  Weekday,
} from '@/types/alarm';
import { DEFAULT_SNOOZE_MINUTES } from '@/constants';

/** 数据库行类型（蛇形命名） */
interface AlarmRow {
  id: number;
  type: string;
  hour: number;
  minute: number;
  label: string;
  category: string;
  enabled: number;
  once_date: string | null;
  weekdays: string | null;
  interval_days: number | null;
  start_date: string | null;
  snooze_minutes: number;
  created_at: string;
  updated_at: string;
}

interface AdjustmentRow {
  id: number;
  alarm_id: number;
  type: string;
  date: string;
  created_at: string;
}

/** 将数据库行转换为 Alarm 类型 */
function rowToAlarm(row: AlarmRow): Alarm {
  return {
    id: row.id,
    type: row.type as AlarmType,
    hour: row.hour,
    minute: row.minute,
    label: row.label,
    category: (row.category as AlarmCategory) || 'other',
    enabled: row.enabled === 1,
    onceDate: row.once_date,
    weekdays: row.weekdays ? (JSON.parse(row.weekdays) as Weekday[]) : null,
    intervalDays: row.interval_days,
    startDate: row.start_date,
    snoozeMinutes: row.snooze_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 将数据库行转换为 AlarmAdjustment 类型 */
function rowToAdjustment(row: AdjustmentRow): AlarmAdjustment {
  return {
    id: row.id,
    alarmId: row.alarm_id,
    type: row.type as AdjustmentType,
    date: row.date,
    createdAt: row.created_at,
  };
}

/** 获取所有闹钟 */
export async function getAllAlarms(): Promise<Alarm[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AlarmRow>(
    'SELECT * FROM alarms ORDER BY hour, minute'
  );
  return rows.map(rowToAlarm);
}

/** 根据 ID 获取闹钟 */
export async function getAlarmById(id: number): Promise<Alarm | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AlarmRow>(
    'SELECT * FROM alarms WHERE id = ?',
    id
  );
  return row ? rowToAlarm(row) : null;
}

/** 创建闹钟，返回新建的闹钟 */
export async function createAlarm(input: CreateAlarmInput): Promise<Alarm> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO alarms (type, hour, minute, label, category, once_date, weekdays, interval_days, start_date, snooze_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.type,
    input.hour,
    input.minute,
    input.label ?? '',
    input.category ?? 'other',
    input.onceDate ?? null,
    input.weekdays ? JSON.stringify(input.weekdays) : null,
    input.intervalDays ?? null,
    input.startDate ?? null,
    input.snoozeMinutes ?? DEFAULT_SNOOZE_MINUTES
  );
  const alarm = await getAlarmById(result.lastInsertRowId);
  if (!alarm) {
    throw new Error('创建闹钟后无法读取');
  }
  return alarm;
}

/** 更新闹钟 */
export async function updateAlarm(
  id: number,
  input: UpdateAlarmInput
): Promise<Alarm> {
  const db = await getDatabase();
  const existing = await getAlarmById(id);
  if (!existing) {
    throw new Error(`闹钟 #${id} 不存在`);
  }

  const type = input.type ?? existing.type;
  const hour = input.hour ?? existing.hour;
  const minute = input.minute ?? existing.minute;
  const label = input.label ?? existing.label;
  const category = input.category ?? existing.category;
  const enabled = input.enabled ?? existing.enabled;
  const onceDate = input.onceDate ?? existing.onceDate;
  const weekdays = input.weekdays ?? existing.weekdays;
  const intervalDays = input.intervalDays ?? existing.intervalDays;
  const startDate = input.startDate ?? existing.startDate;
  const snoozeMinutes = input.snoozeMinutes ?? existing.snoozeMinutes;

  await db.runAsync(
    `UPDATE alarms SET
      type = ?, hour = ?, minute = ?, label = ?, category = ?, enabled = ?,
      once_date = ?, weekdays = ?, interval_days = ?, start_date = ?,
      snooze_minutes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    type,
    hour,
    minute,
    label,
    category,
    enabled ? 1 : 0,
    onceDate,
    weekdays ? JSON.stringify(weekdays) : null,
    intervalDays,
    startDate,
    snoozeMinutes,
    id
  );

  const updated = await getAlarmById(id);
  if (!updated) {
    throw new Error(`更新闹钟 #${id} 后无法读取`);
  }
  return updated;
}

/** 删除闹钟 */
export async function deleteAlarm(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM alarms WHERE id = ?', id);
}

/** 切换闹钟开关 */
export async function toggleAlarm(id: number): Promise<Alarm> {
  const db = await getDatabase();
  const existing = await getAlarmById(id);
  if (!existing) {
    throw new Error(`闹钟 #${id} 不存在`);
  }
  const newEnabled = existing.enabled ? 0 : 1;
  await db.runAsync(
    "UPDATE alarms SET enabled = ?, updated_at = datetime('now') WHERE id = ?",
    newEnabled,
    id
  );
  const updated = await getAlarmById(id);
  if (!updated) {
    throw new Error(`切换闹钟 #${id} 后无法读取`);
  }
  return updated;
}

/** 获取闹钟的所有调整记录 */
export async function getAdjustments(
  alarmId: number
): Promise<AlarmAdjustment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AdjustmentRow>(
    'SELECT * FROM alarm_adjustments WHERE alarm_id = ? ORDER BY date',
    alarmId
  );
  return rows.map(rowToAdjustment);
}

/** 添加闹钟调整（跳过/加一次） */
export async function addAdjustment(
  alarmId: number,
  type: AdjustmentType,
  date: string
): Promise<AlarmAdjustment> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO alarm_adjustments (alarm_id, type, date) VALUES (?, ?, ?)',
    alarmId,
    type,
    date
  );
  const row = await db.getFirstAsync<AdjustmentRow>(
    'SELECT * FROM alarm_adjustments WHERE id = ?',
    result.lastInsertRowId
  );
  if (!row) {
    throw new Error('添加调整记录后无法读取');
  }
  return rowToAdjustment(row);
}

/** 删除指定闹钟的所有调整记录 */
export async function clearAdjustments(alarmId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM alarm_adjustments WHERE alarm_id = ?',
    alarmId
  );
}
