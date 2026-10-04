import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SKIN } from '@/constants';

/**
 * 皮肤化系统弹窗：与 RN Alert.alert 同签名的命令式 API。
 *
 * 样式与其他弹窗（TimePicker/SoundPickerModal 的白卡片 + 紫色按钮）保持一致，
 * 替代 Android 上走系统原生配色（壁纸动态色）的 Alert.alert。
 *
 * 使用方式：
 *  1. 在根布局挂载 <SkinAlertHost />（app/_layout.tsx）
 *  2. 业务代码 import { SkinAlert } 后直接 SkinAlert.alert(...)，签名与 Alert.alert 相同
 *  3. Host 未挂载时自动降级为系统 Alert，不会丢提示
 */

export interface SkinAlertButton {
  text: string;
  onPress?: () => void;
  /** cancel=浅灰次按钮；destructive=红色危险操作；default=紫色主按钮 */
  style?: 'default' | 'cancel' | 'destructive';
}

interface SkinAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertRequest {
  title: string;
  message?: string;
  buttons: SkinAlertButton[];
  options?: SkinAlertOptions;
}

let emitAlert: ((request: AlertRequest) => void) | null = null;

export const SkinAlert = {
  alert(title: string, message?: string, buttons?: SkinAlertButton[], options?: SkinAlertOptions) {
    const normalized = buttons && buttons.length > 0 ? buttons : [{ text: '确定' }];
    if (emitAlert) {
      emitAlert({ title, message, buttons: normalized, options });
    } else {
      // 兜底：Host 未挂载（如测试环境/极早期调用）时退回系统弹窗
      Alert.alert(title, message, normalized, options);
    }
  },
};

export function SkinAlertHost() {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    emitAlert = setRequest;
    return () => {
      emitAlert = null;
    };
  }, []);

  const close = () => setRequest(null);

  const handleButtonPress = (button: SkinAlertButton) => {
    close();
    button.onPress?.();
  };

  const handleRequestClose = () => {
    if (!request?.options?.cancelable) return;
    close();
    request.options.onDismiss?.();
  };

  const buttons = request?.buttons ?? [];
  // 三个及以上按钮（如铃声文件选择列表）纵向排列，两个及以下横向
  const vertical = buttons.length > 2;

  return (
    <Modal visible={request !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={handleRequestClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={handleRequestClose} />
        {request !== null && (
          <View style={styles.card}>
            <Text style={styles.title}>{request.title}</Text>
            {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
            <View style={vertical ? styles.footerColumn : styles.footerRow}>
              {buttons.map((button) => (
                <Pressable
                  key={button.text}
                  style={({ pressed }) => [
                    vertical ? styles.buttonColumn : styles.buttonRow,
                    buttonStyles(button.style),
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  accessibilityRole="button"
                  accessibilityLabel={button.text}
                >
                  <Text numberOfLines={1} style={[styles.buttonText, buttonTextStyles(button.style)]}>
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function buttonStyles(style?: SkinAlertButton['style']) {
  if (style === 'cancel') return styles.buttonCancel;
  if (style === 'destructive') return styles.buttonDestructive;
  return styles.buttonPrimary;
}

function buttonTextStyles(style?: SkinAlertButton['style']) {
  if (style === 'cancel') return styles.buttonTextCancel;
  return styles.buttonTextPrimary;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: SKIN.misc.backdrop },
  card: {
    width: '100%',
    maxWidth: 360,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderRadius: 24,
    backgroundColor: SKIN.surface.card,
    shadowColor: SKIN.misc.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 12,
  },
  title: { color: SKIN.text.primary, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  message: { marginTop: 8, color: SKIN.text.secondary, fontSize: 14, lineHeight: 21 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  footerColumn: { gap: 8, marginTop: 20 },
  buttonRow: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 14 },
  buttonColumn: { alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 14, paddingHorizontal: 12 },
  buttonPrimary: { backgroundColor: SKIN.brand.primary },
  buttonCancel: { backgroundColor: SKIN.surface.input },
  buttonDestructive: { backgroundColor: SKIN.status.danger },
  buttonPressed: { opacity: 0.82 },
  buttonText: { fontSize: 14, fontWeight: '800' },
  buttonTextPrimary: { color: SKIN.brand.onPrimary },
  buttonTextCancel: { color: SKIN.text.secondary },
});
