/**
 * scheduleAlarmNotifications 调度策略测试。
 *
 * notification.ts 通过 require('expo-notifications') 动态加载原生模块，
 * 测试里用 jest.mock 替换为可控桩：验证截断上限、失败容错与结果分类。
 * 各用例用 jest.resetModules() 重新加载被测模块，精确控制 Notifications 桩行为。
 */

/** expo-notifications 桩：可编程的调度结果 */
type StubConfig = {
  /** 每次调度的行为：默认成功 */
  scheduleBehavior?: (identifier: string) => void;
  /** 已调度的通知列表 */
  scheduledIdentifiers: string[];
};

function makeStub(config: StubConfig) {
  return {
    SchedulableTriggerInputTypes: {
      DAILY: 'daily',
      WEEKLY: 'weekly',
      DATE: 'calendar',
    },
    AndroidImportance: { MAX: 5 },
    setNotificationHandler: jest.fn(),
    setNotificationCategoryAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    getAllScheduledNotificationsAsync: jest.fn(async () =>
      config.scheduledIdentifiers.map((identifier) => ({ identifier }))
    ),
    cancelScheduledNotificationAsync: jest.fn(async () => {}),
    scheduleNotificationAsync: jest.fn(async (request: { identifier: string }) => {
      config.scheduleBehavior?.(request.identifier);
      config.scheduledIdentifiers.push(request.identifier);
    }),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  };
}

/** 固定"今天"，避免跨日边界导致用例不稳 */
const FAKE_TODAY = '2026-10-04';

function loadNotificationService(config: StubConfig) {
  jest.resetModules();
  jest.doMock('expo-notifications', () => makeStub(config));
  jest.doMock('@/utils/date', () => {
    const actual = jest.requireActual('@/utils/date');
    return { ...actual, today: () => actual.parseDate(FAKE_TODAY) };
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../notification') as typeof import('../notification');
}

/** 构造闹钟 */
function makeAlarm(overrides: Record<string, unknown>): import('../../types/alarm').Alarm {
  return {
    id: 1,
    type: 'cycle',
    hour: 8,
    minute: 0,
    label: '测试',
    category: 'other',
    enabled: true,
    onceDate: null,
    weekdays: null,
    intervalDays: null,
    startDate: null,
    snoozeMinutes: 10,
    soundId: null,
    customSoundUri: null,
    customSoundTitle: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

afterEach(() => {
  jest.dontMock('expo-notifications');
  jest.dontMock('@/utils/date');
  jest.restoreAllMocks();
});

describe('scheduleAlarmNotifications — once/cycle 截断上限', () => {
  it('响铃日期超过 SCHEDULE_MAX_PER_ALARM 时截断并标记 truncated', async () => {
    const config: StubConfig = { scheduledIdentifiers: [] };
    const svc = loadNotificationService(config);
    // 每 1 天一响，90 天 = 90 条 > 上限 60
    const alarm = makeAlarm({ type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY });

    const result = await svc.scheduleAlarmNotifications(alarm, []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scheduled).toBe(60);
      expect(result.truncated).toBe(true);
    }
    expect(config.scheduledIdentifiers).toHaveLength(60);
  });

  it('未超上限时全部调度且不截断', async () => {
    const config: StubConfig = { scheduledIdentifiers: [] };
    const svc = loadNotificationService(config);
    // 每 3 天一响，90 天 = 30 条 < 上限 60
    const alarm = makeAlarm({ type: 'cycle', intervalDays: 3, startDate: FAKE_TODAY });

    const result = await svc.scheduleAlarmNotifications(alarm, []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scheduled).toBe(30);
      expect(result.truncated).toBe(false);
    }
  });

  it('已过期的当天时刻不再调度', async () => {
    const config: StubConfig = { scheduledIdentifiers: [] };
    const svc = loadNotificationService(config);
    const alarm = makeAlarm({ type: 'once', onceDate: FAKE_TODAY, hour: 0, minute: 0 });

    const result = await svc.scheduleAlarmNotifications(alarm, []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scheduled).toBe(0);
    }
    expect(config.scheduledIdentifiers).toHaveLength(0);
  });

  it('已过期的 once 日期（早于今天）不调度', async () => {
    const config: StubConfig = { scheduledIdentifiers: [] };
    const svc = loadNotificationService(config);
    const alarm = makeAlarm({ type: 'once', onceDate: '2026-10-01' });

    const result = await svc.scheduleAlarmNotifications(alarm, []);

    expect(result.ok).toBe(true);
    expect(config.scheduledIdentifiers).toHaveLength(0);
  });
});

describe('scheduleAlarmNotifications — 失败容错与结果分类', () => {
  it('全部调度失败时返回 ok:false reason:error', async () => {
    const config: StubConfig = {
      scheduledIdentifiers: [],
      scheduleBehavior: () => {
        throw new Error('permission denied');
      },
    };
    const svc = loadNotificationService(config);
    const alarm = makeAlarm({ type: 'daily' });

    const result = await svc.scheduleAlarmNotifications(alarm, []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('error');
    }
  });

  it('部分调度失败时保留已调度部分，仍返回 ok:true', async () => {
    const config: StubConfig = {
      scheduledIdentifiers: [],
      scheduleBehavior: (identifier) => {
        if (identifier.endsWith('weekly-2')) {
          throw new Error('partial failure');
        }
      },
    };
    const svc = loadNotificationService(config);
    const alarm = makeAlarm({ type: 'weekly', weekdays: [1, 2, 3] });

    const result = await svc.scheduleAlarmNotifications(alarm, []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scheduled).toBe(2);
    }
    expect(config.scheduledIdentifiers).toHaveLength(2);
  });

  it('调度前先取消该闹钟旧通知（改配置不残留）', async () => {
    const config: StubConfig = {
      scheduledIdentifiers: ['alarm-1-20261001', 'alarm-2-20261002'],
    };
    const svc = loadNotificationService(config);
    const alarm = makeAlarm({ type: 'daily' });

    await svc.scheduleAlarmNotifications(alarm, []);

    const cancelMock = (jest.requireMock('expo-notifications') as ReturnType<typeof makeStub>)
      .cancelScheduledNotificationAsync;
    expect(cancelMock).toHaveBeenCalledWith('alarm-1-20261001');
    expect(cancelMock).not.toHaveBeenCalledWith('alarm-2-20261002');
  });

  it('disabled 闹钟返回零调度且成功', async () => {
    const config: StubConfig = { scheduledIdentifiers: [] };
    const svc = loadNotificationService(config);
    const alarm = makeAlarm({ type: 'daily', enabled: false });

    const result = await svc.scheduleAlarmNotifications(alarm, []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scheduled).toBe(0);
      expect(result.truncated).toBe(false);
    }
  });
});

describe('scheduleAlarmNotifications — skip 调整生效', () => {
  it('skip 过的日期不调度，后续日期顺延补足', async () => {
    const config: StubConfig = { scheduledIdentifiers: [] };
    const svc = loadNotificationService(config);
    const alarm = makeAlarm({ type: 'cycle', intervalDays: 2, startDate: FAKE_TODAY });

    const result = await svc.scheduleAlarmNotifications(alarm, [
      {
        id: 1,
        alarmId: 1,
        type: 'skip',
        date: FAKE_TODAY,
        createdAt: '',
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // 90 天含首尾两端共 46 个响铃日，skip 首日 → 45 条
      expect(result.scheduled).toBe(45);
    }
    expect(config.scheduledIdentifiers[0]).toBe('alarm-1-20261006');
  });
});
