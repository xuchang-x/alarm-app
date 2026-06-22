import { getDatabase } from './connection';

const CREATE_ALARMS_TABLE = `
  CREATE TABLE IF NOT EXISTS alarms (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type          TEXT NOT NULL CHECK(type IN ('once', 'daily', 'weekly', 'cycle')),
    hour          INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    minute        INTEGER NOT NULL CHECK(minute >= 0 AND minute <= 59),
    label         TEXT NOT NULL DEFAULT '',
    enabled       INTEGER NOT NULL DEFAULT 1,
    once_date     TEXT,
    weekdays      TEXT,
    interval_days INTEGER,
    start_date    TEXT,
    snooze_minutes INTEGER NOT NULL DEFAULT 10,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const CREATE_ADJUSTMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS alarm_adjustments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    alarm_id   INTEGER NOT NULL REFERENCES alarms(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK(type IN ('skip', 'add')),
    date       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/** 初始化数据库表结构 */
export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(CREATE_ALARMS_TABLE);
  await db.execAsync(CREATE_ADJUSTMENTS_TABLE);
}
