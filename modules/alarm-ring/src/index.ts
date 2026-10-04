import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * alarm-ring 原生模块的 JS 侧入口。
 *
 * Android dev build 中由 expo autolinking 自动注册（modules/alarm-ring/）；
 * Expo Go / iOS / Web 中 NativeModules.AlarmRing 不存在，导出 null 供上层降级。
 */

interface AlarmRingNativeModule {
  syncAlarms(plans: Array<{
    alarmId: number;
    title: string;
    body: string;
    triggers: number[];
    snoozeMinutes: number;
    ringDurationSeconds: number;
    /** 内置提示音 raw 资源名（如 'ars_classic_alarm'，已从语义 id 映射），null = 系统默认闹钟铃声 */
    soundId: string | null;
    /** 本地音乐 content:// URI，优先级高于 soundId */
    soundUri: string | null;
  }>): Promise<boolean>;
  cancelAlarm(alarmId: number): Promise<void>;
  scheduleSnooze(alarmId: number): Promise<void>;
  stopRinging(): Promise<void>;
  canScheduleExactAlarms(): boolean;
}

export const AlarmRing =
  requireOptionalNativeModule<AlarmRingNativeModule>('AlarmRing') ?? null;

export default AlarmRing;
