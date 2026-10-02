import { StyleSheet, Text, View, Switch, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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

function getRepeatLabel(alarm: Alarm): string {
  switch (alarm.type) {
    case 'once':
      return alarm.onceDate ?? '一次性提醒';
    case 'daily':
      return '每天';
    case 'weekly': {
      if (!alarm.weekdays || alarm.weekdays.length === 0) return '每周';
      const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      return alarm.weekdays.map((day) => dayNames[day]).join(' ');
    }
    case 'cycle':
      return `每 ${alarm.intervalDays} 天`;
    default:
      return '';
  }
}

const BUTTON_WIDTH = 58;

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

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = contextX.value + event.translationX;
      translateX.value = Math.max(-maxSwipe, Math.min(0, newValue));
    })
    .onEnd(() => {
      translateX.value = withSpring(
        translateX.value < -maxSwipe / 2 ? -maxSwipe : 0,
        { damping: 20 }
      );
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.actionsContainer}>
        {isEnabledCycle && (
          <>
            <Pressable style={[styles.actionButton, styles.skipButton]} onPress={() => onSkip?.(alarm.id)}>
              <Text style={styles.actionText}>跳过</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.addButton]} onPress={() => onAddOnce?.(alarm.id)}>
              <Text style={styles.actionText}>加一次</Text>
            </Pressable>
          </>
        )}
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(alarm.id)}>
          <Text style={styles.actionText}>删除</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedCardStyle}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              !alarm.enabled && styles.cardDisabled,
              pressed && styles.cardPressed,
            ]}
            onPress={() => onPress(alarm.id)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.timeBlock}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, !alarm.enabled && styles.statusDotDisabled]} />
                  <Text style={[styles.statusText, !alarm.enabled && styles.textDisabled]}>
                    {alarm.enabled ? '已开启' : '已暂停'}
                  </Text>
                </View>
                <Text style={[styles.time, !alarm.enabled && styles.textDisabled]}>
                  {formatTime(alarm.hour, alarm.minute)}
                </Text>
              </View>
              <Switch
                value={alarm.enabled}
                onValueChange={() => onToggle(alarm.id)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={COLORS.border}
              />
            </View>

            <View style={styles.infoRow}>
              <View style={styles.copyBlock}>
                <Text style={[styles.label, !alarm.enabled && styles.textDisabled]} numberOfLines={1}>
                  {alarm.label || '未命名提醒'}
                </Text>
                <Text style={[styles.repeat, !alarm.enabled && styles.textDisabled]} numberOfLines={1}>
                  {getRepeatLabel(alarm)}
                </Text>
              </View>
              {nextRingDate && alarm.enabled && (
                <View style={styles.nextDatePill}>
                  <Text style={styles.nextDate}>下次 {nextRingDate}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 7,
    borderRadius: 20,
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
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#FBFAFF',
    transform: [{ scale: 0.99 }],
  },
  cardDisabled: {
    backgroundColor: '#FBFAFD',
    borderColor: '#ECE9F2',
    shadowOpacity: 0.03,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeBlock: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    marginRight: 6,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  statusDotDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  time: {
    color: COLORS.textPrimary,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  copyBlock: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  repeat: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  nextDatePill: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  nextDate: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },
  textDisabled: {
    color: COLORS.textDisabled,
  },
});
