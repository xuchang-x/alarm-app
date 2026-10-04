import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useAlarmStore } from '@/store/alarm-store';
import * as repo from '@/db/alarm-repository';
import { COLORS } from '@/constants';
import { today } from '@/utils/date';
import { PageHeading } from '@/components/common/PageHeader';
import {
  getCalendarInstances,
  getCalendarRange,
  moveCalendarAnchor,
  type CalendarInstance,
  type CalendarViewMode,
} from '@/services/calendar';
import MonthView from '@/components/plan/MonthView';
import TimelineView from '@/components/plan/TimelineView';
import AlarmDetailSheet from '@/components/plan/AlarmDetailSheet';

const VIEW_OPTIONS: { key: CalendarViewMode; label: string }[] = [
  { key: 'month', label: '月' },
  { key: 'week', label: '周' },
  { key: 'threeDays', label: '3天' },
  { key: 'day', label: '日' },
];

/**
 * 计划页：四视图日历（月/周/3天/日），头部两层结构
 * （日期范围+翻页 / 视图分段），功能与原日历页完全一致。
 */
export default function PlanScreen() {
  const router = useRouter();
  const alarms = useAlarmStore((state) => state.alarms);
  const loadAlarms = useAlarmStore((state) => state.loadAlarms);
  const [mode, setMode] = useState<CalendarViewMode>('month');
  const [anchor, setAnchor] = useState(today());
  const [selectedDate, setSelectedDate] = useState(today());
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [instances, setInstances] = useState<CalendarInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<CalendarInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAlarms();
  }, [loadAlarms]);

  useEffect(() => {
    let cancelled = false;
    const loadInstances = async () => {
      setLoading(true);
      const range = getCalendarRange(anchor, mode);
      const next = await getCalendarInstances(
        alarms,
        range.start,
        range.end,
        includeDisabled,
        repo.getAdjustments
      );
      if (!cancelled) {
        setInstances(next);
        setLoading(false);
      }
    };
    void loadInstances();
    return () => {
      cancelled = true;
    };
  }, [alarms, anchor, mode, includeDisabled]);

  const move = useCallback(
    (direction: -1 | 1) => {
      setAnchor((current) => moveCalendarAnchor(current, mode, direction));
      if (mode === 'month') {
        setSelectedDate((current) => moveCalendarAnchor(current, mode, direction));
      }
    },
    [mode]
  );

  const title =
    mode === 'month'
      ? format(anchor, 'yyyy年M月')
      : mode === 'day'
        ? format(anchor, 'M月d日')
        : `${format(getCalendarRange(anchor, mode).start, 'M月d日')} - ${format(
            getCalendarRange(anchor, mode).end,
            'M月d日'
          )}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeading
          eyebrow="PLAN"
          title="计划"
          subtitle="按月、周或单天查看提醒分布"
          rightAlign="end"
          style={styles.pageHeader}
          right={
            <Pressable
              accessibilityRole="button"
              style={styles.todayButton}
              onPress={() => {
                setAnchor(today());
                setSelectedDate(today());
              }}
            >
              <Text style={styles.todayButtonText}>今天</Text>
            </Pressable>
          }
        />
        <View style={styles.calHeader}>
          <Text style={styles.calTitle}>{title}</Text>
          <View style={styles.navButtons}>
            <Pressable accessibilityRole="button" accessibilityLabel="上一页" style={styles.navButton} onPress={() => move(-1)}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="下一页" style={styles.navButton} onPress={() => move(1)}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.segmentedControl}>
          {VIEW_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === option.key }}
              style={[styles.segment, mode === option.key && styles.segmentActive]}
              onPress={() => setMode(option.key)}
            >
              <Text style={[styles.segmentText, mode === option.key && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>显示已暂停提醒</Text>
          <Switch
            value={includeDisabled}
            onValueChange={setIncludeDisabled}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>正在计算提醒</Text>
          </View>
        ) : mode === 'month' ? (
          <MonthView
            anchor={anchor}
            instances={instances}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPress={(id) => router.push(`/${id}/edit`)}
          />
        ) : (
          <TimelineView
            mode={mode}
            anchor={anchor}
            instances={instances}
            onPress={setSelectedInstance}
          />
        )}
      </ScrollView>
      <AlarmDetailSheet
        instance={selectedInstance}
        onClose={() => setSelectedInstance(null)}
        onEdit={(id) => {
          setSelectedInstance(null);
          router.push(`/${id}/edit`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  pageHeader: { paddingTop: 12, paddingBottom: 20 },
  todayButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  todayButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 14 },
  calTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  navButtons: { flexDirection: 'row', gap: 8 },
  navButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  navButtonText: { color: COLORS.primary, fontSize: 26, lineHeight: 28 },
  segmentedControl: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: COLORS.input },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segmentActive: { backgroundColor: COLORS.card, shadowColor: COLORS.shadow, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 },
  segmentText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: COLORS.primaryDark },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginVertical: 12 },
  filterLabel: { color: COLORS.textSecondary, fontSize: 12 },
  loading: { alignItems: 'center', paddingVertical: 70 },
  loadingText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 12 },
});
