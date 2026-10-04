import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, format, isSameDay } from 'date-fns';
import type { CalendarInstance } from '@/services/calendar';
import { getCalendarRange } from '@/services/calendar';
import { today } from '@/utils/date';
import { COLORS } from '@/constants';
import { WEEKDAY_LABELS, getCategoryColor } from './shared';

const HOUR_HEIGHT = 58;
const HOUR_LABEL_WIDTH = 34;
const TIMELINE_HOURS = 24;
const TIMELINE_HEIGHT = HOUR_HEIGHT * TIMELINE_HOURS;
const MARKER_HEIGHT = 24;
const MARKER_GAP = 3;

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
    cluster.forEach((layout) => {
      layout.laneCount = laneCount;
    });
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
        pressed && styles.timelineMarkerPressed,
      ]}
      onPress={() => onPress(layout.instance)}
    >
      <Text style={styles.timelineMarkerLabel} numberOfLines={1} ellipsizeMode="tail">
        {layout.instance.alarm.label || '未命名提醒'}
      </Text>
    </Pressable>
  );
}

interface TimelineViewProps {
  mode: 'week' | 'threeDays' | 'day';
  anchor: Date;
  instances: CalendarInstance[];
  onPress: (instance: CalendarInstance) => void;
}

/**
 * 时间轴视图：周 / 3 天 / 单天 24 小时泳道。
 */
export default function TimelineView({ mode, anchor, instances, onPress }: TimelineViewProps) {
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
              <Text style={styles.timelineWeekday}>
                {WEEKDAY_LABELS[(date.getDay() + 6) % 7]}
              </Text>
              <Text style={[styles.timelineDate, isSameDay(date, today()) && styles.timelineDateToday]}>
                {format(date, 'M/d')}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.timelineBody}>
        <View style={styles.hourLabels}>
          {Array.from({ length: 24 }, (_, hour) => (
            <Text key={hour} style={styles.hourLabel}>
              {String(hour).padStart(2, '0')}
            </Text>
          ))}
        </View>
        <View style={styles.timelineColumns}>
          {days.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayInstances = instances.filter((instance) => instance.dateKey === dateKey);
            const markerLayouts = getTimelineMarkerLayouts(dayInstances);
            return (
              <View key={dateKey} style={styles.timelineColumn}>
                <View style={styles.timelineGrid}>
                  {Array.from({ length: TIMELINE_HOURS }, (_, hour) => (
                    <View key={hour} style={styles.hourCell} />
                  ))}
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

const styles = StyleSheet.create({
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
  timelineColumns: { flex: 1, height: TIMELINE_HEIGHT, flexDirection: 'row', borderLeftWidth: 1, borderLeftColor: COLORS.border },
  timelineColumn: { position: 'relative', flex: 1, height: TIMELINE_HEIGHT, borderRightWidth: 1, borderRightColor: COLORS.border },
  timelineGrid: { height: TIMELINE_HEIGHT },
  hourCell: { height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: COLORS.border },
  timelineMarker: { position: 'absolute', height: MARKER_HEIGHT, justifyContent: 'center', paddingHorizontal: 5, borderLeftWidth: 3, borderRadius: 8, backgroundColor: COLORS.input, overflow: 'hidden' },
  timelineMarkerPressed: { opacity: 0.75 },
  timelineMarkerLabel: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '700' },
});
