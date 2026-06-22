import * as SQLite from 'expo-sqlite';

const DB_NAME = 'alarm-app.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** 获取数据库连接（单例，防止并发竞态） */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    })();
  }
  return dbPromise;
}
