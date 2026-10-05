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
  /** 读取主题偏好（同步）：'system' | 'light' | 'dark'，缺省 'system' */
  getSkinTheme(): string;
  /** 写入主题偏好（008 深色模式，运行时切换由 skinStore 响应式驱动，落盘仅供下次冷启动定型） */
  setSkinTheme(theme: string): void;
  /** 读取当前响铃快照（同步）：null = 未在响铃；供响铃浮层轮询 */
  getRingingInfo(): RingingInfo | null;
}

/** 当前响铃快照（RingService.ringingInfo 的 JS 镜像） */
export interface RingingInfo {
  alarmId: number;
  title: string;
  body: string;
  snoozeMinutes: number;
}

export const AlarmRing =
  requireOptionalNativeModule<AlarmRingNativeModule>('AlarmRing') ?? null;

export default AlarmRing;
