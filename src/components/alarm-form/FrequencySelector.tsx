import { StyleSheet, Text, View, Pressable } from "react-native";
import type { AlarmType } from "@/types/alarm";
import { COLORS } from "@/constants";
import { useSkinStyles } from "@/hooks/useSkinStyles";

interface FrequencySelectorProps {
  value: AlarmType;
  onChange: (type: AlarmType) => void;
}

const TYPE_OPTIONS: { key: AlarmType; title: string; hint: string }[] = [
  { key: "once", title: "就一次", hint: "临时提醒一次" },
  { key: "daily", title: "每天", hint: "固定时间天天响" },
  { key: "weekly", title: "每周", hint: "选一周中的几天" },
  { key: "cycle", title: "每 N 天", hint: "排班 / 浇花的节奏" },
];

/**
 * 创建主线第一步：「这个提醒多久响一次」四选一。
 * 默认选中每 N 天（周期提醒第一公民），不打「核心」类标签。
 */
export default function FrequencySelector({
  value,
  onChange,
}: FrequencySelectorProps) {
  const styles = useSkinStyles(createStyles);
  return (
    <View style={styles.grid}>
      {TYPE_OPTIONS.map(({ key, title, hint }) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.option,
              active && styles.optionActive,
              pressed && styles.optionPressed,
            ]}
            onPress={() => onChange(key)}
          >
            <Text
              style={[styles.optionTitle, active && styles.optionTitleActive]}
            >
              {title}
            </Text>
            <Text
              style={[styles.optionHint, active && styles.optionHintActive]}
            >
              {hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    option: {
      width: "48.3%",
      flexGrow: 1,
      paddingVertical: 13,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    optionActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primarySoft,
    },
    optionPressed: {
      transform: [{ scale: 0.98 }],
    },
    optionTitle: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: "800",
    },
    optionTitleActive: {
      color: COLORS.primary,
    },
    optionHint: {
      marginTop: 3,
      color: COLORS.textMuted,
      fontSize: 10,
      fontWeight: "500",
    },
    optionHintActive: {
      color: COLORS.primary,
      opacity: 0.75,
    },
  });
}
