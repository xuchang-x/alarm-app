import { StyleSheet, Text, View, Switch, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { Alarm } from '@/types/alarm';
import {
  ALARM_TYPE_LABELS,
  COLORS,
  SKIN,
  getAlarmCategory,
} from '@/constants';
import { formatTime, parseDate, today } from '@/utils/date';

interface AlarmCardProps {
  alarm: Alarm;
  nextRingDate: string | null;
  onToggle: (id: number) => void;
  onPress: (id: number) => void;
  onDelete: (id: number) => void;
  onSkip?: (id: number) => void;
  onAddOnce?: (id: number) => void;
  onDuplicate?: (id: number) => void;
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
  onDuplicate,
}: AlarmCardProps) {
  const isEnabledCycle = alarm.enabled && alarm.type === 'cycle';
  const maxSwipe = isEnabledCycle ? BUTTON_WIDTH * 4 : BUTTON_WIDTH * 2;
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    // 仅水平激活：垂直方向先动则手势失败，把触摸还给列表滚动
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
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

  const category = getAlarmCategory(alarm.category);
  const isExpiredOnce = alarm.type === 'once' && alarm.onceDate !== null && parseDate(alarm.onceDate) < today();

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
        <Pressable style={[styles.actionButton, styles.copyButton]} onPress={() => onDuplicate?.(alarm.id)}>
          <Text style={styles.actionText}>复制</Text>
        </Pressable>
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
                  <View style={[styles.statusDot, { backgroundColor: category.color }, (!alarm.enabled || isExpiredOnce) && styles.statusDotDisabled]} />
                  <Text style={[styles.statusText, (!alarm.enabled || isExpiredOnce) && styles.textDisabled]}>
                    {!alarm.enabled ? '已暂停' : isExpiredOnce ? '已过期' : '已开启'}
                  </Text>
                </View>
                <Text style={[styles.time, (!alarm.enabled || isExpiredOnce) && styles.textDisabled]}>
                  {formatTime(alarm.hour, alarm.minute)}
                </Text>
              </View>
              <Switch
                value={alarm.enabled}
                onValueChange={() => onToggle(alarm.id)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={SKIN.brand.onPrimary}
                ios_backgroundColor={COLORS.border}
              />
            </View>

            <View style={styles.infoRow}>
              <View style={styles.copyBlock}>
                <Text style={[styles.label, (!alarm.enabled || isExpiredOnce) && styles.textDisabled]} numberOfLines={1}>
                  {alarm.label || '未命名提醒'}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.typePill}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <Text style={styles.typeText}>{category.label} · </Text>
                    <Text style={styles.typeText}>{ALARM_TYPE_LABELS[alarm.type]}</Text>
                  </View>
                </View>
              </View>
              {alarm.enabled && (nextRingDate || alarm.onceDate) && (
                <View style={styles.nextDatePill}>
                  <Text style={styles.nextDateLabel}>
                    {alarm.type === 'once' ? '提醒日期' : '下次'}
                  </Text>
                  <Text style={styles.nextDate}>
                    {alarm.type === 'once' ? alarm.onceDate : nextRingDate}
                  </Text>
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
  copyButton: {
    backgroundColor: COLORS.primary,
  },
  actionText: {
    color: SKIN.brand.onPrimary,
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
    backgroundColor: SKIN.surface.cardPressed,
  },
  cardDisabled: {
    backgroundColor: SKIN.surface.cardDisabledBg,
    borderColor: SKIN.line.cardDisabledBorder,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: COLORS.primarySoft,
  },
  categoryDot: {
    width: 6,
    height: 6,
    marginRight: 4,
    borderRadius: 3,
  },
  typeText: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  nextDatePill: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  nextDateLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  nextDate: {
    color: COLORS.primaryDark,
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  textDisabled: {
    color: COLORS.textDisabled,
  },
});
