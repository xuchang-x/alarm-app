/**
 * ring-scheduler 平台分发测试。
 *
 * ring-scheduler.ts 通过 NativeModules.AlarmRing（modules/alarm-ring/src/index）
 * 判断 Android 原生路径是否可用；测试里 mock 该模块，验证：
 * 1. 原生可用时走 syncAlarms（触发时间戳、30 秒时长、截断标记）
 * 2. 原生不可用时降级走 expo-notifications 原路径
 */

type NativeStub = {
  syncAlarms: jest.Mock;
  cancelAlarm: jest.Mock;
  scheduleSnooze: jest.Mock;
  stopRinging: jest.Mock;
  canScheduleExactAlarms: jest.Mock;
};

function makeNativeStub(): NativeStub {
  return {
    syncAlarms: jest.fn(async () => true),
    cancelAlarm: jest.fn(async () => undefined),
    scheduleSnooze: jest.fn(async () => undefined),
    stopRinging: jest.fn(async () => undefined),
    canScheduleExactAlarms: jest.fn(() => true),
  };
}

/** 固定"今天"，避免跨日边界导致用例不稳 */
const FAKE_TODAY = '2026-10-04';

function loadRingScheduler(native: object | null) {
  jest.resetModules();
  jest.doMock('../../../modules/alarm-ring/src/index', () => ({
    AlarmRing: native,
    default: native,
  }));
  jest.doMock('@/utils/date', () => {
    const actual = jest.requireActual('@/utils/date');
    return { ...actual, today: () => actual.parseDate(FAKE_TODAY) };
  });
  jest.doMock('@/services/notification', () => ({
    scheduleAlarmNotifications: jest.fn(async () => ({
      ok: true,
      scheduled: 1,
      truncated: false,
    })),
    cancelAlarmNotifications: jest.fn(async () => undefined),
    scheduleSnooze: jest.fn(async () => undefined),
    replenishNotifications: jest.fn(async () => undefined),
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../ring-scheduler') as typeof import('../ring-scheduler');
}

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
  jest.dontMock('../../../modules/alarm-ring/src/index');
  jest.dontMock('@/utils/date');
  jest.dontMock('@/services/notification');
  jest.restoreAllMocks();
});

describe('scheduleAlarmRinging — Android 原生路径', () => {
  it('原生可用时调用 syncAlarms 并带上 30 秒时长', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({ type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY });

    const result = await svc.scheduleAlarmRinging(alarm, []);

    expect(result.ok).toBe(true);
    expect(native.cancelAlarm).toHaveBeenCalledWith(1);
    expect(native.syncAlarms).toHaveBeenCalledTimes(1);
    const plan = native.syncAlarms.mock.calls[0][0][0] as {
      alarmId: number;
      ringDurationSeconds: number;
      triggers: number[];
      snoozeMinutes: number;
    };
    expect(plan.alarmId).toBe(1);
    expect(plan.ringDurationSeconds).toBe(30);
    expect(plan.snoozeMinutes).toBe(10);
    expect(plan.triggers.length).toBeGreaterThan(0);
    // 触发时间戳均为未来时间且落在今天 08:00 之后
    for (const t of plan.triggers) {
      expect(t).toBeGreaterThan(Date.now() - 1000);
    }
  });

  it('闹钟停用时只取消不排新', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({ enabled: false });

    const result = await svc.scheduleAlarmRinging(alarm, []);

    expect(result).toEqual({ ok: true, scheduled: 0, truncated: false });
    expect(native.cancelAlarm).toHaveBeenCalledWith(1);
    expect(native.syncAlarms).not.toHaveBeenCalled();
  });

  it('syncAlarms 抛错时返回 error 结果', async () => {
    const native = makeNativeStub();
    native.syncAlarms.mockRejectedValueOnce(new Error('native error'));
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({ type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY });

    const result = await svc.scheduleAlarmRinging(alarm, []);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('error');
  });

  it('贪睡走原生 scheduleSnooze', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({});

    await svc.scheduleAlarmSnooze(alarm);

    expect(native.scheduleSnooze).toHaveBeenCalledWith(1);
  });
});

describe('scheduleAlarmRinging — 铃声字段透传（007）', () => {
  function getPlan(native: NativeStub): {
    soundId: string | null;
    soundUri: string | null;
  } {
    expect(native.syncAlarms).toHaveBeenCalledTimes(1);
    const plan = native.syncAlarms.mock.calls[0][0][0] as {
      soundId: string | null;
      soundUri: string | null;
    };
    return { soundId: plan.soundId, soundUri: plan.soundUri };
  }

  it('本地音乐优先：soundUri 透传 content URI，soundId 置 null', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({
      type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY,
      soundId: 'marimba',
      customSoundUri: 'content://media/external/audio/media/42',
    });

    await svc.scheduleAlarmRinging(alarm, []);

    expect(getPlan(native)).toEqual({
      soundId: null,
      soundUri: 'content://media/external/audio/media/42',
    });
  });

  it('内置音：soundId 透传，soundUri 为 null', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({
      type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY,
      soundId: 'chime',
    });

    await svc.scheduleAlarmRinging(alarm, []);

    expect(getPlan(native)).toEqual({ soundId: 'ars_chime', soundUri: null });
  });

  it('老数据（soundId/customSoundUri 均为 NULL）兑底默认音 classic-alarm 的 raw 资源名', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({ type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY });

    await svc.scheduleAlarmRinging(alarm, []);

    expect(getPlan(native)).toEqual({ soundId: 'ars_classic_alarm', soundUri: null });
  });

  it('未知 soundId（资源已下线等）兑底默认音 raw 资源名', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({
      type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY,
      soundId: 'removed-sound',
    });

    await svc.scheduleAlarmRinging(alarm, []);

    expect(getPlan(native)).toEqual({ soundId: 'ars_classic_alarm', soundUri: null });
  });

  it('replenishAlarmRinging 批量补排同样透传铃声字段', async () => {
    const native = makeNativeStub();
    const svc = loadRingScheduler(native);
    const alarm = makeAlarm({
      type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY,
      customSoundUri: 'content://x',
    });

    await svc.replenishAlarmRinging([alarm], async () => []);

    expect(native.syncAlarms).toHaveBeenCalledTimes(1);
    const plan = native.syncAlarms.mock.calls[0][0][0] as {
      soundId: string | null;
      soundUri: string | null;
    };
    expect({ soundId: plan.soundId, soundUri: plan.soundUri }).toEqual({
      soundId: null,
      soundUri: 'content://x',
    });
  });
});

describe('scheduleAlarmRinging — 降级路径', () => {
  it('原生模块不存在时降级走 expo-notifications', async () => {
    const svc = loadRingScheduler(null);
    const alarm = makeAlarm({ type: 'cycle', intervalDays: 1, startDate: FAKE_TODAY });

    const result = await svc.scheduleAlarmRinging(alarm, []);

    expect(result.ok).toBe(true);
    // notification 桩被调用（降级路径生效）
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notificationStub = require('@/services/notification') as {
      scheduleAlarmNotifications: jest.Mock;
    };
    expect(notificationStub.scheduleAlarmNotifications).toHaveBeenCalledWith(alarm, []);
  });
});
