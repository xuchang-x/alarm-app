import { useEffect, useRef } from 'react';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioSource,
  type AudioPlayer,
} from 'expo-audio';

/**
 * 内置提示音试听 hook（007）。
 *
 * - 单实例播放器：切换音源时 replace(src)，避免多实例叠音
 * - 每次试听从头播放（不是暂停/续播语义）
 * - 卸载时 release；进入试听模式时切全局音频模式（静音开关遵从、打断音乐）
 */
export function useSoundPreview() {
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    return () => {
      playerRef.current?.release();
      playerRef.current = null;
    };
  }, []);

  /** 试听（内置音资产源或本地 URI）。已在播则重头再放。 */
  const preview = async (source: AudioSource): Promise<void> => {
    try {
      // 全局音频模式：试听是用户主动点击的即时反馈，应始终出声。
      // 注意 playsInSilentMode 必须为 true：expo-audio 在 Android 上该值为 false 时，
      // 铃声模式为静音/震动的手机会直接抑制播放（点了没声音，看似按钮失效）。
      // 闹钟类 App 的试听语义与系统时钟一致：静音/震动下也要响。
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });
    } catch {
      // 音频模式设置失败不阻断试听
    }

    const player = playerRef.current;
    if (player) {
      // 单实例复用：切换源并从头播放
      player.replace(source);
      player.seekTo(0);
      player.play();
      return;
    }
    const created = createAudioPlayer(source);
    playerRef.current = created;
    created.play();
  };

  /** 停止试听（不释放实例，下次复用） */
  const stop = (): void => {
    playerRef.current?.pause();
  };

  /** 完全释放（关闭选择器时调用） */
  const release = (): void => {
    playerRef.current?.release();
    playerRef.current = null;
  };

  return { preview, stop, release };
}
