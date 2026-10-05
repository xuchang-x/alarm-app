import { getDatabase } from './connection';
import { DEFAULT_SNOOZE_MINUTES } from '@/constants';
import type { AppSettings, ThemePreference } from '@/types/settings';

interface SettingRow {
  key: string;
  value: string;
}

/** 设置默认值（单一事实源，settings-store 初始态也从这里取） */
export const DEFAULT_SETTINGS: AppSettings = {
  defaultSnoozeMinutes: DEFAULT_SNOOZE_MINUTES,
  theme: 'system',
};

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SettingRow>(
    'SELECT key, value FROM app_settings'
  );
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const parsedSnooze = Number(values.get('default_snooze_minutes'));
  const theme = values.get('theme');

  return {
    defaultSnoozeMinutes:
      Number.isInteger(parsedSnooze) && parsedSnooze > 0 && parsedSnooze <= 60
        ? parsedSnooze
        : DEFAULT_SETTINGS.defaultSnoozeMinutes,
    theme: isThemePreference(theme) ? theme : DEFAULT_SETTINGS.theme,
  };
}

export async function updateAppSettings(
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const db = await getDatabase();

  if (settings.defaultSnoozeMinutes !== undefined) {
    await db.runAsync(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      'default_snooze_minutes',
      String(settings.defaultSnoozeMinutes)
    );
  }

  if (settings.theme !== undefined) {
    await db.runAsync(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      'theme',
      settings.theme
    );
  }

  return getAppSettings();
}

/** 主题偏好守卫：'system' | 'light' | 'dark'（含 008 新增的深色档） */
export function isThemePreference(value: string | undefined | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
