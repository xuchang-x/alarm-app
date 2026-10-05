import { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SKIN } from '@/constants';
import { useSkinStyles } from '@/hooks/useSkinStyles';
import { stopRinging } from '@/services/ring-scheduler';
import { AlarmRing, type RingingInfo } from '../../../modules/alarm-ring/src/index';

/**
 * 响铃浮层（响铃时 App 内的关闭/稍后提醒入口）。
 *
 * 背景：此前响铃交互完全依赖通知横幅/全屏意图，App 在前台测试或
 * 横幅被系统/ROM 限制时，用户听得到铃声却没有任何关闭入口，只能杀 App。
 *
 * 机制：RingOverlayHost 每秒轮询原生 getRingingInfo（RingService 响铃
 * 期间置位快照，停止后清空），在前台检测到响铃即弹出全屏浮层。
 * 浮层关闭按钮 = 停止本次响铃；稍后提醒 = 按闹钟的贪睡分钟数重排一次触发。
 */
export function RingOverlayHost() {
  const [info, setInfo] = useState<RingingInfo | null>(null);
  const styles = useSkinStyles(createStyles);

  useEffect(() => {
    const native = AlarmRing;
    if (!native) return;
    let cancelled = false;

    const tick = () => {
      try {
        const snapshot = native.getRingingInfo();
        if (!cancelled) setInfo(snapshot);
      } catch {
        // 原生侧异常时不打断轮询（下一秒重试）
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      // 回前台立即拉一次，覆盖全屏意图拉起 App 的场景
      if (state === 'active') tick();
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const handleStop = () => {
    setInfo(null);
    void stopRinging();
  };

  const handleSnooze = () => {
    const current = info;
    setInfo(null);
    if (!current) return;
    void (async () => {
      try {
        if (AlarmRing) {
          await AlarmRing.scheduleSnooze(current.alarmId);
        }
      } finally {
        await stopRinging();
      }
    })();
  };

  if (!info) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.root}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>⏰</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {info.title}
          </Text>
          {info.body ? <Text style={styles.body}>{info.body}</Text> : null}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`稍后 ${info.snoozeMinutes} 分钟提醒`}
              style={({ pressed }) => [styles.buttonSnooze, pressed && styles.buttonPressed]}
              onPress={handleSnooze}
            >
              <Text style={styles.buttonSnoozeText}>稍后 {info.snoozeMinutes} 分钟</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭闹钟"
              style={({ pressed }) => [styles.buttonStop, pressed && styles.buttonPressed]}
              onPress={handleStop}
            >
              <Text style={styles.buttonStopText}>关闭</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type RingStyles = ReturnType<typeof createStyles>;

function createStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: SKIN.misc.backdrop,
      paddingHorizontal: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      paddingTop: 28,
      paddingHorizontal: 22,
      paddingBottom: 22,
      borderRadius: 28,
      backgroundColor: SKIN.surface.card,
      shadowColor: SKIN.misc.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 26,
      elevation: 12,
    },
    badge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: SKIN.brand.primarySoft,
      marginBottom: 16,
    },
    badgeIcon: { fontSize: 34 },
    title: {
      color: SKIN.text.primary,
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 28,
      textAlign: 'center',
    },
    body: {
      marginTop: 8,
      color: SKIN.text.secondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    footer: { flexDirection: 'row', gap: 10, marginTop: 24, alignSelf: 'stretch' },
    buttonSnooze: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      borderRadius: 16,
      backgroundColor: SKIN.surface.input,
    },
    buttonSnoozeText: { color: SKIN.text.primary, fontSize: 15, fontWeight: '700' },
    buttonStop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      borderRadius: 16,
      backgroundColor: SKIN.brand.primary,
    },
    buttonStopText: { color: SKIN.brand.onPrimary, fontSize: 15, fontWeight: '800' },
    buttonPressed: { opacity: 0.82 },
  });
}
