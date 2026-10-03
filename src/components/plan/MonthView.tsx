import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, format, isSameDay, isSameMonth } from 'date-fns';
import type { CalendarInstance } from '@/services/calendar';
import { getCalendarRange } from '@/services/calendar';
import { formatTime, today } from '@/utils/date';
import { COLORS } from '@/constants';
import { WEEKDAY_LABELS, getCategoryColor } from './shared';

function CalendarInstanceCard({
  instance,
  onPress,
}: {
  instance: CalendarInstance;
  onPress: (id: number) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.instanceCard, pressed && styles.instanceCardPressed]}
      onPress={() => onPress(instance.alarm.id)}
    >
      <View style={[styles.instanceBar, { backgroundColor: getCategoryColor(instance) }]} />
      <View style={styles.instanceCopy}>
        <Text style={styles.instanceTime}>
          {formatTime(instance.alarm.hour, instance.alarm.minute)}
        </Text>
        <Text style={styles.instanceLabel} numberOfLines={1}>
          {instance.alarm.label || '未命名提醒'}
        </Text>
        <Text style={styles.instanceType}>
          {instance.alarm.type === 'once'
            ? '一次'
            : instance.alarm.type === 'daily'
              ? '每天'
              : instance.alarm.type === 'weekly'
                ? '每周'
                : '周期'}
        </Text>
      </View>
    </Pressable>
  );
}

interface MonthViewProps {
  anchor: Date;
  instances: CalendarInstance[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPress: (id: number) => void;
}

/**
 * 月视图：42 格月历 + 选中日详情列表。
 */
export default function MonthView({
  anchor,
  instances,
  selectedDate,
  onSelectDate,
  onPress,
}: MonthViewProps) {
  const range = getCalendarRange(anchor, 'month');
  const days = Array.from({ length: 42 }, (_, index) => addDays(range.start, index));
  const byDate = useMemo(() => {
    const grouped = new Map<string, CalendarInstance[]>();
    instances.forEach((instance) => {
      const current = grouped.get(instance.dateKey) ?? [];
      current.push(instance);
      grouped.set(instance.dateKey, current);
    });
    return grouped;
  }, [instances]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedInstances = byDate.get(selectedKey) ?? [];

  return (
    <View style={styles.monthCard}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayText}>{label}</Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {days.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayInstances = byDate.get(dateKey) ?? [];
          const selected = isSameDay(date, selectedDate);
          const current = isSameDay(date, today());
          return (
            <Pressable
              key={dateKey}
              style={[styles.dayCell, !isSameMonth(date, anchor) && styles.outsideDay]}
              onPress={() => onSelectDate(date)}
            >
              <View
                style={[
                  styles.dayNumber,
                  selected && styles.selectedDay,
                  current && !selected && styles.todayDay,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    selected && styles.selectedDayText,
                    !isSameMonth(date, anchor) && styles.outsideDayText,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
              </View>
              <View style={styles.dayMarkers}>
                {dayInstances.slice(0, 3).map((instance) => (
                  <View
                    key={`${instance.alarm.id}-${instance.dateKey}`}
                    style={[styles.dayMarker, { backgroundColor: getCategoryColor(instance) }]}
                  />
                ))}
                {dayInstances.length > 3 && (
                  <Text style={styles.moreMarker}>+{dayInstances.length - 3}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.monthDetailHeader}>
        <Text style={styles.monthDetailTitle}>{format(selectedDate, 'M月d日')} 的提醒</Text>
        <Text style={styles.monthDetailCount}>{selectedInstances.length} 项</Text>
      </View>
      {selectedInstances.map((instance) => (
        <CalendarInstanceCard
          key={`${instance.alarm.id}-${instance.dateKey}`}
          instance={instance}
          onPress={onPress}
        />
      ))}
      {selectedInstances.length === 0 && (
        <Text style={styles.emptyText}>这一天没有提醒</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  monthCard: { padding: 10, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  weekdayRow: { flexDirection: 'row', paddingBottom: 8 },
  weekdayText: { flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', minHeight: 58, alignItems: 'center', paddingVertical: 5 },
  outsideDay: { opacity: 0.42 },
  dayNumber: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  todayDay: { borderWidth: 1, borderColor: COLORS.primary },
  selectedDay: { backgroundColor: COLORS.primary },
  dayNumberText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  selectedDayText: { color: '#FFFFFF' },
  outsideDayText: { color: COLORS.textMuted },
  dayMarkers: { flexDirection: 'row', alignItems: 'center', height: 12, gap: 2 },
  dayMarker: { width: 5, height: 5, borderRadius: 3 },
  moreMarker: { color: COLORS.textMuted, fontSize: 8 },
  monthDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  monthDetailTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  monthDetailCount: { color: COLORS.textSecondary, fontSize: 11 },
  emptyText: { paddingVertical: 18, textAlign: 'center', color: COLORS.textMuted, fontSize: 12 },
  instanceCard: { flexDirection: 'row', minHeight: 64, marginVertical: 4, borderRadius: 12, backgroundColor: COLORS.input, overflow: 'hidden' },
  instanceCardPressed: { opacity: 0.75 },
  instanceBar: { width: 4 },
  instanceCopy: { flex: 1, padding: 8 },
  instanceTime: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800' },
  instanceLabel: { marginTop: 3, color: COLORS.textPrimary, fontSize: 11, fontWeight: '700' },
  instanceType: { marginTop: 3, color: COLORS.textSecondary, fontSize: 9 },
});
