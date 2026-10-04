import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { TodayItem } from '@/hooks/useTodayOverview';
import type { Alarm } from '@/types/alarm';
import { ALARM_CATEGORIES, COLORS } from '@/constants';
import { formatTime } from '@/utils/date';

/** 左滑操作按钮宽度 */
const SKIP_BUTTON_WIDTH = 72;

function getTypeLabel(alarm: Alarm): string {
  switch (alarm.type) {
    case 'once':
      return '一次';
    case 'daily':
      return '每天';
    case 'weekly':
      return '每周';
    default:
      return '';
  }
}

function getMetaText(item: TodayItem): string {
  const { alarm, rhythm } = item;
  if (alarm.type === 'cycle' && rhythm && alarm.intervalDays) {
    return `每 ${alarm.intervalDays} 天 · 今天第 ${rhythm.dayIndex} 天`;
  }
  return getTypeLabel(alarm);
}

type TimelineRowProps = {
  item: TodayItem;
  onPress: (id: number) => void;
  /** 周期项左滑「跳过一次」 */
  onSkip: (id: number) => void;
};

function TimelineRow({ item, onPress, onSkip }: TimelineRowProps) {
  const { alarm, passed } = item;
  const isCycle = alarm.type === 'cycle';
  /** 已响过的行不可再「跳过」，否则 skip 会错位到下一轮日期 */
  const maxSwipe = isCycle && !passed ? -SKIP_BUTTON_WIDTH : 0;
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
      if (maxSwipe === 0) return;
      const newValue = contextX.value + event.translationX;
      translateX.value = Math.max(maxSwipe, Math.min(0, newValue));
    })
    .onEnd(() => {
      if (maxSwipe === 0) return;
      translateX.value = withSpring(
        translateX.value < maxSwipe / 2 ? maxSwipe : 0,
        { damping: 20 }
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const category =
    ALARM_CATEGORIES.find((entry) => entry.key === alarm.category) ??
    ALARM_CATEGORIES[ALARM_CATEGORIES.length - 1];

  return (
    <View style={styles.wrapper}>
      {isCycle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`跳过 ${alarm.label || '未命名提醒'} 今天一次`}
          style={styles.skipButton}
          onPress={() => {
            translateX.value = withSpring(0, { damping: 20 });
            onSkip(alarm.id);
          }}
        >
          <Text style={styles.skipText}>跳过一次</Text>
        </Pressable>
      ) : null}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, passed && styles.rowDone, pressed && styles.rowPressed]}
            onPress={() => onPress(alarm.id)}
          >
            <Text style={[styles.time, passed && styles.textMuted]}>
              {formatTime(alarm.hour, alarm.minute)}
            </Text>
            <View style={[styles.bar, { backgroundColor: category.color }, passed && styles.barMuted]} />
            <View style={styles.body}>
              <Text style={[styles.label, passed && styles.textMuted]} numberOfLines={1}>
                {alarm.label || '未命名提醒'}
              </Text>
              <Text style={styles.meta}>{getMetaText(item)}</Text>
            </View>
            {passed ? <Text style={styles.tag}>已响</Text> : null}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

type TodayTimelineProps = {
  items: TodayItem[];
  onPress: (id: number) => void;
  onSkip: (id: number) => void;
};

/**
 * 今日时间轴：今天会响的提醒按时刻升序，已响置灰。
 */
export default function TodayTimeline({ items, onPress, onSkip }: TodayTimelineProps) {
  return (
    <View>
      {items.map((item) => (
        <TimelineRow
          key={item.alarm.id}
          item={item}
          onPress={onPress}
          onSkip={onSkip}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  skipButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SKIP_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  rowDone: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
  },
  rowPressed: {
    backgroundColor: COLORS.input,
  },
  time: {
    minWidth: 46,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  bar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  barMuted: {
    opacity: 0.35,
  },
  body: {
    flex: 1,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  tag: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  textMuted: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
