/**
 * 007 T2 数据层测试：提示音三列迁移与读写回路。
 * mock '../connection' 的 getDatabase，用可编程假 db 捕获 SQL 与参数。
 */
jest.mock('../connection', () => {
  const state = {
    /** PRAGMA table_info(alarms) 返回的列名集合 */
    pragmaColumns: [] as Array<{ name: string }>,
    /** SELECT 语句返回的闹钟行（getFirstAsync 取 [0]） */
    alarmRows: [] as Array<Record<string, unknown>>,
    /** runAsync 捕获（UPDATE/INSERT 语句与参数） */
    runCalls: [] as Array<{ sql: string; params: unknown[] }>,
    /** execAsync 捕获（DDL 语句） */
    execSqls: [] as string[],
  };

  return {
    getDatabase: async (): Promise<{
      execAsync: (sql: string) => Promise<void>;
      getAllAsync: (sql: string) => Promise<Array<Record<string, unknown>>>;
      getFirstAsync: (sql: string) => Promise<Record<string, unknown> | null>;
      runAsync: (
        sql: string,
        ...params: unknown[]
      ) => Promise<{ lastInsertRowId: number; changes: number }>;
    }> => ({
      async execAsync(sql: string): Promise<void> {
        state.execSqls.push(sql);
      },
      async getAllAsync(
        sql: string
      ): Promise<Array<Record<string, unknown>>> {
        if (sql.startsWith('PRAGMA')) return state.pragmaColumns;
        return state.alarmRows;
      },
      async getFirstAsync(
        sql: string
      ): Promise<Record<string, unknown> | null> {
        if (sql.startsWith('SELECT * FROM alarms')) {
          return state.alarmRows[0] ?? null;
        }
        return null;
      },
      async runAsync(
        sql: string,
        ...params: unknown[]
      ): Promise<{ lastInsertRowId: number; changes: number }> {
        state.runCalls.push({ sql, params });
        return { lastInsertRowId: 1, changes: 1 };
      },
    }),
    __mockState: state,
  };
});

import { initDatabase } from '../schema';
import * as repo from '../alarm-repository';
import type { AlarmRow } from '../alarm-repository';

