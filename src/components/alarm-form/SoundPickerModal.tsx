import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
// SDK 56 起 getAssetsAsync/SortBy 等仅在 legacy 子入口可用（主入口是运行时抛错的弃用 stub）
import * as MediaLibrary from "expo-media-library/legacy";
import { SkinAlert, type SkinAlertButton } from "@/components/common/SkinAlert";
import { COLORS, SKIN } from "@/constants";
import { useSkinStyles } from "@/hooks/useSkinStyles";
import {
  DEFAULT_SOUND_ID,
  SOUND_GROUP_LABELS,
  SOUND_PRESETS,
  getSoundAsset,
  type SoundPreset,
} from "@/constants/sounds";
import { useSoundPreview } from "@/hooks/useSoundPreview";

/** 铃声选择结果（回填给表单） */
export interface SoundSelection {
  /** 内置音 id；选本地音乐时为 null */
  soundId: string | null;
  customSoundUri: string | null;
  customSoundTitle: string | null;
}

interface SoundPickerModalProps {
  visible: boolean;
  /** 当前选中：soundId 或自定义歌名（用于列表选中标记） */
  currentSoundId: string | null;
  currentCustomTitle: string | null;
  onSelect: (selection: SoundSelection) => void;
  onClose: () => void;
}

/**
 * 铃声选择器（007）：三档分组内置音列表 + 试听 + 「从音乐库选择」。
 *
 * 本地选歌链路：expo-media-library 权限 → 音频资产列表（简版：取前 200 首）；
 * 权限被拒时降级 document-picker（系统文件选择，选任意音频文件）。
 */
