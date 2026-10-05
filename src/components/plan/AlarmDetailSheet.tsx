import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import type { CalendarInstance } from "@/services/calendar";
import { formatTime } from "@/utils/date";
import { ALARM_TYPE_LABELS, COLORS, SKIN } from "@/constants";
import { useSkinStyles } from "@/hooks/useSkinStyles";
import { getCategoryColor } from "./shared";

interface AlarmDetailSheetProps {
  instance: CalendarInstance | null;
  onClose: () => void;
  onEdit: (id: number) => void;
}

/**
 * 日历实例详情底部弹层。
 */
export default function AlarmDetailSheet({
  instance,
  onClose,
  onEdit,
}: AlarmDetailSheetProps) {
  const styles = useSkinStyles(createStyles);
  if (!instance) return null;
  const color = getCategoryColor(instance);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.detailHandle} />
          <View style={styles.detailHeader}>
            <View
              style={[styles.detailCategoryDot, { backgroundColor: color }]}
            />
            <Text style={styles.detailTitle} numberOfLines={2}>
              {instance.alarm.label || "未命名提醒"}
            </Text>
            <Pressable style={styles.detailCloseButton} onPress={onClose}>
              <Text style={styles.detailCloseText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.detailTime}>
            {formatTime(instance.alarm.hour, instance.alarm.minute)}
          </Text>
          <Text style={styles.detailDate}>
            {format(instance.date, "M月d日")} ·{" "}
            {ALARM_TYPE_LABELS[instance.alarm.type]}
          </Text>
          <View style={styles.detailStatusRow}>
            <Text style={styles.detailStatusLabel}>状态</Text>
            <Text style={styles.detailStatusValue}>
              {instance.alarm.enabled ? "已开启" : "已暂停"}
            </Text>
          </View>
          <View style={styles.detailActions}>
            <Pressable style={styles.detailSecondaryButton} onPress={onClose}>
              <Text style={styles.detailSecondaryText}>关闭</Text>
            </Pressable>
            <Pressable
              style={styles.detailPrimaryButton}
              onPress={() => onEdit(instance.alarm.id)}
            >
              <Text style={styles.detailPrimaryText}>编辑闹钟</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: SKIN.misc.sheetBackdrop,
    },
    detailSheet: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 28,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: COLORS.card,
    },
    detailHandle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      marginBottom: 16,
      borderRadius: 2,
      backgroundColor: COLORS.border,
    },
    detailHeader: { flexDirection: "row", alignItems: "center" },
    detailCategoryDot: {
      width: 10,
      height: 10,
      marginRight: 8,
      borderRadius: 5,
    },
    detailTitle: {
      flex: 1,
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: "800",
    },
    detailCloseButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
      borderRadius: 16,
      backgroundColor: COLORS.input,
    },
    detailCloseText: {
      color: COLORS.textSecondary,
      fontSize: 22,
      lineHeight: 24,
    },
    detailTime: {
      marginTop: 18,
      color: COLORS.primaryDark,
      fontSize: 32,
      fontWeight: "800",
    },
    detailDate: { marginTop: 4, color: COLORS.textSecondary, fontSize: 13 },
    detailStatusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 20,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: COLORS.border,
    },
    detailStatusLabel: { color: COLORS.textSecondary, fontSize: 13 },
    detailStatusValue: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    detailActions: { flexDirection: "row", gap: 10, marginTop: 18 },
    detailSecondaryButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 13,
      borderRadius: 13,
      backgroundColor: COLORS.input,
    },
    detailSecondaryText: {
      color: COLORS.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },
    detailPrimaryButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 13,
      borderRadius: 13,
      backgroundColor: COLORS.primary,
    },
    detailPrimaryText: {
      color: SKIN.brand.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
