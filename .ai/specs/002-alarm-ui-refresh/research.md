# 002 闹钟 UI 开源样式调研

以下 5 套方案均来自公开源码仓库，原型只借鉴它们的设计语言和组件组织方式，不直接复制第三方产品页面。

| 方案 | 开源来源 | 许可证 | 适合本项目的原因 |
|---|---|---|---|
| Material 3 / React Native Paper | [callstack/react-native-paper](https://github.com/callstack/react-native-paper) | MIT | 分段按钮、卡片、开关、FAB 组件成熟，适合快速重做现有页面 |
| Eva / UI Kitten | [akveo/react-native-ui-kitten](https://github.com/akveo/react-native-ui-kitten) | MIT | 主题 token 清晰，圆角卡片和状态色适合区分不同提醒类型 |
| Tamagui | [tamagui/tamagui](https://github.com/tamagui/tamagui) | MIT | 强调 token、层级和跨端一致性，适合沉淀项目自己的视觉系统 |
| gluestack-ui | [gluestack/gluestack-ui](https://github.com/gluestack/gluestack-ui) | MIT | 中性底色、柔和阴影、可组合组件，适合信息密度适中的提醒列表 |
| React Native UI Lib | [wix/react-native-ui-lib](https://github.com/wix/react-native-ui-lib) | MIT | 更偏效率工具和仪表盘，适合突出下次响铃、分组和快捷操作 |

## 套用到当前项目后的 5 套方向

1. **Paper / Material 3**：深色表面 + 紫蓝主色；顶部 App Bar；卡片和 FAB；创建页用分段控件。
2. **UI Kitten / Eva**：浅色暖灰底 + 紫色主色；状态色标签；圆角大卡片；创建页采用分组设置块。
3. **Tamagui / Token Minimal**：中性黑白底 + 青绿色强调；信息压缩到清晰的行级层级；适合追求简洁和可扩展 token。
4. **gluestack-ui / Soft Utility**：浅灰背景 + 白色浮层；胶囊筛选和轻阴影；适合更轻、更亲和的工具感。
5. **React Native UI Lib / Focus Dashboard**：深海军蓝 + 青色强调；按响铃时间排列的时间线；突出周期闹钟下次日期和快捷操作。

## 推荐观察点

- 如果优先考虑和当前代码的迁移成本：先看 1、5。
- 如果优先考虑视觉亲和力：先看 2、4。
- 如果优先考虑后续扩展和设计 token：先看 3。
- 周期闹钟的差异化信息在 1、3、5 中最容易被看见。