export default function SoundPickerModal({
  visible,
  currentSoundId,
  currentCustomTitle,
  onSelect,
  onClose,
}: SoundPickerModalProps) {
  const styles = useSkinStyles(createStyles);
  const [searching, setSearching] = useState(false);
  const { preview, release } = useSoundPreview();

  // 关闭时释放试听播放器
  useEffect(() => {
    if (!visible) release();
  }, [visible, release]);

  const handlePresetSelect = (preset: SoundPreset): void => {
    onSelect({
      soundId: preset.id,
      customSoundUri: null,
      customSoundTitle: null,
    });
    onClose();
  };

  /** 内置音试听（资产缺失静默跳过；播放异常弹提示，避免无声失败难排查） */
  const handlePreview = (preset: SoundPreset): void => {
    const asset = getSoundAsset(preset.id);
    if (asset === null) return;
    preview(asset).catch((error: unknown) => {
      console.warn("[SoundPicker] 试听失败:", error);
      SkinAlert.alert("提示", "试听失败，请稍后再试");
    });
  };

  /** 音乐库选歌：media-library 权限 → 资产列表；拒绝则降级 document-picker */
  const handlePickFromLibrary = async (): Promise<void> => {
    if (searching) return;
    setSearching(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.granted) {
        const picked = await pickFromMediaLibrary();
        if (picked) {
          onSelect({
            soundId: null,
            customSoundUri: picked.uri,
            customSoundTitle: picked.title,
          });
          onClose();
        }
        return;
      }
      // 权限被拒：降级系统文件选择
      const fallback = await pickByDocumentPicker();
      if (fallback) {
        onSelect({
          soundId: null,
          customSoundUri: fallback.uri,
          customSoundTitle: fallback.title,
        });
        onClose();
      }
    } catch (error) {
      console.warn("[SoundPicker] 音乐库选歌失败:", error);
      SkinAlert.alert("提示", "暂时无法访问音乐库，请稍后再试");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>选择铃声</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {(["sharp", "gentle", "nature"] as const).map((group) => (
              <View key={group} style={styles.group}>
                <Text style={styles.groupLabel}>
                  {SOUND_GROUP_LABELS[group]}
                </Text>
                {SOUND_PRESETS.filter((preset) => preset.group === group).map(
                  (preset) => {
                    const active =
                      preset.id === (currentSoundId ?? DEFAULT_SOUND_ID) &&
                      currentCustomTitle === null;
                    return (
                      <View key={preset.id} style={styles.itemRow}>
                        <Pressable
                          style={[
                            styles.itemMain,
                            active && styles.itemMainActive,
                          ]}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          onPress={() => handlePresetSelect(preset)}
                        >
                          <Text
                            style={[
                              styles.itemName,
                              active && styles.itemNameActive,
                            ]}
                          >
                            {preset.name}
                          </Text>
                          {active ? (
                            <Text style={styles.checkMark}>✓</Text>
                          ) : null}
                        </Pressable>
                        <Pressable
                          style={styles.previewButton}
                          accessibilityLabel={`试听${preset.name}`}
                          onPress={() => handlePreview(preset)}
                        >
                          <Text style={styles.previewText}>试听</Text>
                        </Pressable>
                      </View>
                    );
                  },
                )}
              </View>
            ))}

            {currentCustomTitle ? (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>当前自定义</Text>
                <View style={styles.itemRow}>
                  <View style={[styles.itemMain, styles.itemMainActive]}>
                    <Text
                      style={[styles.itemName, styles.itemNameActive]}
                      numberOfLines={1}
                    >
                      🎵 {currentCustomTitle}
                    </Text>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.libraryButton,
              pressed && styles.libraryButtonPressed,
              searching && styles.libraryButtonDisabled,
            ]}
            accessibilityRole="button"
            onPress={() => void handlePickFromLibrary()}
            disabled={searching}
          >
            <Text style={styles.libraryButtonText}>
              {searching ? "正在读取音乐库..." : "从音乐库选择"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** 简版选歌：取音乐库最近的音频，用 Alert 列表让用户选（MVP 不做搜索页） */
async function pickFromMediaLibrary(): Promise<{
  uri: string;
  title: string;
} | null> {
  const assets = await MediaLibrary.getAssetsAsync({
    mediaType: "audio",
    first: 200,
    // legacy API 的 sortBy 是「排序选项列表」：每项为 key 或 [key, boolean]。
    // 必须写成外层数组包 pair；false 映射 DESC（最新在前），true 是 ASC
    sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
  });
  const audio = assets.assets;
  if (audio.length === 0) {
    SkinAlert.alert("提示", "音乐库里没有找到音频文件，可以试试「从文件选择」");
    return null;
  }
  // 取最近的几首用 Alert 选项呈现（简版列表，后续迭代再做完整选择页）
  const shown = audio.slice(0, 6);
  return new Promise((resolve) => {
    const buttons: SkinAlertButton[] = shown.map((asset) => ({
      text: asset.filename.slice(0, 24),
      onPress: () => resolve({ uri: asset.uri, title: asset.filename }),
    }));
    buttons.push({ text: "取消", onPress: () => resolve(null) });
    SkinAlert.alert(
      "选择音乐",
      "最近添加的音频（简版列表，更多歌曲稍后开放）：",
      buttons,
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** document-picker 降级：系统文件选择器选任意音频 */
async function pickByDocumentPicker(): Promise<{
  uri: string;
  title: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    copyToCacheDirectory: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  if (Platform.OS === "android" && !asset.uri.startsWith("content://")) {
    // file:// URI 重装后会失效且原生层可能无权读取，提示用户换 content URI 来源
    SkinAlert.alert(
      "提示",
      "该文件无法作为铃声（本地路径不可持久），请从音乐库中选择",
    );
    return null;
  }
  return { uri: asset.uri, title: asset.name || "本地音乐" };
}

function createStyles() {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: SKIN.misc.sheetBackdrop,
    },
    sheet: {
      maxHeight: "78%",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 26,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: COLORS.card,
    },
    handle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      marginBottom: 14,
      borderRadius: 2,
      backgroundColor: COLORS.border,
    },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    title: {
      flex: 1,
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: "800",
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: COLORS.input,
    },
    closeText: { color: COLORS.textSecondary, fontSize: 18, fontWeight: "700" },
    list: { flexGrow: 0 },
    group: { marginTop: 12 },
    groupLabel: {
      marginBottom: 8,
      color: COLORS.textMuted,
      fontSize: 11,
      fontWeight: "700",
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    itemMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      backgroundColor: COLORS.input,
    },
    itemMainActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primarySoft,
    },
    itemName: {
      flex: 1,
      color: COLORS.textSecondary,
      fontSize: 13,
      fontWeight: "700",
    },
    itemNameActive: { color: COLORS.primaryDark },
    checkMark: {
      color: COLORS.primaryDark,
      fontSize: 15,
      fontWeight: "900",
      marginLeft: 8,
    },
    previewButton: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    previewText: {
      color: COLORS.textSecondary,
      fontSize: 11,
      fontWeight: "700",
    },
    libraryButton: {
      alignItems: "center",
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: COLORS.primary,
    },
    libraryButtonPressed: {
      backgroundColor: COLORS.primaryDark,
      transform: [{ scale: 0.99 }],
    },
    libraryButtonDisabled: { opacity: 0.55 },
    libraryButtonText: {
      color: SKIN.brand.onPrimary,
      fontSize: 14,
      fontWeight: "800",
    },
  });
}
