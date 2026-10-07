# 008 - 深色模式 需求规格

## 产品定位

为 App 提供完整深色主题：夜间查看提醒不刺眼，OLED 设备省电。设置页已预留「主题」配置项（跟随系统 / 浅色 / 深色），本 spec 落地完整深色视觉。

## 现状与约束

- 视觉皮肤已收口在 `src/constants/theme.ts` 的 `SKIN` 语义层（palette + 语义分组），业务代码统一从 SKIN 取色、禁止硬编码色值——深色模式的实施面是「palette 按主题切换」，不需要逐组件改色。
- Android 原生弹窗色值在 `android/app/src/main/res/values/colors.xml` 的 `skin_*` 中镜像维护，换肤需同步。
- 设置页 `theme` 配置已存在（`system/light/dark`），保存深色时当前弹提示「完整深色主题将在视觉规范确定后启用」。

## 功能详述

### 1. 主题配置

- 设置页「主题」三选一：跟随系统（默认）/ 浅色 / 深色。
- 组件级 `StyleSheet` 在 bundle 求值时定型，不做运行时热切换：主题偏好持久化后，切换时走 `DevSettings.reload()`（dev）即时重载生效；release 环境提示重启后生效。
- 「跟随系统」在启动时经 `Appearance.getColorScheme()` 快照定型，系统深浅切换下次启动生效。

### 2. 深色配色（本次确认范围）

5 套候选深色方向（用户已从 AI 生成设计图中确认大方向，详见 research.md 与 HTML 原型）：

1. 经典紫夜 Material（#121212 底 / #1E1B2E 卡 / 主色提亮 #8B7CF7）
2. 深空靛蓝（#0F1226 底 / #191D36 卡 / 主色 #7C6CF0）
3. OLED 纯黑（#000000 底 / #111014 卡 / 主色保持 #6C5CE7）
4. 暖夜拿铁（#1A1714 暖底 / #262019 卡 / 暖紫 #A98BF0）
5. 高对比薰衣草（#17141F 底 / 亮薰衣草 #A78BFA）

### 3. 覆盖面

全部页面与弹窗：今日 / 计划 / 全部 / 设置 4 Tab、创建与编辑表单、空状态、铃声选择弹层、SkinAlert 弹窗（含删除确认 destructive 态）、闹钟详情抽屉。

## 非功能需求

- 对比度：正文文字与背景对比度 ≥ 4.5:1（WCAG AA）。
- 状态色（成功/警告/危险）在深色下整体提亮一档，保持语义可辨。
- 深浅切换不闪烁：首帧即按持久化主题渲染。

## 已确认设计决策

- 深色配色：方案 1 经典紫夜 Material（#121212 底 / #1E1B2E 卡 / 主色提亮 #8B7CF7），用户 2026-10-05 从 5 套候选中确认。
- 实施面严格收口：只改 `src/constants/theme.ts`（双 palette + `createSkin` 工厂 + 求值时定型）、alarm-ring 原生模块同步读写主题偏好、设置页加深色选项与切换重载、`_layout.tsx` StatusBar 自适应、`values-night/colors.xml` 原生弹窗镜像；所有页面结构与业务组件零改动，纯皮肤层。

## 验收标准

1. 设置页可选三档主题，深色下所有页面与弹窗无浅色残留（含 Android 原生弹窗）
2. 跟随系统时系统深色下启动 App 即为深色（下次启动生效的快照语义）
3. 全部页面文字对比度达标，禁用/弱化层级仍可区分
4. jest/tsc 通过，存量浅色视觉零变化

## 机制增补（2026-10-07 迭代项：日期弹窗跟随皮肤）

首版实现遗留一个边界：原生日历弹窗主题 `AppMaterialCalendarTheme` 的 parent 硬编码 `Theme.Material3.Light`（弹窗骨架永远浅色），且 `values-night` 资源限定符只跟随系统深色，感知不到 App 内「深色」强制偏好——「系统浅色 + App 深色」时弹窗为白色。本次修复：

- alarm-ring 模块新增 `syncNightMode()`：按持久化皮肤偏好调 `AppCompatDelegate.setDefaultNightMode`（dark→YES / light→NO / system→FOLLOW_SYSTEM），模块 `OnCreate` 启动同步一次、`setSkinTheme` 就地换肤后同步，Manifest 已声明 `uiMode` configChanges 不重建 Activity。入库于 `modules/alarm-ring/`（含 appcompat 1.7.0 依赖）。
- 新增 `android/app/src/main/res/values-night/styles.xml`：同名覆写 `AppMaterialCalendarTheme`（parent 改 `Theme.Material3.Dark`，颜色项复用 `@color/skin*` 夜间镜像）。⚠️ 该文件在 gitignore 的 `android/` 下不入库，与 `values/styles.xml` 的弹窗主题定制同属本地资产，prebuild 重新生成后需手工恢复。

## 后续扩展（不在本 spec 范围）

- 按分类的彩色强调主题、AMOLED 动态取色（Material You）
