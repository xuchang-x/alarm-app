/**
 * 内置提示音的 JS bundle 资产映射（试听用）。
 *
 * 资产与原生 res/raw 用同一批 OGG 文件（tools/synthesize_sounds.py 产出）：
 * - 原生侧：`modules/alarm-ring/android/src/main/res/raw/` → RingService 响铃播放
 * - JS 侧：`assets/sounds/` → expo-audio require() 打包 → SoundPickerModal 试听
 *
 * 注意：require 路径必须静态字面量（Metro 打包时解析），不能拼接，
 * 因此本文件用显式键值对维护映射；新增内置音时两处目录都要放文件。
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

