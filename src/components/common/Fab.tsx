import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SKIN } from '@/constants';

/**
 * 右下角悬浮创建按钮，今日/全部页共用。
 */
export default function Fab() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="新建"
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      onPress={() => router.push('/create')}
    >
      <Text style={styles.fabText}>＋</Text>
      <Text style={styles.fabLabel}>新建</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    color: SKIN.brand.onPrimary,
    fontSize: 22,
    lineHeight: 24,
  },
  fabLabel: {
    marginLeft: 6,
    color: SKIN.brand.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
