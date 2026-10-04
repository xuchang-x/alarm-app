import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SkinAlert } from '@/components/common/SkinAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAlarmStore, getNextRingDate } from '@/store/alarm-store';
import AlarmCard from '@/components/alarm-list/AlarmCard';
import { PageHeading } from '@/components/common/PageHeader';
import Fab from '@/components/common/Fab';
import EmptyState from '@/components/common/EmptyState';
import FilterBar, { type FilterValues } from '@/components/alarm-list/FilterBar';
import type { Alarm } from '@/types/alarm';
import { COLORS } from '@/constants';
import { formatDate } from '@/utils/date';

export default function AllScreen() {
  const router = useRouter();
  const { alarms, loading, loadAlarms, toggleAlarm, deleteAlarm, duplicateAlarm } =
    useAlarmStore();
  const [nextDates, setNextDates] = useState<Record<number, string | null>>({});
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    typeFilter: 'all',
    categoryFilter: 'all',
    sortMode: 'next',
  });

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  useEffect(() => {
    let cancelled = false;
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
      // 闹钟列表已变化时丢弃本次结果，避免旧数据覆盖新状态
      if (!cancelled) {
        setNextDates(dates);
      }
    }

    if (alarms.length > 0) {
      void loadNextDates();
    } else {
      setNextDates({});
    }

    return () => {
      cancelled = true;
    };
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
    try {
      const duplicate = await duplicateAlarm(id);
      router.push(`/${duplicate.id}/edit`);
    } catch {
      SkinAlert.alert('错误', '复制失败，请重试');
    }
  }, [duplicateAlarm, router]);

  // 滑动删除与其他入口保持一致：二次确认
  const handleDelete = useCallback(
    (id: number) => {
      SkinAlert.alert('删除提醒', '确定删除这个提醒吗？删除后无法恢复。', [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            deleteAlarm(id).catch(() => {
              SkinAlert.alert('错误', '删除失败，请重试');
            });
          },
        },
      ]);
    },
    [deleteAlarm]
  );

  // 开关切换失败时提示（默认静默）
  const handleToggle = useCallback(
    (id: number) => {
      toggleAlarm(id).catch(() => {
        SkinAlert.alert('错误', '切换开关失败，请重试');
      });
    },
    [toggleAlarm]
  );

  // 默认视图：下次响铃升序，已暂停/已过期的沉底
  const filteredAlarms = useMemo(() => {
    const normalized = filters.search.trim().toLowerCase();
    const rank = (alarm: Alarm): number => {
      // 0 = 正常启用，1 = 暂停或一次性已过期
      const expiredOnce =
        alarm.type === 'once' && alarm.onceDate !== null && alarm.onceDate < formatDate(new Date());
      return alarm.enabled && !expiredOnce ? 0 : 1;
    };
    return [...alarms]
      .filter((alarm) => !normalized || alarm.label.toLowerCase().includes(normalized))
      .filter((alarm) => filters.typeFilter === 'all' || alarm.type === filters.typeFilter)
      .filter((alarm) => filters.categoryFilter === 'all' || alarm.category === filters.categoryFilter)
      .sort((a, b) => {
        const rankDiff = rank(a) - rank(b);
        if (rankDiff !== 0) return rankDiff;
        if (filters.sortMode === 'label') return a.label.localeCompare(b.label);
        if (filters.sortMode === 'created') return b.createdAt.localeCompare(a.createdAt);
        return (nextDates[a.id] ?? '9999-99-99').localeCompare(nextDates[b.id] ?? '9999-99-99');
      });
  }, [alarms, filters, nextDates]);

  const renderItem = useCallback(
    ({ item }: { item: Alarm }) => (
      <AlarmCard
        alarm={item}
        nextRingDate={nextDates[item.id] ?? null}
        onToggle={handleToggle}
        onPress={(id) => router.push(`/${id}/edit`)}
        onDelete={handleDelete}
        onSkip={handleSkip}
        onAddOnce={handleAddOnce}
        onDuplicate={handleDuplicate}
      />
    ),
    [nextDates, handleToggle, handleDelete, handleSkip, handleAddOnce, handleDuplicate, router]
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
          <PageHeading
            eyebrow="ALL REMINDERS"
            title="全部"
            subtitle="管理你的所有提醒"
          />
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="还没有提醒"
            subtitle="创建一个提醒，开始安排你的节奏"
            actionLabel="创建第一个提醒"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={filteredAlarms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.filteredEmpty}>
            <Text style={styles.filteredEmptyTitle}>没有匹配的提醒</Text>
            <Text style={styles.filteredEmptyText}>调整搜索词或筛选条件后再试</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.pageHeader}>
              <PageHeading
                eyebrow="ALL REMINDERS"
                title="全部"
                subtitle={`${enabledCount} 个提醒正在运行`}
              />
            </View>
            <FilterBar
              values={filters}
              onChange={setFilters}
              resultCount={filteredAlarms.length}
            />
          </View>
        }
      />

      <Fab />
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
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  filteredEmpty: { alignItems: 'center', paddingVertical: 42 },
  filteredEmptyTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  filteredEmptyText: { marginTop: 6, color: COLORS.textMuted, fontSize: 12 },
});
