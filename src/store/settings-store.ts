import { create } from 'zustand';
import * as repo from '@/db/settings-repository';
import type { AppSettings } from '@/types/settings';

interface SettingsStore {
  settings: AppSettings;
  loading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: repo.DEFAULT_SETTINGS,
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    try {
      const settings = await repo.getAppSettings();
      set({ settings });
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (patch) => {
    const settings = await repo.updateAppSettings(patch);
    set({ settings });
  },
}));
