import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { NavBar } from '@/components/common/PageHeader';
import AlarmForm from '@/components/alarm-form/AlarmForm';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { COLORS } from '@/constants';

/**
 * 创建页：薄壳，表单逻辑全部在 AlarmForm。
 */
export default function CreateScreen() {
  const router = useRouter();
  const { markDirty, resetDirty, handleCancel } = useDiscardGuard();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar
        title="新建提醒"
        leftAction={{ label: '取消', onPress: handleCancel }}
      />
      <AlarmForm
        onDirtyChange={(next) => (next ? markDirty() : resetDirty())}
        onSaved={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
