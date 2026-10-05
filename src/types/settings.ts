export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  defaultSnoozeMinutes: number;
  theme: ThemePreference;
}
