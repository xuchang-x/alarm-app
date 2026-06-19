# Alarm App — 软件设计文档 (SDD)

## 1. 概述

**项目名称**: Alarm App  
**定位**: 一款基于 Expo + React Native 的个人提醒工具，支持「间隔 X 天提醒一次」等周期性提醒。  
**目标用户**: 个人 / 身边熟人  
**技术栈**: Expo SDK 56 · React Native · TypeScript  
**平台**: iOS / Android（Managed Workflow）

## 2. 功能需求（待定）

> 具体功能需求待讨论后补充。以下为初步方向：

- 提醒管理（创建 / 编辑 / 删除）
- 周期性提醒（间隔 N 天）
- 通知推送（expo-notifications）
- _更多功能待定..._

## 3. 技术架构

### 3.1 项目结构（规划）

```
alarm-app/
├── App.tsx              # 应用入口
├── app.json             # Expo 配置
├── index.ts             # 注册入口
├── package.json
├── tsconfig.json
├── assets/              # 静态资源（图标等）
├── src/                 # 源码目录（待创建）
│   ├── screens/         # 页面
│   ├── components/      # 通用组件
│   ├── hooks/           # 自定义 Hooks
│   ├── utils/           # 工具函数
│   ├── types/           # TypeScript 类型定义
│   └── constants/       # 常量
└── SDD.md               # 本文档
```

### 3.2 核心依赖

| 依赖 | 用途 |
|------|------|
| expo ~56.0.12 | 框架 |
| react-native 0.85.3 | UI 运行时 |
| expo-notifications | 本地通知推送（待安装） |
| _待补充..._ | _根据需求确定_ |

### 3.3 数据存储方案（待定）

- 本地存储：AsyncStorage / expo-sqlite（待定）
- 数据模型：待设计

## 4. 非功能需求

- 支持 iOS 和 Android 双平台
- Managed Workflow，不涉及原生代码
- 轻量、简洁，注重实用

## 5. 里程碑

| 阶段 | 内容 | 状态 |
|------|------|------|
| M0 | 项目初始化 & SDD & Git | ✅ 完成 |
| M1 | MVP 核心功能 | 待定 |
| M2 | 优化 & 完善 | 待定 |

## 6. 变更记录

| 日期 | 内容 |
|------|------|
| 2026-06-19 | 初始化项目，创建 SDD 骨架 |
