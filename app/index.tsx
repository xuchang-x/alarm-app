import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAlarmStore, getNextRingDate } from '@/store/alarm-store';
import AlarmCard from '@/components/AlarmCard';
import type { Alarm } from '@/types/alarm';
import { COLORS } from '@/constants';
import { formatDate } from '@/utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const { alarms, loading, loadAlarms, toggleAlarm, deleteAlarm } =
    useAlarmStore();

  // 缓存每个闹钟的下次响铃日期
  const [nextDates, setNextDates] = useState<Record<number, string | null>>({});

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  // 加载下次响铃日期
  useEffect(() => {
    async function loadNextDates() {
      const dates: Record<number, string | null> = {};
      for (const alarm of alarms) {
        if (alarm.enabled && (alarm.type === 'cycle' || alarm.type === 'once')) {
          const nextDate = await getNextRingDate(alarm);
          dates[alarm.id] = nextDate ? formatDate(nextDate) : null;
        } else {
          dates[alarm.id] = null;
        }
      }
      setNextDates(dates);
    }
    if (alarms.length > 0) {
      loadNextDates();
    }
  }, [alarms]);

  const handleSkip = useCallback(
    async (id: number) => {
      const alarm = alarms.find((a) => a.id === id);
      if (!alarm) return;
      const nextDate = await getNextRingDate(alarm);
      if (nextDate) {
        await useAlarmStore.getState().addAdjustment(id, 'skip', formatDate(nextDate));
      }
    },
    [alarms]
  );

  const handleAddOnce = useCallback(
    (id: number) => {
      // 简易实现：加明天一次（后续可弹日期选择器）
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      useAlarmStore.getState().addAdjustment(id, 'add', formatDate(tomorrow));
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: Alarm }) => (
      <AlarmCard
        alarm={item}
        nextRingDate={nextDates[item.id] ?? null}
        onToggle={toggleAlarm}
        onPress={(id) => router.push(`/${id}/edit`)}
        onDelete={deleteAlarm}
        onSkip={handleSkip}
        onAddOnce={handleAddOnce}
      />
    ),
    [nextDates, toggleAlarm, deleteAlarm, handleSkip, handleAddOnce, router]
  );

  if (loading && alarms.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {alarms.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>还没有闹钟</Text>
          <Text style={styles.emptySubtext}>点击右下角 + 创建一个</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/create')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textDisabled,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 30,
  },
});
