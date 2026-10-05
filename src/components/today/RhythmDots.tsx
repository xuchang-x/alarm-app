import { StyleSheet, View } from "react-native";
import { COLORS } from "@/constants";
import { useSkinStyles } from "@/hooks/useSkinStyles";

type RhythmDotsProps = {
  /** 周期总天数 */
  total: number;
  /** 已走过的天数（今天的位置，1 起） */
  filled: number;
};

/**
 * 周期节奏点阵：N 个圆点，前 filled 个点亮，直观表达「今天在周期里走到哪」。
 */
export default function RhythmDots({ total, filled }: RhythmDotsProps) {
  const styles = useSkinStyles(createStyles);
  const count = Math.max(1, Math.min(total, 14));
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[styles.dot, index < filled ? styles.dotOn : styles.dotOff]}
        />
      ))}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotOn: {
      backgroundColor: COLORS.primary,
    },
    dotOff: {
      backgroundColor: COLORS.heroDotOff,
    },
  });
}
