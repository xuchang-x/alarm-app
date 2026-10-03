import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAlarmStore, getNextRingDate } from '@/store/alarm-store';
import AlarmCard from '@/components/AlarmCard';
import type { Alarm } from '@/types/alarm';
import { COLORS } from '@/constants';
import { formatDate } from '@/utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const { alarms, loading, loadAlarms, toggleAlarm, deleteAlarm, duplicateAlarm } =
    useAlarmStore();
  const [nextDates, setNextDates] = useState<Record<number, string | null>>({});

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  useEffect(() => {
    async function loadNextDates() {
      const dates: Record<number, string | null> = {};
      for (const alarm of alarms) {
        if (alarm.enabled) {
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
        await useAlarmStore
          .getState()
          .addAdjustment(id, 'skip', formatDate(nextDate));
      }
    },
    [alarms]
  );

  const handleAddOnce = useCallback((id: number) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    useAlarmStore
      .getState()
      .addAdjustment(id, 'add', formatDate(tomorrow));
  }, []);

  const handleDuplicate = useCallback(async (id: number) => {
    const duplicate = await duplicateAlarm(id);
    router.push(`/${duplicate.id}/edit`);
  }, [duplicateAlarm, router]);

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
        onDuplicate={handleDuplicate}
      />
    ),
    [nextDates, toggleAlarm, deleteAlarm, handleSkip, handleAddOnce, router]
  );

  const enabledCount = alarms.filter((alarm) => alarm.enabled).length;

  if (loading && alarms.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>正在加载闹钟</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (alarms.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.eyebrow}>DAILY REMINDERS</Text>
            <Text style={styles.title}>我的闹钟</Text>
            <Text style={styles.subtitle}>让重要的事情准时发生</Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>◷</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>◷</Text>
          </View>
          <Text style={styles.emptyTitle}>还没有闹钟</Text>
          <Text style={styles.emptySubtitle}>
            创建一个提醒，开始安排你的节奏
          </Text>
          <Pressable
            style={styles.emptyButton}
            onPress={() => router.push('/create')}
          >
            <Text style={styles.emptyButtonText}>创建第一个闹钟</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={alarms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.pageHeader}>
              <View>
                <Text style={styles.eyebrow}>DAILY REMINDERS</Text>
                <Text style={styles.title}>我的闹钟</Text>
                <Text style={styles.subtitle}>{enabledCount} 个提醒正在运行</Text>
              </View>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>◷</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>✓</Text>
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>今天安排得很好</Text>
                <Text style={styles.summaryText}>所有重要提醒都会准时通知你</Text>
              </View>
              <Text style={styles.summaryArrow}>›</Text>
            </View>
            <Text style={styles.sectionHeading}>全部提醒</Text>
          </View>
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/create')}
      >
        <Text style={styles.fabText}>＋</Text>
        <Text style={styles.fabLabel}>新建</Text>
      </Pressable>
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 112,
  },
  listHeader: {
    paddingBottom: 6,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 20,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 5,
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  headerIconText: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  summaryIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  summaryCopy: {
    flex: 1,
    marginLeft: 12,
  },
  summaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryText: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  summaryArrow: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: '300',
  },
  sectionHeading: {
    marginTop: 24,
    marginBottom: 4,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  emptyIconText: {
    color: COLORS.primary,
    fontSize: 44,
  },
  emptyTitle: {
    marginTop: 20,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  emptySubtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  fabPressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
  },
  fabLabel: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
