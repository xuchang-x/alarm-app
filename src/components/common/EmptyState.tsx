import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { COLORS } from '@/constants';

type EmptyStateProps = {
  /** 图标字体符号 */
  icon?: string;
  title: string;
  subtitle?: string;
  /** 主行动按钮文案；不传则不显示按钮 */
  actionLabel?: string;
  /** 主行动路由（默认创建页） */
  route?: Href;
};

/**
 * 页面空态占位：图标 + 标题 + 副标题 + 可选创建入口。
 */
export default function EmptyState({
  icon = '◷',
  title,
  subtitle,
  actionLabel,
  route = '/create',
}: EmptyStateProps) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push(route)}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 42,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  iconText: {
    color: COLORS.primary,
    fontSize: 44,
  },
  title: {
    marginTop: 20,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
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
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
