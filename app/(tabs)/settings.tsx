import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { PageHeading } from "@/components/common/PageHeader";
import { SkinAlert } from "@/components/common/SkinAlert";
import { COLORS, SNOOZE_OPTIONS, SKIN } from "@/constants";
import { useSkinStyles } from "@/hooks/useSkinStyles";
import {
  getNotificationPermissionStatus,
  requestPermissions,
  type NotificationPermissionStatus,
} from "@/services/notification";
import {
  isIgnoringBatteryOptimizations,
  isNativeRingAvailable,
  requestIgnoreBatteryOptimizations,
} from "@/services/ring-scheduler";
import { useSkinStore } from "@/store/skin-store";
import { useSettingsStore } from "@/store/settings-store";
import type { ThemePreference } from "@/types/settings";

const PERMISSION_LABELS: Record<NotificationPermissionStatus, string> = {
  granted: "已允许",
  denied: "已拒绝",
  undetermined: "未设置",
  unavailable: "不可用",
};

/** 关于卡片展示的应用名（与 app.json expo.name 保持一致） */
const APP_DISPLAY_NAME = "钟意";

export default function SettingsScreen() {
  const styles = useSkinStyles(createStyles);
  const { settings, loading, loadSettings, updateSettings } =
    useSettingsStore();
  const [permission, setPermission] =
    useState<NotificationPermissionStatus>("undetermined");
  const [permissionLoading, setPermissionLoading] = useState(true);
  /** 电池优化白名单状态；null = 原生响铃模块不可用（Expo Go/iOS），不展示保障行 */
  const [batteryWhitelisted, setBatteryWhitelisted] = useState<
    boolean | null
  >(null);

  const refreshPermission = useCallback(async () => {
    setPermissionLoading(true);
    try {
      setPermission(await getNotificationPermissionStatus());
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  const refreshBattery = useCallback(() => {
    if (!isNativeRingAvailable()) return;
    setBatteryWhitelisted(isIgnoringBatteryOptimizations());
  }, []);

  useEffect(() => {
    void loadSettings();
    void refreshPermission();
    refreshBattery();
  }, [loadSettings, refreshPermission, refreshBattery]);

  // 从系统设置/电池优化对话框返回时刷新权限与白名单状态
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshPermission();
        refreshBattery();
      }
    });
    return () => subscription.remove();
  }, [refreshPermission, refreshBattery]);

  // 自愈同步：若 DB 偏好与运行时皮肤不一致（如历史版本原生落盘失败），以 DB 为准纠正
  useEffect(() => {
    if (!loading && settings.theme !== useSkinStore.getState().preference) {
      void useSkinStore
        .getState()
        .setPreference(settings.theme, { persist: false });
    }
  }, [loading, settings.theme]);

  const handlePermissionPress = async () => {
    if (permission === "denied") {
      await Linking.openSettings();
      return;
    }
    if (permission === "undetermined") {
      await requestPermissions();
    }
    await refreshPermission();
  };

  const handleBatteryPress = async () => {
    if (batteryWhitelisted) return;
    // 用户在系统对话框中的选择以回前台后的 AppState 刷新为准
    await requestIgnoreBatteryOptimizations();
  };

  const handleSnoozeChange = async (minutes: number) => {
    await updateSettings({ defaultSnoozeMinutes: minutes });
  };

  const handleSnoozePress = () => {
    SkinAlert.alert("默认稍后提醒", "响铃后一键贪睡的时长", [
      ...SNOOZE_OPTIONS.map((minutes) => ({
        text: `${minutes} 分钟`,
        onPress: () => void handleSnoozeChange(minutes),
      })),
      { text: "取消", style: "cancel" as const },
    ]);
  };

  const handleThemeChange = async (theme: ThemePreference) => {
    // 皮肤 store 统一处理：DB + 原生双落盘、原地覆写 SKIN/COLORS、版本号驱动全组件重建，
    // 全程不 reload JS、不重启、不丢页面状态
    await useSkinStore.getState().setPreference(theme);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>正在加载设置</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <PageHeading
            eyebrow="SETTINGS"
            title="设置"
            subtitle="主题切换即时生效"
          />
        </View>

        {/* 通知 + 响铃保障 + 默认稍后提醒 */}
        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              styles.rowDivided,
              pressed && styles.rowPressed,
            ]}
            onPress={() => void handlePermissionPress()}
          >
            <View style={styles.info}>
              <Text style={styles.rowTitle}>通知权限</Text>
              <Text style={styles.rowDescription}>确保提醒可以按时送达</Text>
            </View>
            <Text
              style={[
                styles.rowValue,
                permission === "granted" && styles.rowValueSuccess,
              ]}
            >
              {permissionLoading ? "检查中" : PERMISSION_LABELS[permission]}
            </Text>
          </Pressable>
          {batteryWhitelisted !== null && (
            <>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  styles.rowDivided,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => void handleBatteryPress()}
              >
                <View style={styles.info}>
                  <Text style={styles.rowTitle}>后台运行保障</Text>
                  <Text style={styles.rowDescription}>
                    关闭电池优化，杀 App 后闹钟也能准时响铃
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rowValue,
                    batteryWhitelisted && styles.rowValueSuccess,
                  ]}
                >
                  {batteryWhitelisted ? "已开启" : "去开启 ›"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  styles.rowDivided,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => void Linking.openSettings()}
              >
                <View style={styles.info}>
                  <Text style={styles.rowTitle}>自启动与省电策略</Text>
                  <Text style={styles.rowDescription}>
                    小米/OPPO/vivo 等机型还需允许自启动，并将省电策略设为「无限制」
                  </Text>
                </View>
                <Text style={styles.rowValue}>去设置 ›</Text>
              </Pressable>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleSnoozePress}
          >
            <View style={styles.info}>
              <Text style={styles.rowTitle}>默认稍后提醒</Text>
              <Text style={styles.rowDescription}>响铃后一键贪睡的时长</Text>
            </View>
            <Text style={styles.rowValue}>
              {settings.defaultSnoozeMinutes} 分钟 ›
            </Text>
          </Pressable>
        </View>

        {/* 主题 */}
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.rowTitle}>主题</Text>
              <Text style={styles.rowDescription}>深色模式跟随此设置</Text>
            </View>
          </View>
          <View style={styles.themeOptions}>
            <ThemeOption
              label="跟随系统"
              active={settings.theme === "system"}
              onPress={() => void handleThemeChange("system")}
            />
            <ThemeOption
              label="浅色"
              active={settings.theme === "light"}
              onPress={() => void handleThemeChange("light")}
            />
            <ThemeOption
              label="深色"
              active={settings.theme === "dark"}
              onPress={() => void handleThemeChange("dark")}
            />
          </View>
        </View>

        {/* 关于 */}
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.rowTitle}>关于</Text>
              <Text style={styles.rowDescription}>
                版本 {Constants.expoConfig?.version ?? "未知"} ·{" "}
                {APP_DISPLAY_NAME}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  const styles = useSkinStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[styles.themeOption, active && styles.themeOptionActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.themeOptionText, active && styles.themeOptionTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingHorizontal: 20, paddingBottom: 32 },
    pageHeader: { paddingTop: 12, paddingBottom: 14 },
    // 分组卡片：圆角 + 内嵌行 + 行分隔线（对照 008 原型 set-group/set-row）
    group: {
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 16,
      marginBottom: 14,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    rowDivided: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    rowPressed: {
      backgroundColor: SKIN.surface.cardPressed,
    },
    info: { flex: 1 },
    rowTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
    rowDescription: {
      marginTop: 2,
      color: COLORS.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
    rowValue: { fontSize: 13, color: COLORS.textSecondary },
    rowValueSuccess: { color: COLORS.success, fontWeight: "600" },
    themeOptions: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    themeOption: {
      alignItems: "center",
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    themeOptionActive: {
      borderColor: SKIN.state.selectedBorder,
      backgroundColor: SKIN.state.selectedBg,
    },
    themeOptionText: { color: COLORS.textSecondary, fontSize: 12 },
    themeOptionTextActive: {
      color: SKIN.state.selectedText,
      fontWeight: "600",
    },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    loadingText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 12 },
  });
}
