import { getDatabase } from './connection';
import { DEFAULT_SNOOZE_MINUTES } from '@/constants';
import type { AppSettings, ThemePreference } from '@/types/settings';

const DEFAULT_SETTINGS: AppSettings = {
  defaultSnoozeMinutes: DEFAULT_SNOOZE_MINUTES,
  theme: 'system',
};

interface SettingRow {
  key: string;
  value: string;
}

async function ensureSettingsTable(): Promise<Awaited<ReturnType<typeof getDatabase>>> {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await ensureSettingsTable();
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
    theme: theme === 'light' ? 'light' : DEFAULT_SETTINGS.theme,
  };
}

export async function updateAppSettings(
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const db = await ensureSettingsTable();

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

export function isThemePreference(value: string): value is ThemePreference {
  return value === 'system' || value === 'light';
}
