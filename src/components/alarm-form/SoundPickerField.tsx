import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants';
import { DEFAULT_SOUND_ID, findSoundPreset } from '@/constants/sounds';
import SoundPickerModal, { type SoundSelection } from './SoundPickerModal';

interface SoundPickerFieldProps {
  /** 当前内置音 id（null = 默认音） */
  soundId: string | null;
  customSoundUri: string | null;
  customSoundTitle: string | null;
  onChange: (selection: SoundSelection) => void;
}

/**
 * 表单「铃声」字段：显示当前铃声名（自定义歌名 / 内置音名），
 * 点击打开 SoundPickerModal 选择。
 */
export default function SoundPickerField({
  soundId,
  customSoundUri,
  customSoundTitle,
  onChange,
}: SoundPickerFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  // 显示名：本地音乐优先，其次内置音（未知 id/NULL 兜底默认音）
  const displayName = customSoundTitle
    ?? findSoundPreset(soundId)?.name
    ?? findSoundPreset(DEFAULT_SOUND_ID)!.name;
  const isCustom = customSoundUri !== null;

  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>铃声</Text>
      <Pressable
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={`当前铃声 ${displayName}，点击选择铃声`}
        onPress={() => setPickerVisible(true)}
      >
        <View style={styles.buttonLeft}>
          <Text style={styles.soundName} numberOfLines={1}>
            {isCustom ? `🎵 ${displayName}` : displayName}
          </Text>
          {isCustom ? <Text style={styles.customBadge}>本地音乐</Text> : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <SoundPickerModal
        visible={pickerVisible}
        currentSoundId={soundId}
        currentCustomTitle={customSoundUri ? customSoundTitle : null}
        onSelect={onChange}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  rowKey: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: COLORS.input,
  },
  buttonLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  soundName: { flexShrink: 1, color: COLORS.primaryDark, fontSize: 14, fontWeight: '700' },
  customBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  chevron: { color: COLORS.textMuted, fontSize: 22 },
});
