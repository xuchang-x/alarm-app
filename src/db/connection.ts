import * as SQLite from 'expo-sqlite';

const DB_NAME = 'alarm-app.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

/**
 * 获取数据库连接（单例，防止并发竞态）。
 *
 * 开发模式 Fast Refresh 后，缓存的 native 连接可能已被释放
 * （表现为 "Cannot use shared object that was already released"），
 * 这里用 SELECT 1 探活，连接失效时自动重置单例并重新打开。
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase();
    return dbPromise;
  }
  try {
    const db = await dbPromise;
    await db.getFirstAsync('SELECT 1');
    return db;
  } catch {
    // 连接已失效（热更新后 native 对象被释放），重置单例并重新打开
    dbPromise = openDatabase();
    return dbPromise;
  }
}
