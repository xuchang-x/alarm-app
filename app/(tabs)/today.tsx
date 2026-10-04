import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SkinAlert } from '@/components/common/SkinAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useAlarmStore, getNextRingDate } from '@/store/alarm-store';
import { useNow } from '@/hooks/useNow';
import { useTodayOverview } from '@/hooks/useTodayOverview';
import { PageHeading } from '@/components/common/PageHeader';
import Fab from '@/components/common/Fab';
import EmptyState from '@/components/common/EmptyState';
import NextRingCard from '@/components/today/NextRingCard';
import TodayTimeline from '@/components/today/TodayTimeline';
import { COLORS } from '@/constants';
import { formatDate } from '@/utils/date';

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function TodayScreen() {
  const router = useRouter();
  // 倒计时按分钟精度刷新，与文案粒度一致
  const now = useNow(30_000);
  const alarms = useAlarmStore((state) => state.alarms);
  const loadAlarms = useAlarmStore((state) => state.loadAlarms);
  const addAdjustment = useAlarmStore((state) => state.addAdjustment);
  const { overview, loading } = useTodayOverview(now);

  useEffect(() => {
    void loadAlarms();
  }, [loadAlarms]);

  const handlePress = useCallback(
    (id: number) => {
      router.push(`/${id}/edit`);
    },
    [router]
  );

  /** 周期项跳过今天一次（复用现有 skip 调整逻辑） */
  const handleSkip = useCallback(
    async (id: number) => {
      try {
        const alarm = alarms.find((item) => item.id === id);
        if (!alarm) return;
        const nextDate = await getNextRingDate(alarm);
        if (nextDate) {
          await addAdjustment(id, 'skip', formatDate(nextDate));
        }
      } catch {
        SkinAlert.alert('错误', '跳过失败，请重试');
      }
    },
    [addAdjustment, alarms]
  );

  const todayLabel = `${format(now, 'M月d日')} · ${WEEKDAY_LABELS[(now.getDay() + 6) % 7]}`;

  const hasContent = overview.nextRing !== null || overview.todayItems.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <PageHeading eyebrow="TODAY" title={todayLabel} subtitle={overview.greeting} />
        </View>

        {hasContent ? (
          <>
            {overview.nextRing ? (
              <NextRingCard info={overview.nextRing} now={now} onPress={handlePress} />
            ) : null}

            {overview.todayItems.length > 0 ? (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>今日时间轴</Text>
                  <Text style={styles.sectionCount}>{overview.todayItems.length} 条</Text>
                </View>
                <TodayTimeline
                  items={overview.todayItems}
                  onPress={handlePress}
                  onSkip={(id) => void handleSkip(id)}
                />
              </>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={loading ? '正在加载' : '今天没有提醒'}
            subtitle="创建一个提醒，开始安排你的节奏"
            actionLabel={loading ? undefined : '创建第一个提醒'}
          />
        )}
      </ScrollView>

      {hasContent ? <Fab /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 112 },
  pageHeader: { paddingTop: 12, paddingBottom: 8 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  sectionCount: { color: COLORS.textMuted, fontSize: 11 },
});
