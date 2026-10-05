import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS, SKIN } from "@/constants";
import { useSkinStyles } from "@/hooks/useSkinStyles";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  /** 主行动按钮文案；不传则不显示按钮（跳创建页） */
  actionLabel?: string;
};

/**
 * 页面空态占位：图标 + 标题 + 副标题 + 可选创建入口。
 */
export default function EmptyState({
  title,
  subtitle,
  actionLabel,
}: EmptyStateProps) {
  const router = useRouter();
  const styles = useSkinStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>◷</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push("/create")}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 36,
      paddingVertical: 42,
    },
    icon: {
      width: 88,
      height: 88,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
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
      fontWeight: "800",
    },
    subtitle: {
      marginTop: 8,
      color: COLORS.textSecondary,
      fontSize: 14,
      textAlign: "center",
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
      color: SKIN.brand.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
