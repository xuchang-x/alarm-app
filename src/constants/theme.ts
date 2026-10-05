/**
 * App 皮肤唯一定义（RN 侧）。
 *
 * 结构分三层：
 *  - paletteLight / paletteDark：原始色值（只有这里允许出现 hex 字面量）
 *  - SKIN：按语义分组的皮肤层，业务代码统一从这里取色
 *  - COLORS：存量兼容层，从 SKIN 派生
 *
 * 深色模式（008）：SKIN 在 JS bundle 求值时按主题一次性定型——
 * 组件的模块级 StyleSheet.create 会在求值时把色值冻结进样式表，
 * 因此主题切换 = 写入偏好 + 重载 JS（见设置页 handleThemeChange），
 * 不支持运行中热切换（页面代码零改动约束下的既定语义）。
 *
 * 规则：
 *  1. 组件内禁止硬编码色值，一律引用 SKIN（旧代码的 COLORS 兼容层也是从 SKIN 派生的）
 *  2. 新增颜色时先加 palette，再在 SKIN 的语义组里挂引用，不直接用 palette
 *  3. Android 原生弹窗使用的色值在
 *     android/app/src/main/res/values/colors.xml（浅色）与
 *     values-night/colors.xml（系统深色）中镜像维护，换肤需同步
 */
import { Appearance } from 'react-native';

import { AlarmRing } from '../../modules/alarm-ring/src/index';

/** 浅色 palette（当前线上视觉，禁止改动） */
const paletteLight = {
  /** 品牌紫蓝系 */
  purple500: '#6C5CE7',
  purple700: '#5545C8',
  purple100: '#EAE6FF',
  /** 中性灰系 */
  gray50: '#F7F5FC',
  gray100: '#F3F1F8',
  gray200: '#E5E1F0',
  /** 卡片白底（与 onPrimary 的纯白分键：深色下卡片变暗、主色上文字仍纯白） */
  card: '#FFFFFF',
  /** 卡片按压态（比白底更灰一丝） */
  cardPressed: '#FBFAFF',
  /** 停用卡片的底色与描边（沉底弱化） */
  cardDisabledBg: '#FBFAFD',
  cardDisabledBorder: '#ECE9F2',
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
  /** 语义状态色浅底（状态胶囊） */
  successSoft: '#DDF4ED',
  dangerSoft: '#FDECEF',
  /** 其它专用色 */
  heroDotOff: '#D9D2F5',
  categoryNeutral: '#8A839C',
} as const;

/**
 * 深色 palette（008 方案 1「经典紫夜 Material」）。
 * 要点：近黑底带轻紫调；卡片比底色亮一档；品牌紫提亮保证深底对比度；
 * 状态色整体提亮一档；正文用柔白不用纯白（避免深底眩光）。
 */
const paletteDark = {
  purple500: '#8B7CF7',
  purple700: '#7A6BE8',
  purple100: '#2A2542',
  gray50: '#121212',
  gray100: '#232030',
  gray200: '#2E2A3E',
  /** 深色卡片：比底色亮一档（方案 1） */
  card: '#1E1B2E',
  cardPressed: '#282441',
  cardDisabledBg: '#1A1728',
  cardDisabledBorder: '#2A2640',
  white: '#FFFFFF',
  ink900: '#E4E1EF',
  ink600: '#9B96AD',
  ink400: '#6E6980',
  ink300: '#4A4658',
  green500: '#5BC9A9',
  orange500: '#F0B26B',
  red500: '#F27E93',
  inkShadow: '#000000',
  successSoft: '#1D3A32',
  dangerSoft: '#3A2530',
  heroDotOff: 'rgba(255, 255, 255, 0.28)',
  categoryNeutral: '#948DA6',
} as const;

/** 单个主题的完整皮肤结构（浅深两套同构，业务代码无感知） */
function createSkin(p: { [K in keyof typeof paletteLight]: string }) {
  return {
    /** 品牌色：主按钮底、强调文字、选中描边 */
    brand: {
      primary: p.purple500,
      /** 按压态 / 深一档强调文字 */
      primaryDark: p.purple700,
      /** 主色浅底（选中态背景、chip 底） */
      primarySoft: p.purple100,
      /** 主色之上的文字/图标（反白） */
      onPrimary: p.white,
    },
    /** 容器：页面背景、卡片白底、输入框浅底 */
    surface: {
      background: p.gray50,
      card: p.card,
      input: p.gray100,
      /** 卡片按压态 */
      cardPressed: p.cardPressed,
      /** 停用卡片底色（配合 line.cardDisabledBorder） */
      cardDisabledBg: p.cardDisabledBg,
    },
    /** 描边与分隔 */
    line: {
      border: p.gray200,
      /** 停用卡片描边 */
      cardDisabledBorder: p.cardDisabledBorder,
      /** hero 卡内部分隔线（primaryDark 低透明度） */
      divider:
        p === paletteLight
          ? 'rgba(85, 69, 200, 0.18)'
          : 'rgba(139, 124, 247, 0.25)',
    },
    /** 文字层级：主标题 → 副标题 → 弱化 → 禁用 */
    text: {
      primary: p.ink900,
      secondary: p.ink600,
      muted: p.ink400,
      disabled: p.ink300,
    },
    /** 交互态：选中 = 浅紫底 + 主色描边 + 深紫字 */
    state: {
      selectedBg: p.purple100,
      selectedBorder: p.purple500,
      selectedText: p.purple700,
      /** 状态色浅底（设置页状态胶囊、删除链接按压态） */
      successSoft: p.successSoft,
      dangerSoft: p.dangerSoft,
    },
    /** 语义状态色 */
    status: {
      success: p.green500,
      warning: p.orange500,
      danger: p.red500,
    },
    /** 其它专用色 */
    misc: {
      /** 卡片投影色 */
      shadow: p.inkShadow,
      /** 模态弹窗遮罩（textPrimary 低透明度） */
      backdrop:
        p === paletteLight ? 'rgba(37, 34, 58, 0.38)' : 'rgba(0, 0, 0, 0.62)',
      /** 底部 Sheet 弹层遮罩（比全屏遮罩更轻） */
      sheetBackdrop:
        p === paletteLight ? 'rgba(37, 34, 58, 0.24)' : 'rgba(0, 0, 0, 0.55)',
      /** 今日页节奏点阵未点亮色 */
      heroDotOff: p.heroDotOff,
      /** 分类「其他」的中性灰 */
      categoryNeutral: p.categoryNeutral,
    },
  } as const;
}

