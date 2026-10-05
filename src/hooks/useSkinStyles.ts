import { useMemo } from 'react';
import type { StyleSheet } from 'react-native';
import { useSkinStore } from '@/store/skin-store';

/**
 * 订阅皮肤主题版本的样式表 hook。
 *
 * 模块级 StyleSheet.create 会在求值时冻结 SKIN 色值，主题切换后不会更新；
 * 把 createStyles 传进来，主题版本变化时自动重建样式表，组件随订阅重渲染。
 *
 * 用法：
 *   function createStyles() { return StyleSheet.create({ ... }); }
 *   function Foo() {
 *     const styles = useSkinStyles(createStyles);
 *     ...
 *   }
 */
export function useSkinStyles<T extends StyleSheet.NamedStyles<T>>(create: () => T): T {
  const version = useSkinStore((state) => state.version);
  return useMemo(() => create(), [version]);
}
