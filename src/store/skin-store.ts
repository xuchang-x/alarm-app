import { Appearance } from 'react-native';
import { create } from 'zustand';
import { AlarmRing } from 'modules/alarm-ring/src/index';
import {
  applySkinTheme,
  getInitialSkinPreference,
  resolveSkinTheme,
  type SkinThemeName,
} from '@/constants/theme';
import { useSettingsStore } from '@/store/settings-store';
import type { ThemePreference } from '@/types/settings';

/**
 * 皮肤运行时状态：驱动「响应式主题切换」的唯一发布源。
 *
 * 主题切换 = 原地覆写 SKIN/COLORS（applySkinTheme）+ version +1，
 * 订阅 version 的组件重建样式表，全程不 reload JS、不重启、不丢导航状态。
 * 冷启动首帧仍由 theme.ts 求值阶段读原生偏好定型，此处接管之后的运行时切换。
 */
interface SkinStoreState {
  /** 当前主题偏好（跟随系统/浅色/深色） */
  preference: ThemePreference;
  /** 主题版本号：实际生效的主题每变化一次 +1 */
  version: number;
  /**
   * 应用主题偏好：解析 → 原地覆写 → 版本 +1。
   * persist=false 用于「跟随系统」的系统侧变更，不重复落盘。
   */
  setPreference: (pref: ThemePreference, options?: { persist?: boolean }) => Promise<void>;
}

export const useSkinStore = create<SkinStoreState>((set, get) => ({
  preference: getInitialSkinPreference(),
  version: 0,

  setPreference: async (pref, options) => {
    const persist = options?.persist ?? true;
    if (persist) {
      // DB（设置页回显）与原生 SharedPreferences（下次冷启动定型）双落盘
      await useSettingsStore.getState().updateSettings({ theme: pref });
      AlarmRing?.setSkinTheme(pref);
    }
    applySkinTheme(resolveSkinTheme(pref));
    set({ preference: pref, version: get().version + 1 });
  },
}));

// 「跟随系统」实时生效：系统深浅切换时立即覆写皮肤并通知订阅组件
Appearance.addChangeListener(({ colorScheme }) => {
  if (useSkinStore.getState().preference === 'system') {
    void useSkinStore.getState().setPreference('system', { persist: false });
  }
});
