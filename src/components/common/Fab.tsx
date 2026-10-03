import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { COLORS } from '@/constants';

type FabProps = {
  /** 按钮文字（默认「新建」） */
  label?: string;
  /** 跳转目标路由（默认创建页） */
  route?: Href;
  /** 距底部偏移，默认 24 */
  bottom?: number;
};

/**
 * 右下角悬浮创建按钮，今日/全部页共用。
 */
export default function Fab({ label = '新建', route = '/create', bottom = 24 }: FabProps) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && styles.fabPressed]}
      onPress={() => router.push(route)}
    >
      <Text style={styles.fabText}>＋</Text>
      <Text style={styles.fabLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
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
