import { useRef } from 'react';
import { StyleSheet, Text, View, Switch, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { Alarm } from '@/types/alarm';
import { COLORS } from '@/constants';
import { formatTime } from '@/utils/date';

interface AlarmCardProps {
  alarm: Alarm;
  nextRingDate: string | null;
  onToggle: (id: number) => void;
  onPress: (id: number) => void;
  onDelete: (id: number) => void;
  onSkip?: (id: number) => void;
  onAddOnce?: (id: number) => void;
}

/** 获取闹钟的重复规则描述 */
function getRepeatLabel(alarm: Alarm): string {
  switch (alarm.type) {
    case 'once':
      return alarm.onceDate ?? '一次性';
    case 'daily':
      return '每天';
    case 'weekly': {
      if (!alarm.weekdays || alarm.weekdays.length === 0) return '每周';
      const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      return alarm.weekdays.map((d) => dayNames[d]).join(' ');
    }
    case 'cycle':
      return `每${alarm.intervalDays}天`;
    default:
      return '';
  }
}

const BUTTON_WIDTH = 56;

export default function AlarmCard({
  alarm,
  nextRingDate,
  onToggle,
  onPress,
  onDelete,
  onSkip,
  onAddOnce,
}: AlarmCardProps) {
  const isEnabledCycle = alarm.enabled && alarm.type === 'cycle';
  const maxSwipe = isEnabledCycle ? BUTTON_WIDTH * 3 : BUTTON_WIDTH;

  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const handleDelete = () => onDelete(alarm.id);
  const handleSkip = () => onSkip?.(alarm.id);
  const handleAddOnce = () => onAddOnce?.(alarm.id);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((e) => {
      const newValue = contextX.value + e.translationX;
      translateX.value = Math.max(-maxSwipe, Math.min(0, newValue));
    })
    .onEnd(() => {
      // 滑动超过一半则吸附到最大位置，否则回弹
      if (translateX.value < -maxSwipe / 2) {
        translateX.value = withSpring(-maxSwipe, { damping: 20 });
      } else {
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.wrapper}>
      {/* 左滑按钮层 */}
      <View style={styles.actionsContainer}>
        {isEnabledCycle && (
          <>
            <Pressable
              style={[styles.actionButton, styles.skipButton]}
              onPress={handleSkip}
            >
              <Text style={styles.actionText}>跳过</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.addButton]}
              onPress={handleAddOnce}
            >
              <Text style={styles.actionText}>加一次</Text>
            </Pressable>
          </>
        )}
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.actionText}>删除</Text>
        </Pressable>
      </View>

      {/* 卡片主体（可滑动） */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedCardStyle}>
          <Pressable
            style={[
              styles.card,
              !alarm.enabled && styles.cardDisabled,
            ]}
            onPress={() => onPress(alarm.id)}
          >
            <View style={styles.cardContent}>
              <View style={styles.timeRow}>
                <Text
                  style={[
                    styles.time,
                    !alarm.enabled && styles.textDisabled,
                  ]}
                >
                  {formatTime(alarm.hour, alarm.minute)}
                </Text>
                <Switch
                  value={alarm.enabled}
                  onValueChange={() => onToggle(alarm.id)}
                  trackColor={{
                    false: COLORS.border,
                    true: COLORS.primary,
                  }}
                />
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.label,
                    !alarm.enabled && styles.textDisabled,
                  ]}
                >
                  {alarm.label || getRepeatLabel(alarm)}
                </Text>
                {nextRingDate && alarm.enabled && (
                  <Text style={styles.nextDate}>下次: {nextRingDate}</Text>
                )}
              </View>
              {alarm.label ? (
                <Text
                  style={[
                    styles.repeat,
                    !alarm.enabled && styles.textDisabled,
                  ]}
                >
                  {getRepeatLabel(alarm)}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionButton: {
    width: BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: COLORS.warning,
  },
  addButton: {
    backgroundColor: COLORS.success,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  cardDisabled: {
    backgroundColor: COLORS.card,
  },
  cardContent: {
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 36,
    fontWeight: '300',
    color: COLORS.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  repeat: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  nextDate: {
    fontSize: 12,
    color: COLORS.primary,
  },
  textDisabled: {
    color: COLORS.textDisabled,
  },
});
