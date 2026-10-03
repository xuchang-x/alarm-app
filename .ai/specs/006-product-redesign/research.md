# 006 产品整体重设计 UI 开源样式调研

以下方案均来自公开源码仓库或官方设计系统页面。原型只借鉴设计语言和组件组织方式，不直接复制第三方产品页面。本调研服务于 006 的新信息架构（今日 / 计划 / 全部 / 设置 4 Tab、创建页「多久响一次」主线、周期提醒第一公民），原型共 4 套：**方案 0 是项目当前 Eva 风格基线**（用新信息架构渲染现有 token，验证「不换视觉、只重组逻辑」），方案 1~3 是新增调研方向。四套方案渲染同一组页面和同一组示例数据（排班、浇花等节奏场景），差异只来自视觉 token 和交互组织。

| # | 方案 | 开源来源 | 许可证 | 适配范围 | 适合本项目的原因 |
|---:|---|---|---|---|---|
| 0 | 当前风格基线 · Eva / UI Kitten | [github.com/akveo/react-native-ui-kitten](https://github.com/akveo/react-native-ui-kitten) | MIT | React Native（002 spec 已确认，代码中为 COLORS token） | 零迁移成本：现有 token（浅色暖灰 #F7F5FC + 白卡 + 紫 #6C5CE7）直接渲染新信息架构，验证不换视觉只重组逻辑的产品效果，为新方案提供基线参照 |
| 1 | Material 3 / React Native Paper | [github.com/callstack/react-native-paper](https://github.com/callstack/react-native-paper) | MIT | React Native，可直接使用 | 大圆角卡片与 tonal surface 能把「下一次响铃」主卡片推到第一层级；FAB、分段控件、开关都是现成组件，迁移成本最低；与现有 Expo 技术栈直接兼容 |
| 2 | Tamagui | [github.com/tamagui/tamagui](https://github.com/tamagui/tamagui) | MIT | React Native / 跨端，可直接使用 | token 驱动的极简中性风（黑白 + 青绿强调、细边框、小圆角），信息密度高，适合把「节奏数据」做成紧凑的仪表盘感；设计 token 体系与 006「Token 单一来源」要求天然对齐 |
| 3 | Ionic Framework | [github.com/ionic-team/ionic-framework](https://github.com/ionic-team/ionic-framework) | MIT | Web/混合应用（本项目作为**视觉参考**，不直接安装） | 靛蓝 + 大圆角 + 柔和阴影的移动原生亲和感，分段控件和底部 Tab 是移动用户最熟悉的模式；iOS 式分段控件适合「计划」页的视图切换 |

## 套用到当前项目后的方向

0. **当前风格基线（Eva / UI Kitten）**：浅色暖灰底 + 白色圆角卡片 + 紫主色，直接取自 `src/constants/index.ts` 的 COLORS；「下一次响铃」用 primarySoft 紫底浅卡 + 深紫文字表达，节奏点阵用主色。零视觉迁移成本，只重组信息架构。
1. **Material 3 方向（紫）**：暖白底，大面积 28px 圆角的 tonal surface 卡片；「下一次响铃」用主色填充卡（紫底白字）+ 超大时间字号 + 倒计时副文案；周期节奏用进度条式的「第 X 天 / N 天」点阵。整体表达力强、亲和，适合强调「节奏感」。
2. **Tamagui 方向（青绿极简）**：纯白底 + 细灰边框 + 12px 小圆角，数据和层级靠字重与留白表达；「下一次响铃」是超大衬线感时间数字 + 单行倒计时；周期节奏用「2/4」分数式极简标记。整体冷静、工具感强，适合信息密度优先。
3. **Ionic 方向（靛蓝圆润）**：浅靛灰底 + 白色 18px 圆角浮层 + 柔和长阴影；「下一次响铃」用渐变靛蓝卡 + 胶囊倒计时；Tab 与分段控件是经典 iOS 模式。整体圆润友好，学习成本最低。

## 推荐观察点

- **基线参照**：方案 0 保留了现有视觉，是「产品重设计但视觉不动」的选项；选它意味着 006 只做信息架构与交互重构，视觉 token 沿用。
- **核心业务差异化**：四套的「每 N 天」节奏表达分别是基线紫点阵、Material 点阵、Tamagui 分数式标记、Ionic 胶囊标签，重点比较哪个一眼能看懂「4 天周期，今天第 2 天」。
- **信息层级**：今日页从上到下应是 日期 → 下一次响铃（最大）→ 今日时间轴 → 管理操作，检查哪套层级最不容易误读。
- **迁移成本**：基线和 Material 3（React Native Paper）、Tamagui 可直接用于 React Native；Ionic 是 Web 框架，只能借鉴视觉语言，实现时用 RN 组件重画，成本略高。
- **与现有 token 的距离**：基线零距离；Material 3 与现有 Eva 浅紫最接近（迁移最快）；与 Tamagui 最远（视觉变化最大）。

## 当前选定

- **已选定：方案 0 当前风格基线（Eva / UI Kitten）**，2026-10-03 用户确认。
- 含义：006 只做信息架构与交互重构（4 Tab、今日页、创建主线化、附加功能收纳），视觉 token 沿用 `src/constants/index.ts` 现有 COLORS，不引入新设计体系；原型中 hero 卡（primarySoft 浅紫底 + 深紫字）与节奏点阵作为现有 token 体系内的补充用法。
