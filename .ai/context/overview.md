# 项目总览

## 基本信息

- **项目名称**: Alarm App
- **定位**: 个人提醒工具，支持「间隔 X 天提醒一次」等周期性提醒
- **目标用户**: 个人 / 身边熟人
- **开发者**: xuchang-x（服务端背景，首次开发移动端 App）

## 技术栈

- **框架**: Expo SDK 56（日常 Expo 工作流，通知验证走 Android dev build）
- **UI 运行时**: React Native 0.85
- **语言**: TypeScript (strict mode)
- **平台**: iOS / Android

## 关键决策

- 不做原生闹钟（iOS 系统限制 + 原生开发成本高），定位为**定时提醒工具**
- 使用 `expo-notifications` 实现本地通知推送
- 通知功能在 Expo Go 中不可用（代码 try-catch 静默降级），需 dev build 验证 → `android/` 原生工程已落地，构建环境见 [2026-10-3-Android构建环境.md](../../docs/dev-knowledge/2026-10-3-Android构建环境.md)
- 日常开发仍走 Expo 工作流，原生目录仅在构建 dev build 时使用
