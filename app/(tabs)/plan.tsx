import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeading } from '@/components/PageHeader';
import { useRouter } from 'expo-router';
import { addDays, format, isSameDay, isSameMonth } from 'date-fns';
import { useAlarmStore } from '@/store/alarm-store';
import * as repo from '@/db/alarm-repository';
import { ALARM_CATEGORIES, COLORS } from '@/constants';
import { formatTime, today } from '@/utils/date';
import type { AlarmType } from '@/types/alarm';
import {
  getCalendarInstances,
  getCalendarRange,
  moveCalendarAnchor,
  type CalendarInstance,
  type CalendarViewMode,
} from '@/services/calendar';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const VIEW_OPTIONS: { key: CalendarViewMode; label: string }[] = [
  { key: 'month', label: '月' },
  { key: 'week', label: '周' },
  { key: 'threeDays', label: '3天' },
  { key: 'day', label: '日' },
];
const HOUR_HEIGHT = 58;
const HOUR_LABEL_WIDTH = 34;
const TIMELINE_HOURS = 24;
const TIMELINE_HEIGHT = HOUR_HEIGHT * TIMELINE_HOURS;
const MARKER_HEIGHT = 24;
const MARKER_GAP = 3;

function getCategoryColor(instance: CalendarInstance): string {
  return ALARM_CATEGORIES.find((item) => item.key === instance.alarm.category)?.color ?? COLORS.textMuted;
}

function CalendarInstanceCard({ instance, onPress }: { instance: CalendarInstance; onPress: (id: number) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.instanceCard, pressed && styles.instanceCardPressed]}
      onPress={() => onPress(instance.alarm.id)}
    >
      <View style={[styles.instanceBar, { backgroundColor: getCategoryColor(instance) }]} />
      <View style={styles.instanceCopy}>
        <Text style={styles.instanceTime}>{formatTime(instance.alarm.hour, instance.alarm.minute)}</Text>
        <Text style={styles.instanceLabel} numberOfLines={1}>{instance.alarm.label || '未命名提醒'}</Text>
        <Text style={styles.instanceType}>{instance.alarm.type === 'once' ? '一次' : instance.alarm.type === 'daily' ? '每天' : instance.alarm.type === 'weekly' ? '每周' : '周期'}</Text>
      </View>
    </Pressable>
  );
}

interface TimelineMarkerLayout {
  instance: CalendarInstance;
  top: number;
  lane: number;
  laneCount: number;
}

function getTimelineMarkerLayouts(instances: CalendarInstance[]): TimelineMarkerLayout[] {
  const layouts = [...instances]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((instance) => {
      const minuteOffset = instance.alarm.hour * 60 + instance.alarm.minute;
      const rawTop = (minuteOffset / 60) * HOUR_HEIGHT;
      const top = Math.min(rawTop, TIMELINE_HEIGHT - MARKER_HEIGHT);
      return { instance, top, lane: 0, laneCount: 1 };
    });

  const clusters: TimelineMarkerLayout[][] = [];
  layouts.forEach((layout) => {
    const currentCluster = clusters[clusters.length - 1];
    const clusterBottom = currentCluster
      ? Math.max(...currentCluster.map((item) => item.top + MARKER_HEIGHT + MARKER_GAP))
      : -1;
    if (!currentCluster || layout.top > clusterBottom) {
      clusters.push([layout]);
    } else {
      currentCluster.push(layout);
    }
  });

  clusters.forEach((cluster) => {
    const laneBottoms: number[] = [];
    cluster.forEach((layout) => {
      let lane = laneBottoms.findIndex((bottom) => bottom <= layout.top);
      if (lane === -1) {
        lane = laneBottoms.length;
        laneBottoms.push(0);
      }
      laneBottoms[lane] = layout.top + MARKER_HEIGHT + MARKER_GAP;
      layout.lane = lane;
    });
    const laneCount = Math.max(laneBottoms.length, 1);
    cluster.forEach((layout) => { layout.laneCount = laneCount; });
  });

  return layouts;
}

