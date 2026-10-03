import { findConflictingAlarms } from '../conflicts';
import type { Alarm, AlarmType } from '../../types/alarm';
import { addDays } from 'date-fns';
import { formatDate, parseDate, today } from '../../utils/date';

function makeAlarm(id: number, overrides: Partial<Alarm> & { type: AlarmType }): Alarm {
  const alarm: Alarm = {
    id,
    hour: 8,
    minute: 0,
    label: '',
    category: 'other',
    enabled: true,
    onceDate: null,
    weekdays: null,
    intervalDays: null,
    startDate: null,
    snoozeMinutes: 10,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
  alarm.category = overrides.category ?? 'other';
  return alarm;
}

describe('findConflictingAlarms', () => {
  it('检测每天同一分钟的冲突', async () => {
    const target = makeAlarm(0, { type: 'daily', hour: 9, minute: 30 });
    const other = makeAlarm(1, { type: 'daily', hour: 9, minute: 30 });
    await expect(findConflictingAlarms(target, [other], async () => [])).resolves.toEqual([other]);
  });

  it('不同时间不冲突', async () => {
    const date = formatDate(addDays(today(), 10));
    const target = makeAlarm(0, { type: 'once', onceDate: date, hour: 9 });
    const other = makeAlarm(1, { type: 'once', onceDate: date, hour: 10 });
    await expect(findConflictingAlarms(target, [other], async () => [])).resolves.toEqual([]);
  });

  it('跳过调整后的周期实例不冲突', async () => {
    const date = formatDate(addDays(today(), 10));
    const target = makeAlarm(0, { type: 'once', onceDate: date });
    const other = makeAlarm(1, { type: 'cycle', startDate: date, intervalDays: 2 });
    await expect(findConflictingAlarms(target, [other], async () => [{ id: 1, alarmId: 1, type: 'skip', date, createdAt: '' }])).resolves.toEqual([]);
  });

  it('测试输入使用本地日期，不依赖固定时间戳', () => {
    expect(parseDate(formatDate(today())).getHours()).toBe(0);
  });
});
