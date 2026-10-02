# 002 闹钟 UI 开源样式调研

以下 15 套方案均来自公开源码仓库，原型只借鉴它们的设计语言和组件组织方式，不直接复制第三方产品页面。标注为「跨端参考」的方案不是当前 Expo React Native 的直接依赖候选，主要用于补充视觉方向。

| # | 方案 | 开源来源 | 许可证 | 适配范围 | 适合本项目的原因 |
|---:|---|---|---|---|---|
| 1 | Material 3 / React Native Paper | [callstack/react-native-paper](https://github.com/callstack/react-native-paper) | MIT | React Native | 分段按钮、卡片、开关、FAB 成熟，适合快速重做现有页面 |
| 2 | Eva / UI Kitten | [akveo/react-native-ui-kitten](https://github.com/akveo/react-native-ui-kitten) | MIT | React Native | 主题 token 清晰，圆角卡片和状态色适合区分提醒类型 |
| 3 | Tamagui | [tamagui/tamagui](https://github.com/tamagui/tamagui) | MIT | React Native / Web | 强调 token、层级和跨端一致性，适合沉淀项目自己的视觉系统 |
| 4 | gluestack-ui | [gluestack/gluestack-ui](https://github.com/gluestack/gluestack-ui) | MIT | React Native / Web | 中性底色、柔和阴影、可组合组件，适合信息密度适中的提醒列表 |
| 5 | React Native UI Lib | [wix/react-native-ui-lib](https://github.com/wix/react-native-ui-lib) | MIT | React Native | 更偏效率工具和仪表盘，适合突出下次响铃、分组和快捷操作 |
| 6 | RNEUI | [react-native-elements/react-native-elements](https://github.com/react-native-elements/react-native-elements) | MIT | React Native | 卡片和列表基础件成熟，适合低迁移成本地增加主操作色 |
| 7 | Fluent UI React Native | [microsoft/fluentui-react-native](https://github.com/microsoft/fluentui-react-native) | MIT | React Native | 中性灰阶、清晰状态和规整面板，适合可靠的效率工具感 |
| 8 | Ant Design React Native | [ant-design/ant-design-mobile-rn](https://github.com/ant-design/ant-design-mobile-rn) | MIT | React Native | 表单、分组、反馈态清晰，适合创建/编辑闹钟流程 |
| 9 | NativeWind | [nativewind/nativewind](https://github.com/nativewind/nativewind) | MIT | React Native | utility-first 的间距和颜色组合，适合高对比、紧凑的工具界面 |
| 10 | Ionic Framework | [ionic-team/ionic-framework](https://github.com/ionic-team/ionic-framework) | MIT | 跨端移动 Web | 移动优先的导航、列表和圆润浮层，可借鉴完整工具入口布局 |
| 11 | Framework7 | [framework7io/framework7](https://github.com/framework7io/framework7) | MIT | 跨端移动 Web | 列表优先、信息密度高，适合闹钟数量较多的管理场景 |
| 12 | Onsen UI | [OnsenUI/OnsenUI](https://github.com/OnsenUI/OnsenUI) | Apache-2.0 | 跨端移动 Web | 轻量、细线、低干扰，适合日常提醒工具 |
| 13 | NativeBase | [GeekyAnts/NativeBase](https://github.com/GeekyAnts/NativeBase) | MIT | React Native | 暗色表面和层级卡片可作为当前主题的另一种强化方式 |
| 14 | Chakra UI | [chakra-ui/chakra-ui](https://github.com/chakra-ui/chakra-ui) | MIT | Web 参考 | 柔和色板、超大圆角和 token 组织适合探索品牌化方向 |
| 15 | Radix Themes | [radix-ui/themes](https://github.com/radix-ui/themes) | MIT | Web 参考 | 细边框、清晰状态和无障碍取向适合高可读性方案 |

## 套用到当前项目后的 15 套方向

1. **Paper / Material 3**：深色表面 + 紫蓝主色；顶部 App Bar；卡片和 FAB；创建页用分段控件。
2. **UI Kitten / Eva**：浅色暖灰底 + 紫色主色；状态色标签；圆角大卡片；创建页采用分组设置块。
3. **Tamagui / Token Minimal**：中性黑白底 + 青绿色强调；信息压缩到清晰的行级层级。
4. **gluestack-ui / Soft Utility**：浅灰背景 + 白色浮层；胶囊筛选和轻阴影。
5. **React Native UI Lib / Focus Dashboard**：深海军蓝 + 青色强调；按响铃时间排列的时间线。
6. **RNEUI / Blue Orange**：浅蓝面板 + 橙色操作色；卡片操作更突出。
7. **Fluent / Structured Desk**：中性灰阶 + 蓝色状态；面板规整，适合可靠的效率工具。
8. **Ant Design / Warm Form**：暖白底 + 红色主按钮；表单分组和反馈态清楚。
9. **NativeWind / Utility Dark**：石墨黑底 + 荧光绿；高对比、少装饰、快速扫读。
10. **Ionic / Indigo Mobile**：靛蓝背景 + 圆润浮层；强调移动导航和入口感。
11. **Framework7 / Dense List**：深蓝列表 + 红色强调；适合管理较多闹钟。
12. **Onsen / Light Calm**：白底细线 + 青绿色；轻量、低干扰。
13. **NativeBase / Amber Dark**：炭黑表面 + 琥珀色；延续暗色但更温暖。
14. **Chakra / Soft Brand**：淡紫背景 + 粉色主色；超大圆角和品牌感。
15. **Radix / Quiet Contrast**：白底细边框 + 紫色强调；克制、清晰、状态可读。

## 观察建议

- 优先低成本落地：1、5、6、7、8、13。
- 优先突出周期提醒：3、5、7、10、13、15。
- 优先视觉亲和力：2、4、8、10、12、14。
- 优先信息密度和闹钟数量管理：7、9、11、15。
- 直接用于 Expo React Native 的候选优先看 1~9、13；10~12、14~15 作为跨端视觉参考。
