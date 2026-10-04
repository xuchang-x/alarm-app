import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '@/db/schema';
import { useAlarmStore } from '@/store/alarm-store';
import * as repo from '@/db/alarm-repository';
import {
  setupNotificationHandler,
  setupNotificationCategory,
  setupNotificationChannel,
  requestPermissions,
  addNotificationResponseListener,
} from '@/services/notification';
import { replenishAlarmRinging } from '@/services/ring-scheduler';
import { SkinAlertHost } from '@/components/common/SkinAlert';
import { COLORS } from '@/constants';

// 在模块加载时立即配置前台通知处理（Expo Go 中安全跳过）
setupNotificationHandler();

/**
 * 启动/回前台的统一维护任务：
 * 1. 关闭日期已过去的一次性闹钟（响完未处理的归位为关闭态）
 * 2. 补排响铃调度（Android 原生层自身可靠，主要兜截断续期；iOS 兜系统清理）
 */
async function maintainSchedules(): Promise<void> {
  try {
    await repo.expirePastOnceAlarms();
    const alarms = useAlarmStore.getState().alarms;
    await replenishAlarmRinging(alarms, repo.getAdjustments);
  } catch (error) {
    // 维护任务失败不阻断启动（App 本身仍可用），记录日志便于排查
    console.warn('[layout] 维护调度任务失败:', error);
  }
}

export default function RootLayout() {
  const router = useRouter();
  const responseListener = useRef<{ remove: () => void } | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // 启动初始化
  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. 初始化数据库（失败则提示，不抛未处理 rejection）
        await initDatabase();
      } catch (error) {
        console.warn('[layout] 数据库初始化失败:', error);
      }

      try {
        // 2. 注册通知 category（贪睡 + 关闭按钮）
        await setupNotificationCategory();

        // 3. 创建 Android 通知频道
        await setupNotificationChannel();

        // 4. 申请通知权限
        await requestPermissions();

        // 5. 加载闹钟列表到 store（过期 once 归位依赖列表先就绪）
        await useAlarmStore.getState().loadAlarms();

        // 6. 过期归位 + 补充调度
        await maintainSchedules();
      } catch (error) {
        console.warn('[layout] 通知初始化失败:', error);
      }
    }

    bootstrap();
  }, []);

  // 回前台时补排（应用长驻后台/被系统杀掉重启的场景）
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appState.current;
      appState.current = nextState;
      if (previous.match(/inactive|background/) && nextState === 'active') {
        void useAlarmStore.getState().loadAlarms().then(() => {
          void maintainSchedules();
        });
      }
    });

    return () => subscription.remove();
  }, []);

  // 通知交互 — 注册 notification response handler
  useEffect(() => {
    const handleResponse = async (
      response: import('expo-notifications').NotificationResponse
    ) => {
      const { actionIdentifier, notification } = response;
      const alarmId = notification.request.content.data?.alarmId as
        | number
        | undefined;

      if (!alarmId) return;

      const store = useAlarmStore.getState();

      if (actionIdentifier === 'snooze') {
        // 贪睡：调度 N 分钟后的通知
        await store.snooze(alarmId);
      } else if (actionIdentifier === 'dismiss') {
        // 关闭按钮：一次性闹钟响铃后关闭
        const alarm = await repo.getAlarmById(alarmId);
        if (alarm?.type === 'once' && alarm.enabled) {
          await store.toggleAlarm(alarmId);
        }
      } else {
        // 点击通知正文 → 仅跳转编辑页（用户「查看」≠「关闭」，由编辑页自行处理）
        router.push(`/${alarmId}/edit`);
      }
    };

    responseListener.current = addNotificationResponseListener((response) => {
      void handleResponse(response);
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="create" />
          <Stack.Screen name="[id]/edit" />
        </Stack>
        {/* 皮肤化系统弹窗宿主，业务代码统一走 SkinAlert.alert */}
        <SkinAlertHost />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
