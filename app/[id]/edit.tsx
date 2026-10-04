import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { NavBar } from '@/components/common/PageHeader';
import AlarmForm from '@/components/alarm-form/AlarmForm';
import { useAlarmStore } from '@/store/alarm-store';
import * as repo from '@/db/alarm-repository';
import type { Alarm } from '@/types/alarm';
import { COLORS } from '@/constants';

/**
 * 编辑页：薄壳 + 加载原闹钟，表单逻辑全部在 AlarmForm。
 * 删除入口通过 onDelete 交给 AlarmForm，弱化为底部保存按钮下的小字链接。
 */
export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const deleteAlarm = useAlarmStore((state) => state.deleteAlarm);
  const [loading, setLoading] = useState(true);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function loadAlarm() {
      const alarmId = parseInt(id, 10);
      if (isNaN(alarmId)) {
        Alert.alert('错误', '无效的闹钟 ID');
        router.back();
        return;
      }

      const found = await repo.getAlarmById(alarmId);
      if (!found) {
        Alert.alert('错误', '闹钟不存在');
        router.back();
        return;
      }

      setAlarm(found);
      setLoading(false);
    }

    loadAlarm();
  }, [id, router]);

  /** 有未保存改动时二次确认，避免误触丢失 */
  const handleCancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('放弃修改', '当前编辑内容尚未保存，确定要退出吗？', [
      { text: '继续编辑', style: 'cancel' },
      { text: '放弃修改', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const handleDelete = () => {
    if (!alarm) return;
    Alert.alert('删除提醒', '确定删除这个提醒吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void deleteAlarm(alarm.id).then(() => router.back());
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>正在加载闹钟</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar
        title="编辑提醒"
        leftAction={{ label: '取消', onPress: handleCancel }}
      />
      {alarm ? (
        <AlarmForm
          initialAlarm={alarm}
          onDirtyChange={setDirty}
          onSaved={() => router.back()}
          onDelete={handleDelete}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 13 },
});
