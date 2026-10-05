import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { SkinAlert } from '@/components/common/SkinAlert';

/**
 * 「放弃未保存修改」守卫：表单脏态下取消/物理返回键统一走二次确认。
 * 创建页与编辑页共用；markDirty/resetDirty 交给 AlarmForm 的 onDirtyChange。
 */
export function useDiscardGuard() {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);

  /** 有未保存改动时二次确认，避免误触丢失 */
  const confirmDiscard = useCallback(() => {
    SkinAlert.alert('放弃修改', '当前编辑内容尚未保存，确定要退出吗？', [
      { text: '继续编辑', style: 'cancel' },
      { text: '放弃修改', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router]);

  /** 导航栏「取消」按钮：干净态直接返回，脏态弹确认 */
  const handleCancel = useCallback(() => {
    if (!dirty) {
      router.back();
      return;
    }
    confirmDiscard();
  }, [dirty, router, confirmDiscard]);

  // 硬件/手势返回键同样走二次确认，避免绕过皮肤弹窗直接丢改动
  useEffect(() => {
    if (!dirty) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmDiscard();
      return true;
    });
    return () => subscription.remove();
  }, [dirty, confirmDiscard]);

  /** 交给表单 onDirtyChange：编辑动作打脏标 */
  const markDirty = useCallback(() => setDirty(true), []);
  /** 交给表单 onDirtyChange：保存成功/切换原闹钟后清脏标 */
  const resetDirty = useCallback(() => setDirty(false), []);

  return { dirty, markDirty, resetDirty, handleCancel };
}
