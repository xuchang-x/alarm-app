import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeading } from '@/components/PageHeader';
import { COLORS } from '@/constants';

/**
 * 今日页占位（T5 实现完整版）：
 * 下一次响铃大卡片 + 倒计时 + 周期节奏 + 今日时间轴
 */
export default function TodayScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.pageHeader}>
        <PageHeading
          eyebrow="TODAY"
          title="今日"
          subtitle="离下一次提醒还有多久"
        />
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>今日视图建设中</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: COLORS.textMuted, fontSize: 13 },
});
