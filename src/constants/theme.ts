/**
 * App 皮肤唯一定义（RN 侧）。
 *
 * 结构分两层：
 *  - palette：原始色值（只有这里允许出现 hex 字面量）
 *  - SKIN：按语义分组的皮肤层，业务代码统一从这里取色
 *
 * 规则：
 *  1. 组件内禁止硬编码色值，一律引用 SKIN（旧代码的 COLORS 兼容层也是从 SKIN 派生的）
 *  2. 新增颜色时先加 palette，再在 SKIN 的语义组里挂引用，不直接用 palette
 *  3. Android 原生弹窗使用的色值在
 *     android/app/src/main/res/values/colors.xml 的 skin_* 颜色中镜像维护，换肤需同步
 */
const palette = {
  /** 品牌紫蓝系 */
  purple500: '#6C5CE7',
  purple700: '#5545C8',
  purple100: '#EAE6FF',
  /** 中性灰系 */
  gray50: '#F7F5FC',
  gray100: '#F3F1F8',
  gray200: '#E5E1F0',
  white: '#FFFFFF',
  /** 墨色文字系 */
  ink900: '#25223A',
  ink600: '#6D6880',
  ink400: '#9C97AC',
  ink300: '#B9B5C4',
  /** 语义状态色 */
  green500: '#45B89C',
  orange500: '#E79A4D',
  red500: '#E85D75',
  /** 卡片投影基色 */
  inkShadow: '#51468A',
} as const;

export const SKIN = {
  /** 品牌色：主按钮底、强调文字、选中描边 */
  brand: {
    primary: palette.purple500,
    /** 按压态 / 深一档强调文字 */
    primaryDark: palette.purple700,
    /** 主色浅底（选中态背景、chip 底） */
    primarySoft: palette.purple100,
    /** 主色之上的文字/图标（反白） */
    onPrimary: palette.white,
  },
  /** 容器：页面背景、卡片白底、输入框浅底 */
  surface: {
    background: palette.gray50,
    card: palette.white,
    input: palette.gray100,
  },
  /** 描边与分隔 */
  line: {
    border: palette.gray200,
    /** hero 卡内部分隔线（primaryDark 低透明度） */
    divider: 'rgba(85, 69, 200, 0.18)',
  },
  /** 文字层级：主标题 → 副标题 → 弱化 → 禁用 */
  text: {
    primary: palette.ink900,
    secondary: palette.ink600,
    muted: palette.ink400,
    disabled: palette.ink300,
  },
  /** 交互态：选中 = 浅紫底 + 主色描边 + 深紫字 */
  state: {
    selectedBg: palette.purple100,
    selectedBorder: palette.purple500,
    selectedText: palette.purple700,
  },
  /** 语义状态色 */
  status: {
    success: palette.green500,
    warning: palette.orange500,
    danger: palette.red500,
  },
  /** 其它专用色 */
  misc: {
    /** 卡片投影色 */
    shadow: palette.inkShadow,
    /** 模态弹窗遮罩（textPrimary 低透明度） */
    backdrop: 'rgba(37, 34, 58, 0.38)',
    /** 今日页节奏点阵未点亮色 */
    heroDotOff: '#D9D2F5',
    /** 分类「其他」的中性灰 */
    categoryNeutral: '#8A839C',
  },
} as const;

/**
 * 兼容层：存量代码的 COLORS.x 由 SKIN 派生。
 * 只允许存量引用，新代码请使用 SKIN；不要在这里新增键。
 */
export const COLORS = {
  primary: SKIN.brand.primary,
  primaryDark: SKIN.brand.primaryDark,
  primarySoft: SKIN.brand.primarySoft,
  background: SKIN.surface.background,
  card: SKIN.surface.card,
  input: SKIN.surface.input,
  border: SKIN.line.border,
  heroDivider: SKIN.line.divider,
  textPrimary: SKIN.text.primary,
  textSecondary: SKIN.text.secondary,
  textMuted: SKIN.text.muted,
  textDisabled: SKIN.text.disabled,
  success: SKIN.status.success,
  warning: SKIN.status.warning,
  danger: SKIN.status.danger,
  shadow: SKIN.misc.shadow,
  heroDotOff: SKIN.misc.heroDotOff,
} as const;

/** 原生弹窗统一中文文案（与 App 语言保持一致，不跟随系统语言） */
export const NATIVE_DIALOG_LABELS = {
  datePicker: {
    title: '选择日期',
    confirm: '确定',
    cancel: '取消',
  },
} as const;