export type SkinThemeName = 'light' | 'dark';

export const SKIN_LIGHT = createSkin(paletteLight);
export const SKIN_DARK = createSkin(paletteDark);

type SkinShape = typeof SKIN_LIGHT;
type ColorsShape = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  background: string;
  card: string;
  input: string;
  border: string;
  heroDivider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  success: string;
  warning: string;
  danger: string;
  shadow: string;
  heroDotOff: string;
};

function createColors(s: SkinShape): ColorsShape {
  return {
    primary: s.brand.primary,
    primaryDark: s.brand.primaryDark,
    primarySoft: s.brand.primarySoft,
    background: s.surface.background,
    card: s.surface.card,
    input: s.surface.input,
    border: s.line.border,
    heroDivider: s.line.divider,
    textPrimary: s.text.primary,
    textSecondary: s.text.secondary,
    textMuted: s.text.muted,
    textDisabled: s.text.disabled,
    success: s.status.success,
    warning: s.status.warning,
    danger: s.status.danger,
    shadow: s.misc.shadow,
    heroDotOff: s.misc.heroDotOff,
  };
}

/**
 * 当前生效皮肤：模块求值时按持久化主题一次性定型。
 * 保持对象引用不变（业务代码 import 的就是它），applySkinTheme 原地覆写值。
 */
export const SKIN = createSkin(paletteLight);

/**
 * 兼容层：存量代码的 COLORS.x 由 SKIN 派生。
 * 只允许存量引用，新代码请使用 SKIN；不要在这里新增键。
 */
export const COLORS = createColors(SKIN);

/** 当前生效的主题名（applySkinTheme 后更新；StatusBar 等壳层用） */
let currentTheme: SkinThemeName = 'light';

/** 原地覆写 SKIN/COLORS 为目标主题（对象引用不变，仅切值） */
export function applySkinTheme(theme: SkinThemeName): void {
  const source = theme === 'dark' ? SKIN_DARK : SKIN_LIGHT;
  const target = SKIN as unknown as Record<string, unknown>;
  const src = source as unknown as Record<string, unknown>;
  for (const group of Object.keys(src)) {
    Object.assign(target[group] as Record<string, unknown>, src[group]);
  }
  Object.assign(COLORS as unknown as Record<string, unknown>, createColors(source));
  currentTheme = theme;
}

/** 读当前生效主题（StatusBar 等壳层按需取用） */
export function getCurrentSkinTheme(): SkinThemeName {
  return currentTheme;
}

/**
 * 把主题偏好解析为实际皮肤主题。
 * 'system' 跟随系统外观（求值时快照一次，运行中系统切换在下次启动生效）。
 */
export function resolveSkinTheme(pref: 'system' | 'light' | 'dark'): SkinThemeName {
  if (pref === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return pref;
}

/**
 * 启动定型：读取原生侧持久化的主题偏好（同步），求值阶段就把 SKIN 定成正确主题。
 * 必须在本模块被任何组件引入前完成——组件的模块级样式表会冻结这里的色值。
 * 原生模块不可用（Expo Go / iOS）时保持浅色，与既有降级策略一致。
 */
function initSkinAtEval(): void {
  try {
    const pref = AlarmRing?.getSkinTheme();
    applySkinTheme(resolveSkinTheme(pref === 'dark' || pref === 'light' || pref === 'system' ? pref : 'system'));
  } catch {
    // 读不到偏好（Expo Go 等）保持浅色
  }
}
initSkinAtEval();

/** 原生弹窗统一中文文案（与 App 语言保持一致，不跟随系统语言） */
export const NATIVE_DIALOG_LABELS = {
  datePicker: {
    title: '选择日期',
    confirm: '确定',
    cancel: '取消',
  },
} as const;
