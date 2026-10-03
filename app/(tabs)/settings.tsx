import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, DEFAULT_SNOOZE_MINUTES } from '@/constants';
import {
  getNotificationPermissionStatus,
  requestPermissions,
  type NotificationPermissionStatus,
} from '@/services/notification';
import { useSettingsStore } from '@/store/settings-store';
import type { ThemePreference } from '@/types/settings';

const SNOOZE_OPTIONS = [5, 10, 15, 20, 30] as const;

const PERMISSION_LABELS: Record<NotificationPermissionStatus, string> = {
  granted: '已允许',
  denied: '已拒绝',
  undetermined: '未设置',
  unavailable: '当前环境不可用',
};

function getPermissionActionLabel(status: NotificationPermissionStatus): string {
  if (status === 'granted') return '刷新状态';
  if (status === 'denied') return '前往系统设置';
  if (status === 'unavailable') return '不可用';
  return '允许通知';
}

export default function SettingsScreen() {
  const { settings, loading, loadSettings, updateSettings } = useSettingsStore();
  const [permission, setPermission] = useState<NotificationPermissionStatus>('undetermined');
  const [permissionLoading, setPermissionLoading] = useState(true);

  const refreshPermission = useCallback(async () => {
    setPermissionLoading(true);
    try {
      setPermission(await getNotificationPermissionStatus());
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void refreshPermission();
  }, [loadSettings, refreshPermission]);

  const handlePermissionPress = async () => {
    if (permission === 'denied') {
      await Linking.openSettings();
      return;
    }
    if (permission === 'undetermined') {
      await requestPermissions();
    }
    await refreshPermission();
  };

  const handleSnoozeChange = async (minutes: number) => {
    await updateSettings({ defaultSnoozeMinutes: minutes });
  };

  const handleThemeChange = async (theme: ThemePreference) => {
    await updateSettings({ theme });
    if (theme === 'system') {
      Alert.alert('主题设置', '已保存为跟随系统。完整深色主题将在视觉规范确定后启用。');
    }
  };

  if (loading && settings.defaultSnoozeMinutes === DEFAULT_SNOOZE_MINUTES) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>正在加载设置</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>APP PREFERENCES</Text>
          <Text style={styles.title}>设置</Text>
          <Text style={styles.subtitle}>管理通知、默认提醒和外观偏好</Text>
        </View>

        <SettingsSection title="通知权限" description="确保提醒可以按时送达">
          <View style={styles.statusRow}>
            <View style={styles.statusCopy}>
              <Text style={styles.rowTitle}>系统通知</Text>
              <Text style={styles.rowDescription}>
                {permissionLoading ? '正在检查权限状态' : PERMISSION_LABELS[permission]}
              </Text>
            </View>
            <View style={[styles.statusPill, permission === 'granted' && styles.statusPillSuccess]}>
              <Text style={[styles.statusPillText, permission === 'granted' && styles.statusPillTextSuccess]}>
                {permissionLoading ? '检查中' : PERMISSION_LABELS[permission]}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            disabled={permissionLoading || permission === 'unavailable'}
            onPress={() => void handlePermissionPress()}
          >
            <Text style={styles.actionButtonText}>{getPermissionActionLabel(permission)}</Text>
          </Pressable>
        </SettingsSection>

        <SettingsSection title="默认提醒" description="只影响之后新建的闹钟">
          <Text style={styles.rowTitle}>默认贪睡时长</Text>
          <Text style={styles.rowDescription}>通知响起后，稍后提醒的默认延迟时间</Text>
          <View style={styles.optionRow}>
            {SNOOZE_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                accessibilityRole="radio"
                accessibilityState={{ selected: settings.defaultSnoozeMinutes === minutes }}
                style={[
                  styles.option,
                  settings.defaultSnoozeMinutes === minutes && styles.optionActive,
                ]}
                onPress={() => void handleSnoozeChange(minutes)}
              >
                <Text style={[styles.optionText, settings.defaultSnoozeMinutes === minutes && styles.optionTextActive]}>
                  {minutes} 分钟
                </Text>
              </Pressable>
            ))}
          </View>
        </SettingsSection>

        <SettingsSection title="外观" description="统一控制各页面的主题偏好">
          <Text style={styles.rowTitle}>主题</Text>
          <Text style={styles.rowDescription}>当前浅色主题已完整适配</Text>
          <View style={styles.themeOptions}>
            <ThemeOption
              label="跟随系统"
              active={settings.theme === 'system'}
              onPress={() => void handleThemeChange('system')}
            />
            <ThemeOption
              label="浅色"
              active={settings.theme === 'light'}
              onPress={() => void handleThemeChange('light')}
            />
          </View>
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ThemeOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[styles.themeOption, active && styles.themeOptionActive]}
      onPress={onPress}
    >
      <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  pageHeader: { paddingTop: 12, paddingBottom: 22 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 5, color: COLORS.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { marginTop: 5, color: COLORS.textSecondary, fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  sectionDescription: { marginTop: 4, color: COLORS.textSecondary, fontSize: 12 },
  sectionCard: { marginTop: 10, padding: 16, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusCopy: { flex: 1 },
  rowTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  rowDescription: { marginTop: 4, color: COLORS.textSecondary, fontSize: 11, lineHeight: 17 },
  statusPill: { marginLeft: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: COLORS.input },
  statusPillSuccess: { backgroundColor: '#DDF4ED' },
  statusPillText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  statusPillTextSuccess: { color: COLORS.success },
  actionButton: { alignItems: 'center', marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: COLORS.primarySoft },
  actionButtonPressed: { backgroundColor: COLORS.border },
  actionButtonText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  option: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  optionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  optionText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  optionTextActive: { color: COLORS.primaryDark },
  themeOptions: { flexDirection: 'row', gap: 8, marginTop: 13 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  themeOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  themeOptionText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  themeOptionTextActive: { color: COLORS.primaryDark },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 12 },
});