function CalendarInstanceMarker({
  layout,
  onPress,
}: {
  layout: TimelineMarkerLayout;
  onPress: (instance: CalendarInstance) => void;
}) {
  const color = getCategoryColor(layout.instance);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.timelineMarker,
        {
          top: layout.top,
          left: `${(layout.lane / layout.laneCount) * 100}%`,
          width: `${100 / layout.laneCount}%`,
          borderLeftColor: color,
        },
        pressed && styles.instanceCardPressed,
      ]}
      onPress={() => onPress(layout.instance)}
    >
      <Text style={styles.timelineMarkerLabel} numberOfLines={1} ellipsizeMode="tail">
        {layout.instance.alarm.label || '未命名提醒'}
      </Text>
    </Pressable>
  );
}

function getAlarmTypeLabel(type: AlarmType): string {
  if (type === 'once') return '一次性';
  if (type === 'daily') return '每天';
  if (type === 'weekly') return '每周';
  return '周期';
}

function AlarmDetailSheet({
  instance,
  onClose,
  onEdit,
}: {
  instance: CalendarInstance | null;
  onClose: () => void;
  onEdit: (id: number) => void;
}) {
  if (!instance) return null;
  const color = getCategoryColor(instance);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.detailHandle} />
          <View style={styles.detailHeader}>
            <View style={[styles.detailCategoryDot, { backgroundColor: color }]} />
            <Text style={styles.detailTitle} numberOfLines={2}>{instance.alarm.label || '未命名提醒'}</Text>
            <Pressable style={styles.detailCloseButton} onPress={onClose}>
              <Text style={styles.detailCloseText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.detailTime}>{formatTime(instance.alarm.hour, instance.alarm.minute)}</Text>
          <Text style={styles.detailDate}>{format(instance.date, 'M月d日')} · {getAlarmTypeLabel(instance.alarm.type)}</Text>
          <View style={styles.detailStatusRow}>
            <Text style={styles.detailStatusLabel}>状态</Text>
            <Text style={styles.detailStatusValue}>{instance.alarm.enabled ? '已开启' : '已暂停'}</Text>
          </View>
          <View style={styles.detailActions}>
            <Pressable style={styles.detailSecondaryButton} onPress={onClose}>
              <Text style={styles.detailSecondaryText}>关闭</Text>
            </Pressable>
            <Pressable style={styles.detailPrimaryButton} onPress={() => onEdit(instance.alarm.id)}>
              <Text style={styles.detailPrimaryText}>编辑闹钟</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MonthView({
  anchor,
  instances,
  selectedDate,
  onSelectDate,
  onPress,
}: {
  anchor: Date;
  instances: CalendarInstance[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPress: (id: number) => void;
}) {
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

  return (
    <View style={styles.monthCard}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => <Text key={label} style={styles.weekdayText}>{label}</Text>)}
      </View>
      <View style={styles.monthGrid}>
        {days.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayInstances = byDate.get(dateKey) ?? [];
          const selected = isSameDay(date, selectedDate);
          const current = isSameDay(date, today());
          return (
            <Pressable key={dateKey} style={[styles.dayCell, !isSameMonth(date, anchor) && styles.outsideDay]} onPress={() => onSelectDate(date)}>
              <View style={[styles.dayNumber, selected && styles.selectedDay, current && !selected && styles.todayDay]}>
                <Text style={[styles.dayNumberText, selected && styles.selectedDayText, !isSameMonth(date, anchor) && styles.outsideDayText]}>{format(date, 'd')}</Text>
              </View>
              <View style={styles.dayMarkers}>
                {dayInstances.slice(0, 3).map((instance) => <View key={`${instance.alarm.id}-${instance.dateKey}`} style={[styles.dayMarker, { backgroundColor: getCategoryColor(instance) }]} />)}
                {dayInstances.length > 3 && <Text style={styles.moreMarker}>+{dayInstances.length - 3}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.monthDetailHeader}>
        <Text style={styles.monthDetailTitle}>{format(selectedDate, 'M月d日')} 的提醒</Text>
        <Text style={styles.monthDetailCount}>{(byDate.get(format(selectedDate, 'yyyy-MM-dd')) ?? []).length} 项</Text>
      </View>
      {(byDate.get(format(selectedDate, 'yyyy-MM-dd')) ?? []).map((instance) => (
        <CalendarInstanceCard key={`${instance.alarm.id}-${instance.dateKey}`} instance={instance} onPress={onPress} />
      ))}
      {(byDate.get(format(selectedDate, 'yyyy-MM-dd')) ?? []).length === 0 && <Text style={styles.emptyText}>这一天没有提醒</Text>}
    </View>
  );
}

function TimelineView({ mode, anchor, instances, onPress }: { mode: 'week' | 'threeDays' | 'day'; anchor: Date; instances: CalendarInstance[]; onPress: (instance: CalendarInstance) => void }) {
  const range = getCalendarRange(anchor, mode);
  const dayCount = mode === 'week' ? 7 : mode === 'threeDays' ? 3 : 1;
  const days = Array.from({ length: dayCount }, (_, index) => addDays(range.start, index));
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View style={styles.timelineHeaderSpacer} />
        <View style={styles.timelineHeaderDays}>
          {days.map((date) => (
            <View key={format(date, 'yyyy-MM-dd')} style={styles.timelineDayHeader}>
              <Text style={styles.timelineWeekday}>{WEEKDAY_LABELS[(date.getDay() + 6) % 7]}</Text>
              <Text style={[styles.timelineDate, isSameDay(date, today()) && styles.timelineDateToday]}>{format(date, 'M/d')}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.timelineBody}>
        <View style={styles.hourLabels}>
          {Array.from({ length: 24 }, (_, hour) => <Text key={hour} style={styles.hourLabel}>{String(hour).padStart(2, '0')}</Text>)}
        </View>
        <View style={styles.timelineColumns}>
          {days.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayInstances = instances.filter((instance) => instance.dateKey === dateKey);
            const markerLayouts = getTimelineMarkerLayouts(dayInstances);
            return (
              <View key={dateKey} style={styles.timelineColumn}>
                <View style={styles.timelineGrid}>
                  {Array.from({ length: TIMELINE_HOURS }, (_, hour) => <View key={hour} style={styles.hourCell} />)}
                </View>
                {markerLayouts.map((layout) => (
                  <CalendarInstanceMarker
                    key={`${layout.instance.alarm.id}-${layout.instance.dateKey}`}
                    layout={layout}
                    onPress={onPress}
                  />
                ))}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function CalendarScreen() {
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

  useEffect(() => { void loadAlarms(); }, [loadAlarms]);

  useEffect(() => {
    let cancelled = false;
    const loadInstances = async () => {
      setLoading(true);
      const range = getCalendarRange(anchor, mode);
      const next = await getCalendarInstances(alarms, range.start, range.end, includeDisabled, repo.getAdjustments);
      if (!cancelled) {
        setInstances(next);
        setLoading(false);
      }
    };
    void loadInstances();
    return () => { cancelled = true; };
  }, [alarms, anchor, mode, includeDisabled]);

  const move = useCallback((direction: -1 | 1) => {
    setAnchor((current) => moveCalendarAnchor(current, mode, direction));
    if (mode === 'month') setSelectedDate((current) => moveCalendarAnchor(current, mode, direction));
  }, [mode]);

  const title = mode === 'month' ? format(anchor, 'yyyy年M月') : mode === 'day' ? format(anchor, 'M月d日') : `${format(getCalendarRange(anchor, mode).start, 'M月d日')} - ${format(getCalendarRange(anchor, mode).end, 'M月d日')}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeading
          eyebrow="CALENDAR"
          title="日历"
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
            <Pressable style={styles.navButton} onPress={() => move(-1)}><Text style={styles.navButtonText}>‹</Text></Pressable>
            <Pressable style={styles.navButton} onPress={() => move(1)}><Text style={styles.navButtonText}>›</Text></Pressable>
          </View>
        </View>
        <View style={styles.segmentedControl}>
          {VIEW_OPTIONS.map((option) => <Pressable key={option.key} style={[styles.segment, mode === option.key && styles.segmentActive]} onPress={() => setMode(option.key)}><Text style={[styles.segmentText, mode === option.key && styles.segmentTextActive]}>{option.label}</Text></Pressable>)}
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>显示已暂停提醒</Text>
          <Switch value={includeDisabled} onValueChange={setIncludeDisabled} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#FFFFFF" />
        </View>
        {loading ? <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>正在计算提醒</Text></View> : mode === 'month' ? <MonthView anchor={anchor} instances={instances} selectedDate={selectedDate} onSelectDate={setSelectedDate} onPress={(id) => router.push(`/${id}/edit`)} /> : <TimelineView mode={mode} anchor={anchor} instances={instances} onPress={setSelectedInstance} />}
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
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  pageHeader: { paddingTop: 10, paddingBottom: 20 },
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
  timelineCard: { borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  timelineHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timelineHeaderSpacer: { width: HOUR_LABEL_WIDTH },
  timelineHeaderDays: { flex: 1, flexDirection: 'row', paddingVertical: 10 },
  timelineDayHeader: { flex: 1, alignItems: 'center' },
  timelineWeekday: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  timelineDate: { marginTop: 3, color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  timelineDateToday: { color: COLORS.primary },
  timelineBody: { flexDirection: 'row' },
  hourLabels: { width: HOUR_LABEL_WIDTH, paddingTop: 1 },
  hourLabel: { height: HOUR_HEIGHT, paddingTop: 5, paddingRight: 5, color: COLORS.textMuted, fontSize: 9, textAlign: 'right' },
  timelineColumns: { flex: 1, height: TIMELINE_HEIGHT, flexDirection: 'row' },
  timelineColumn: { position: 'relative', flex: 1, height: TIMELINE_HEIGHT, borderRightWidth: 1, borderRightColor: COLORS.border },
  timelineGrid: { height: TIMELINE_HEIGHT },
  hourCell: { height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: COLORS.border },
  timelineMarker: { position: 'absolute', height: MARKER_HEIGHT, justifyContent: 'center', paddingHorizontal: 5, borderLeftWidth: 3, borderRadius: 8, backgroundColor: COLORS.input, overflow: 'hidden' },
  timelineMarkerLabel: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '700' },
  instanceCard: { flexDirection: 'row', minHeight: 64, marginVertical: 4, borderRadius: 12, backgroundColor: COLORS.input, overflow: 'hidden' },
  instanceCardPressed: { opacity: 0.75 },
  instanceBar: { width: 4 },
  instanceCopy: { flex: 1, padding: 8 },
  instanceTime: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800' },
  instanceLabel: { marginTop: 3, color: COLORS.textPrimary, fontSize: 11, fontWeight: '700' },
  instanceType: { marginTop: 3, color: COLORS.textSecondary, fontSize: 9 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(37, 34, 58, 0.24)' },
  detailSheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: COLORS.card },
  detailHandle: { alignSelf: 'center', width: 38, height: 4, marginBottom: 16, borderRadius: 2, backgroundColor: COLORS.border },
  detailHeader: { flexDirection: 'row', alignItems: 'center' },
  detailCategoryDot: { width: 10, height: 10, marginRight: 8, borderRadius: 5 },
  detailTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  detailCloseButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 8, borderRadius: 16, backgroundColor: COLORS.input },
  detailCloseText: { color: COLORS.textSecondary, fontSize: 22, lineHeight: 24 },
  detailTime: { marginTop: 18, color: COLORS.primaryDark, fontSize: 32, fontWeight: '800' },
  detailDate: { marginTop: 4, color: COLORS.textSecondary, fontSize: 13 },
  detailStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  detailStatusLabel: { color: COLORS.textSecondary, fontSize: 13 },
  detailStatusValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  detailSecondaryButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 13, backgroundColor: COLORS.input },
  detailSecondaryText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  detailPrimaryButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 13, backgroundColor: COLORS.primary },
  detailPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
