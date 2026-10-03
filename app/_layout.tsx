import { useEffect, useRef } from 'react';
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
  replenishNotifications,
  addNotificationResponseListener,
} from '@/services/notification';
import { COLORS } from '@/constants';

// 在模块加载时立即配置前台通知处理（Expo Go 中安全跳过）
setupNotificationHandler();

export default function RootLayout() {
  const router = useRouter();
  const responseListener = useRef<{ remove: () => void } | null>(null);

  // T10: 启动初始化
  useEffect(() => {
    async function bootstrap() {
      // 1. 初始化数据库
      await initDatabase();

      // 2. 注册通知 category（贪睡 + 关闭按钮）
      await setupNotificationCategory();

      // 3. 创建 Android 通知频道
      await setupNotificationChannel();

      // 4. 申请通知权限
      await requestPermissions();

      // 5. 加载闹钟列表到 store
      const store = useAlarmStore.getState();
      await store.loadAlarms();

      // 6. 补充调度通知
      const alarms = useAlarmStore.getState().alarms;
      await replenishNotifications(alarms, repo.getAdjustments);
    }

    bootstrap();
  }, []);

  // T9: 通知交互 — 注册 notification response handler
  useEffect(() => {
    responseListener.current = addNotificationResponseListener(
      async (response) => {
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
          // 关闭：一次性闹钟响铃后自动关闭
          const alarm = await repo.getAlarmById(alarmId);
          if (alarm?.type === 'once' && alarm.enabled) {
            await store.toggleAlarm(alarmId);
          }
        } else {
          // 默认操作（点击通知本身）→ 跳转到编辑页
          const alarm = await repo.getAlarmById(alarmId);
          if (alarm?.type === 'once' && alarm.enabled) {
            await store.toggleAlarm(alarmId);
          }
          router.push(`/${alarmId}/edit`);
        }
      }
    );

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
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
