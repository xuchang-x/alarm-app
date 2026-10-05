import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import type { AlarmCategory, AlarmType } from "@/types/alarm";
import { ALARM_CATEGORIES, COLORS } from "@/constants";
import { useSkinStyles } from "@/hooks/useSkinStyles";

/** 筛选行的持久取值（由调用方持有，刷新后保留） */
export interface FilterValues {
  search: string;
  typeFilter: AlarmType | "all";
  categoryFilter: AlarmCategory | "all";
  sortMode: "next" | "label" | "created";
}

interface FilterBarProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  /** 筛选命中数量，用于结果行 */
  resultCount: number;
}

const TYPE_OPTIONS: { key: AlarmType; label: string }[] = [
  { key: "once", label: "一次" },
  { key: "daily", label: "每天" },
  { key: "weekly", label: "每周" },
  { key: "cycle", label: "周期" },
];

const SORT_LABELS: Record<FilterValues["sortMode"], string> = {
  next: "下次",
  label: "名称",
  created: "创建时间",
};

/**
 * 全部页筛选行：默认收起，展开后显示类型/分类/排序；
 * 搜索框常驻。展开态是纯 UI 状态（本地 state）。
 */
export default function FilterBar({
  values,
  onChange,
  resultCount,
}: FilterBarProps) {
  const styles = useSkinStyles(createStyles);
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilter =
    values.typeFilter !== "all" ||
    values.categoryFilter !== "all" ||
    values.search.trim().length > 0;

  const patch = (partial: Partial<FilterValues>) => {
    onChange({ ...values, ...partial });
  };

  const cycleSort = () => {
    const next: FilterValues["sortMode"] =
      values.sortMode === "next"
        ? "label"
        : values.sortMode === "label"
          ? "created"
          : "next";
    patch({ sortMode: next });
  };

  return (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={values.search}
          onChangeText={(text) => patch({ search: text })}
          placeholder="搜索提醒名称"
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.primary}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "收起筛选" : "展开筛选"}
          style={({ pressed }) => [
            styles.toggle,
            pressed && styles.togglePressed,
          ]}
          onPress={() => setExpanded((current) => !current)}
        >
          <Text
            style={[
              styles.toggleText,
              hasActiveFilter && styles.toggleTextActive,
            ]}
          >
            筛选{hasActiveFilter ? " ·" : ""}
          </Text>
          <Text style={styles.toggleChevron}>{expanded ? "⌃" : "⌄"}</Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.expanded}>
          <Text style={styles.groupLabel}>类型</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Pressable
              style={[
                styles.chip,
                values.typeFilter === "all" && styles.chipActive,
              ]}
              onPress={() => patch({ typeFilter: "all" })}
            >
              <Text
                style={[
                  styles.chipText,
                  values.typeFilter === "all" && styles.chipTextActive,
                ]}
              >
                全部类型
              </Text>
            </Pressable>
            {TYPE_OPTIONS.map(({ key, label }) => (
              <Pressable
                key={key}
                style={[
                  styles.chip,
                  values.typeFilter === key && styles.chipActive,
                ]}
                onPress={() => patch({ typeFilter: key })}
              >
                <Text
                  style={[
                    styles.chipText,
                    values.typeFilter === key && styles.chipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.groupLabel}>分类</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Pressable
              style={[
                styles.chip,
                values.categoryFilter === "all" && styles.chipActive,
              ]}
              onPress={() => patch({ categoryFilter: "all" })}
            >
              <Text
                style={[
                  styles.chipText,
                  values.categoryFilter === "all" && styles.chipTextActive,
                ]}
              >
                全部分类
              </Text>
            </Pressable>
            {ALARM_CATEGORIES.map((item) => {
              const active = values.categoryFilter === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[
                    styles.chip,
                    active && {
                      backgroundColor: `${item.color}20`,
                      borderColor: item.color,
                    },
                  ]}
                  onPress={() => patch({ categoryFilter: item.key })}
                >
                  <View
                    style={[styles.chipDot, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.chipText}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sortRow}>
        <Text style={styles.resultCount}>共 {resultCount} 个提醒</Text>
        <Pressable accessibilityRole="button" onPress={cycleSort}>
          <Text style={styles.sortText}>
            排序：{SORT_LABELS[values.sortMode]} ↻
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: COLORS.input,
      color: COLORS.textPrimary,
      fontSize: 13,
    },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    togglePressed: {
      backgroundColor: COLORS.primarySoft,
      borderColor: COLORS.primary,
    },
    toggleText: {
      color: COLORS.textSecondary,
      fontSize: 12,
      fontWeight: "700",
    },
    toggleTextActive: {
      color: COLORS.primaryDark,
    },
    toggleChevron: {
      color: COLORS.textMuted,
      fontSize: 12,
      fontWeight: "800",
    },
    expanded: {
      marginTop: 10,
      padding: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    groupLabel: {
      color: COLORS.textMuted,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 2,
    },
    chips: {
      gap: 7,
      paddingVertical: 6,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    chipActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primarySoft,
    },
    chipText: {
      color: COLORS.textSecondary,
      fontSize: 11,
      fontWeight: "700",
    },
    chipTextActive: {
      color: COLORS.primaryDark,
    },
    chipDot: {
      width: 6,
      height: 6,
      marginRight: 5,
      borderRadius: 3,
    },
    sortRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      marginBottom: 5,
    },
    resultCount: {
      color: COLORS.textSecondary,
      fontSize: 11,
    },
    sortText: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: "700",
    },
  });
}
