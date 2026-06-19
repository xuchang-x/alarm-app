# 项目总览

## 基本信息

- **项目名称**: Alarm App
- **定位**: 个人提醒工具，支持「间隔 X 天提醒一次」等周期性提醒
- **目标用户**: 个人 / 身边熟人
- **开发者**: xuchang-x（服务端背景，首次开发移动端 App）

## 技术栈

- **框架**: Expo SDK 56 (Managed Workflow)
- **UI 运行时**: React Native 0.85
- **语言**: TypeScript (strict mode)
- **平台**: iOS / Android

## 关键决策

- 不做原生闹钟（iOS 系统限制 + 原生开发成本高），定位为**定时提醒工具**
- 使用 `expo-notifications` 实现本地通知推送
- Managed Workflow，不涉及原生代码，降低开发门槛
