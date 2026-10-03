import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAlarmStore, getNextRingDate } from '@/store/alarm-store';
import AlarmCard from '@/components/AlarmCard';
import ViewNavigationLink from '@/components/ViewNavigationLink';
import type { Alarm } from '@/types/alarm';
import type { AlarmCategory, AlarmType } from '@/types/alarm';
import { ALARM_CATEGORIES, COLORS } from '@/constants';
import { formatDate } from '@/utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const { alarms, loading, loadAlarms, toggleAlarm, deleteAlarm, duplicateAlarm } =
    useAlarmStore();
  const [nextDates, setNextDates] = useState<Record<number, string | null>>({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AlarmType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AlarmCategory | 'all'>('all');
  const [sortMode, setSortMode] = useState<'next' | 'label' | 'created'>('next');

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

  const filteredAlarms = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return [...alarms]
      .filter((alarm) => !normalized || alarm.label.toLowerCase().includes(normalized))
      .filter((alarm) => typeFilter === 'all' || alarm.type === typeFilter)
      .filter((alarm) => categoryFilter === 'all' || alarm.category === categoryFilter)
      .sort((a, b) => {
        if (sortMode === 'label') return a.label.localeCompare(b.label);
        if (sortMode === 'created') return b.createdAt.localeCompare(a.createdAt);
        return (nextDates[a.id] ?? '9999-99-99').localeCompare(nextDates[b.id] ?? '9999-99-99');
      });
  }, [alarms, categoryFilter, nextDates, search, sortMode, typeFilter]);

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
        data={filteredAlarms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={<View style={styles.filteredEmpty}><Text style={styles.filteredEmptyTitle}>没有匹配的提醒</Text><Text style={styles.filteredEmptyText}>调整搜索词或筛选条件后再试</Text></View>}
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
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="搜索提醒名称"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              <Pressable style={[styles.filterChip, typeFilter === 'all' && styles.filterChipActive]} onPress={() => setTypeFilter('all')}><Text style={[styles.filterChipText, typeFilter === 'all' && styles.filterChipTextActive]}>全部类型</Text></Pressable>
              {(['once', 'daily', 'weekly', 'cycle'] as AlarmType[]).map((type) => <Pressable key={type} style={[styles.filterChip, typeFilter === type && styles.filterChipActive]} onPress={() => setTypeFilter(type)}><Text style={[styles.filterChipText, typeFilter === type && styles.filterChipTextActive]}>{type === 'once' ? '一次' : type === 'daily' ? '每天' : type === 'weekly' ? '每周' : '周期'}</Text></Pressable>)}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              <Pressable style={[styles.filterChip, categoryFilter === 'all' && styles.filterChipActive]} onPress={() => setCategoryFilter('all')}><Text style={[styles.filterChipText, categoryFilter === 'all' && styles.filterChipTextActive]}>全部分类</Text></Pressable>
              {ALARM_CATEGORIES.map((item) => <Pressable key={item.key} style={[styles.filterChip, categoryFilter === item.key && { backgroundColor: `${item.color}20`, borderColor: item.color }]} onPress={() => setCategoryFilter(item.key)}><View style={[styles.filterChipDot, { backgroundColor: item.color }]} /><Text style={styles.filterChipText}>{item.label}</Text></Pressable>)}
            </ScrollView>
            <View style={styles.sortRow}>
              <Text style={styles.resultCount}>共 {filteredAlarms.length} 个提醒</Text>
              <Pressable onPress={() => setSortMode((current) => current === 'next' ? 'label' : current === 'label' ? 'created' : 'next')}><Text style={styles.sortText}>排序：{sortMode === 'next' ? '下次' : sortMode === 'label' ? '名称' : '创建时间'} ↻</Text></Pressable>
            </View>
            <ViewNavigationLink
              label="查看日历"
              description="按月、周或单天查看提醒分布"
              onPress={() => router.replace('/calendar')}
            />
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
  searchInput: { marginTop: 2, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.input, color: COLORS.textPrimary, fontSize: 13 },
  filterChips: { gap: 7, paddingVertical: 9 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  filterChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.primaryDark },
  filterChipDot: { width: 6, height: 6, marginRight: 5, borderRadius: 3 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 5 },
  resultCount: { color: COLORS.textSecondary, fontSize: 11 },
  sortText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  filteredEmpty: { alignItems: 'center', paddingVertical: 42 },
  filteredEmptyTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  filteredEmptyText: { marginTop: 6, color: COLORS.textMuted, fontSize: 12 },
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