/** mock connection 模块的内部状态（测试用例直接操控） */
interface MockState {
  pragmaColumns: Array<{ name: string }>;
  alarmRows: Array<Record<string, unknown>>;
  runCalls: Array<{ sql: string; params: unknown[] }>;
  execSqls: string[];
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const state = require('../connection').__mockState as MockState;

/** 0.0.4 及更早版本的表结构（无铃声三列） */
const LEGACY_COLUMNS = [
  'id', 'type', 'hour', 'minute', 'label', 'category', 'enabled',
  'once_date', 'weekdays', 'interval_days', 'start_date',
  'snooze_minutes', 'created_at', 'updated_at',
];

function makeRow(overrides: Partial<AlarmRow> = {}): Record<string, unknown> {
  return {
    id: 1,
    type: 'daily',
    hour: 7,
    minute: 30,
    label: '起床',
    category: 'life',
    enabled: 1,
    once_date: null,
    weekdays: null,
    interval_days: null,
    start_date: null,
    snooze_minutes: 10,
    sound_id: null,
    custom_sound_uri: null,
    custom_sound_title: null,
    created_at: '2026-10-01 00:00:00',
    updated_at: '2026-10-01 00:00:00',
    ...overrides,
  };
}

/** 取最近一次 UPDATE alarms 的参数（顺序对应 SET 子句） */
function lastUpdateParams(): unknown[] {
  const update = [...state.runCalls]
    .reverse()
    .find((c) => c.sql.startsWith('UPDATE alarms SET'));
  if (!update) throw new Error('没有捕获到 UPDATE alarms 语句');
  return update.params;
}

beforeEach(() => {
  state.pragmaColumns = LEGACY_COLUMNS.map((name) => ({ name }));
  state.alarmRows = [];
  state.runCalls = [];
  state.execSqls = [];
});

describe('007 数据层：ensureSoundColumns 迁移', () => {
  it('旧表结构缺三列时补齐三条 ALTER TABLE', async () => {
    await initDatabase();
    const alters = state.execSqls.filter((s) =>
      s.startsWith('ALTER TABLE alarms')
    );
    expect(alters).toEqual([
      'ALTER TABLE alarms ADD COLUMN sound_id TEXT',
      'ALTER TABLE alarms ADD COLUMN custom_sound_uri TEXT',
      'ALTER TABLE alarms ADD COLUMN custom_sound_title TEXT',
    ]);
  });

  it('列已存在时不重复 ALTER（幂等）', async () => {
    state.pragmaColumns = [
      ...LEGACY_COLUMNS,
      'sound_id',
      'custom_sound_uri',
      'custom_sound_title',
    ].map((name) => ({ name }));
    await initDatabase();
    const alters = state.execSqls.filter((s) =>
      s.startsWith('ALTER TABLE alarms')
    );
    expect(alters).toEqual([]);
  });
});

describe('007 数据层：行映射与读写回路', () => {
  it('老数据（NULL）映射为 null，由上层兜底默认音', async () => {
    state.alarmRows = [makeRow()];
    const alarm = await repo.getAlarmById(1);
    expect(alarm?.soundId).toBeNull();
    expect(alarm?.customSoundUri).toBeNull();
    expect(alarm?.customSoundTitle).toBeNull();
  });

  it('三字段正常读取（snake_case → camelCase）', async () => {
    state.alarmRows = [
      makeRow({
        sound_id: 'marimba',
        custom_sound_uri: 'content://media/external/audio/media/42',
        custom_sound_title: '晴天',
      }),
    ];
    const alarm = await repo.getAlarmById(1);
    expect(alarm?.soundId).toBe('marimba');
    expect(alarm?.customSoundUri).toBe('content://media/external/audio/media/42');
    expect(alarm?.customSoundTitle).toBe('晴天');
  });

  it('createAlarm 写入三字段（INSERT 参数透传）', async () => {
    state.alarmRows = [makeRow({ sound_id: 'chime' })];
    await repo.createAlarm({
      type: 'daily',
      hour: 8,
      minute: 0,
      soundId: 'chime',
    });
    const insert = state.runCalls.find((c) =>
      c.sql.startsWith('INSERT INTO alarms')
    );
    expect(insert).toBeDefined();
    expect(insert?.sql).toContain('sound_id, custom_sound_uri, custom_sound_title');
    // INSERT 参数顺序：type..snooze_minutes 之后是三铃声字段
    expect(insert?.params.slice(-3)).toEqual(['chime', null, null]);
  });

  it('updateAlarm 未传铃声字段时保留原值', async () => {
    state.alarmRows = [
      makeRow({
        sound_id: 'marimba',
        custom_sound_uri: 'content://x',
        custom_sound_title: '歌名',
      }),
    ];
    await repo.updateAlarm(1, { label: '新标签' });
    // UPDATE 参数顺序：..., snooze_minutes, sound_id, custom_sound_uri, custom_sound_title, id
    expect(lastUpdateParams().slice(-4)).toEqual([
      'marimba',
      'content://x',
      '歌名',
      1,
    ]);
  });

  it('updateAlarm 显式传 null 清空自定义铃声（切回内置音）', async () => {
    state.alarmRows = [
      makeRow({
        sound_id: 'marimba',
        custom_sound_uri: 'content://x',
        custom_sound_title: '歌名',
      }),
    ];
    await repo.updateAlarm(1, {
      soundId: 'classic-alarm',
      customSoundUri: null,
      customSoundTitle: null,
    });
    expect(lastUpdateParams().slice(-4)).toEqual([
      'classic-alarm',
      null,
      null,
      1,
    ]);
  });
});
