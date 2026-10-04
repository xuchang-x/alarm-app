import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { NavBar } from '@/components/common/PageHeader';
import AlarmForm from '@/components/alarm-form/AlarmForm';
import { SkinAlert } from '@/components/common/SkinAlert';
import { COLORS } from '@/constants';

/**
 * 创建页：薄壳，表单逻辑全部在 AlarmForm。
 */
export default function CreateScreen() {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);

  /** 有未保存改动时二次确认，避免误触丢失 */
  const confirmDiscard = () => {
    SkinAlert.alert('放弃修改', '当前编辑内容尚未保存，确定要退出吗？', [
      { text: '继续编辑', style: 'cancel' },
      { text: '放弃修改', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const handleCancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    confirmDiscard();
  };

  // 硬件/手势返回键同样走二次确认，避免绕过皮肤弹窗直接丢改动
  useEffect(() => {
    if (!dirty) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmDiscard();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar
        title="新建提醒"
        leftAction={{ label: '取消', onPress: handleCancel }}
      />
      <AlarmForm onDirtyChange={setDirty} onSaved={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
