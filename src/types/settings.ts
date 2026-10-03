export type ThemePreference = 'system' | 'light';

export interface AppSettings {
  defaultSnoozeMinutes: number;
  theme: ThemePreference;
}
