/**
 * App 皮肤唯一定义（RN 侧）。
 *
 * 所有模块的 UI 颜色必须从这里引用，禁止在组件内散落硬编码色值；
 * Android 原生弹窗使用的对应色值在
 * android/app/src/main/res/values/colors.xml 的 skin_* 颜色中镜像维护，
 * 未来换肤时两处需同步修改。
 */
export const COLORS = {
  background: '#F7F5FC',
  card: '#FFFFFF',
  input: '#F3F1F8',
  primary: '#6C5CE7',
  primaryDark: '#5545C8',
  primarySoft: '#EAE6FF',
  danger: '#E85D75',
  warning: '#E79A4D',
  success: '#45B89C',
  textPrimary: '#25223A',
  textSecondary: '#6D6880',
  textMuted: '#9C97AC',
  textDisabled: '#B9B5C4',
  border: '#E5E1F0',
  shadow: '#51468A',
  /** 今日页 hero 卡分隔线（primaryDark 低透明度） */
  heroDivider: 'rgba(85, 69, 200, 0.18)',
  /** 今日页节奏点阵未点亮色 */
  heroDotOff: '#D9D2F5',
} as const;

/** 原生弹窗统一中文文案（与 App 语言保持一致，不跟随系统语言） */
export const NATIVE_DIALOG_LABELS = {
  datePicker: {
    title: '选择日期',
    confirm: '确定',
    cancel: '取消',
  },
} as const;

export type NativeDialogLabels = typeof NATIVE_DIALOG_LABELS.datePicker;
