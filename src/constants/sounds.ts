/**
 * 007 内置提示音元数据（单一事实源：UI 列表与调度层共用）。
 *
 * - id：语义标识，与 DB sound_id 列一致
 * - rawName：Android 模块 res/raw 资源名（`ars_` 前缀防冲突），由
 *   modules/alarm-ring/tools/synthesize_sounds.py 合成生成
 * - 音源本身零版权风险（纯算法合成，见 tools 脚本）
 */

export interface SoundPreset {
  /** 内置音标识（DB sound_id / 原生 RingPlan.soundId） */
  id: string;
  /** 用户可见名称 */
  name: string;
  /** 分组：刺耳 / 温和 / 自然 */
  group: 'sharp' | 'gentle' | 'nature';
  /** Android 模块 res/raw 资源名 */
  rawName: string;
}

export const SOUND_PRESETS: readonly SoundPreset[] = [
  // —— 刺耳组（快速唤醒）——
  { id: 'classic-alarm', name: '经典闹钟', group: 'sharp', rawName: 'ars_classic_alarm' },
  { id: 'buzzer', name: '蜂鸣', group: 'sharp', rawName: 'ars_buzzer' },
  { id: 'radar-ping', name: '雷达', group: 'sharp', rawName: 'ars_radar_ping' },
  { id: 'radar-soft', name: '轻雷达', group: 'sharp', rawName: 'ars_radar_soft' },
  // —— 温和组（渐进唤醒）——
  { id: 'marimba', name: '木琴', group: 'gentle', rawName: 'ars_marimba' },
  { id: 'piano-arpeggio', name: '钢琴琶音', group: 'gentle', rawName: 'ars_piano_arpeggio' },
  { id: 'music-box', name: '八音盒', group: 'gentle', rawName: 'ars_music_box' },
  { id: 'chime', name: '风铃', group: 'gentle', rawName: 'ars_chime' },
  // —— 自然组（氛围唤醒）——
  { id: 'birds-morning', name: '清晨鸟鸣', group: 'nature', rawName: 'ars_birds_morning' },
  { id: 'ocean-waves', name: '海浪', group: 'nature', rawName: 'ars_ocean_waves' },
];

/** 默认提示音（老数据 NULL 与新建闹钟的兜底值） */
export const DEFAULT_SOUND_ID = 'classic-alarm';

/** 分组显示名（选择器 UI 用） */
export const SOUND_GROUP_LABELS: Record<SoundPreset['group'], string> = {
  sharp: '刺耳',
  gentle: '温和',
  nature: '自然',
};

/** 按 id 查找内置音（未命中返回 null，由调用方兜底） */
export function findSoundPreset(id: string | null | undefined): SoundPreset | null {
  if (!id) return null;
  return SOUND_PRESETS.find((preset) => preset.id === id) ?? null;
}

/**
 * 内置提示音的 JS bundle 资产映射（试听用）。
 *
 * 资产与原生 res/raw 用同一批 OGG 文件（tools/synthesize_sounds.py 产出）：
 * - 原生侧：`modules/alarm-ring/android/src/main/res/raw/` → RingService 响铃播放
 * - JS 侧：`assets/sounds/` → expo-audio require() 打包 → SoundPickerModal 试听
 *
 * 注意：require 路径必须静态字面量（Metro 打包时解析），不能拼接，
 * 因此用显式键值对维护映射；新增内置音时两处目录都要放文件。
 */
import type { AudioSource } from 'expo-audio';

export const SOUND_ASSETS: Readonly<Record<string, AudioSource>> = {
  'classic-alarm': require('../../assets/sounds/ars_classic_alarm.ogg'),
  buzzer: require('../../assets/sounds/ars_buzzer.ogg'),
  'radar-ping': require('../../assets/sounds/ars_radar_ping.ogg'),
  'radar-soft': require('../../assets/sounds/ars_radar_soft.ogg'),
  marimba: require('../../assets/sounds/ars_marimba.ogg'),
  'piano-arpeggio': require('../../assets/sounds/ars_piano_arpeggio.ogg'),
  'music-box': require('../../assets/sounds/ars_music_box.ogg'),
  chime: require('../../assets/sounds/ars_chime.ogg'),
  'birds-morning': require('../../assets/sounds/ars_birds_morning.ogg'),
  'ocean-waves': require('../../assets/sounds/ars_ocean_waves.ogg'),
};

/** 按 id 取试听源（未知 id 返回 null，调用方静默跳过试听）。 */
export function getSoundAsset(id: string | null | undefined): AudioSource | null {
  if (!id) return null;
  return SOUND_ASSETS[id] ?? null;
}
