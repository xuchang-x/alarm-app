import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants';

export type HeaderAction = {
  label: string;
  onPress: () => void;
};

type NavBarProps = {
  /** 导航栏居中标题 */
  title: string;
  /** 左侧动作（如"取消"），缺省时占位 */
  leftAction?: HeaderAction;
  /** 右侧动作（如"今天"），缺省时占位 */
  rightAction?: HeaderAction;
};

/**
 * 页面顶部导航栏：左动作 + 居中标题 + 右动作，各页面统一使用。
 */
export function NavBar({ title, leftAction, rightAction }: NavBarProps) {
  return (
    <View style={navBarStyles.bar}>
      <View style={navBarStyles.leftSlot}>
        {leftAction ? (
          <Pressable
            accessibilityRole="button"
            style={navBarStyles.action}
            onPress={leftAction.onPress}
          >
            <Text style={navBarStyles.actionText}>{leftAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={navBarStyles.title}>{title}</Text>
      <View style={navBarStyles.rightSlot}>
        {rightAction ? (
          <Pressable
            accessibilityRole="button"
            style={navBarStyles.action}
            onPress={rightAction.onPress}
          >
            <Text style={navBarStyles.actionText}>{rightAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type PageHeadingProps = {
  /** 大标题上方的英文小标签，如 "DAILY REMINDERS" */
  eyebrow?: string;
  /** 大标题 */
  title: string;
  /** 大标题下方的说明文字 */
  subtitle?: string;
  /** 标题右侧的插槽（如状态胶囊、翻页按钮） */
  right?: ReactNode;
  /** 右侧插槽的对齐方式：start 跟顶部对齐，end 跟底部对齐 */
  rightAlign?: 'start' | 'end';
  style?: StyleProp<ViewStyle>;
};

/**
 * 页面主标题块：eyebrow + 大标题 + 副标题（可选右侧插槽），各页面统一使用。
 */
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  right,
  rightAlign = 'start',
  style,
}: PageHeadingProps) {
  return (
    <View
      style={[
        headingStyles.container,
        rightAlign === 'end' && headingStyles.containerEnd,
        style,
      ]}
    >
      <View style={headingStyles.textGroup}>
        {eyebrow ? <Text style={headingStyles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={headingStyles.title}>{title}</Text>
        {subtitle ? <Text style={headingStyles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={headingStyles.right}>{right}</View> : null}
    </View>
  );
}

const navBarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  leftSlot: {
    minWidth: 56,
    alignItems: 'flex-start',
  },
  rightSlot: {
    minWidth: 56,
    alignItems: 'flex-end',
  },
  action: {
    paddingVertical: 8,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
});

const headingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  containerEnd: {
    alignItems: 'flex-end',
  },
  textGroup: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 5,
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  right: {
    marginLeft: 12,
  },
});
