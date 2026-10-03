import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NextRingInfo } from '@/hooks/useTodayOverview';
import { ALARM_CATEGORIES, COLORS } from '@/constants';
import { formatTime } from '@/utils/date';
import RhythmDots from './RhythmDots';

/** 把「距下次响铃还有多久」格式化为倒计时文案 */
function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return '马上响起';
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  if (days >= 1) return `还有 ${days} 天`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return minutes > 0 ? `还有 ${hours} 小时 ${minutes} 分` : `还有 ${hours} 小时`;
  return `还有 ${minutes} 分钟`;
}

/** 周期节奏说明文案：每 N 天 · 今天第 X 天（+ 今天是否响铃日） */
function formatRhythmText(info: NextRingInfo): string {
  const rhythm = info.rhythm;
  if (!rhythm) return '';
  const base = `每 ${rhythm.intervalDays} 天 · 今天第 ${rhythm.dayIndex} 天`;
  return info.daysUntil === 0 ? `${base} · 今天就是响铃日` : base;
}

type NextRingCardProps = {
  info: NextRingInfo;
  now: Date;
  onPress: (id: number) => void;
};

/**
 * 下一次响铃 hero 卡：时间大字号 + 倒计时 + 周期节奏点阵，点击进编辑。
 */
export default function NextRingCard({ info, now, onPress }: NextRingCardProps) {
  const { alarm, rhythm } = info;
  const target = new Date(info.date);
  target.setHours(alarm.hour, alarm.minute, 0, 0);
  const category = ALARM_CATEGORIES.find((item) => item.key === alarm.category);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`下一次响铃 ${formatTime(alarm.hour, alarm.minute)} ${alarm.label || '未命名提醒'}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(alarm.id)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>下一次响铃</Text>
        <View style={[styles.categoryDot, { backgroundColor: category?.color ?? COLORS.textMuted }]} />
      </View>
      <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {alarm.label || '未命名提醒'}
      </Text>
      <Text style={styles.count}>{formatCountdown(target, now)}</Text>
      {rhythm ? (
        <View style={styles.rhythmRow}>
          <RhythmDots total={rhythm.intervalDays} filled={rhythm.dayIndex} />
          <Text style={styles.rhythmText}>{formatRhythmText(info)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.75,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.6,
  },
  time: {
    marginTop: 4,
    color: COLORS.primaryDark,
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -1,
  },
  label: {
    marginTop: 2,
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  count: {
    marginTop: 6,
    color: COLORS.primaryDark,
    fontSize: 12,
    opacity: 0.9,
  },
  rhythmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.heroDivider,
  },
  rhythmText: {
    flex: 1,
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
});
