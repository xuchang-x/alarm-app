# 架构设计

## 项目结构

```
alarm-app/
├── App.tsx                # 应用入口组件
├── index.ts               # 注册入口
├── app.json               # Expo 配置
├── package.json           # 依赖管理
├── tsconfig.json          # TypeScript 配置
├── assets/                # 静态资源（图标、启动图等）
├── src/                   # 源码目录（待创建）
│   ├── screens/           # 页面组件
│   ├── components/        # 通用组件
│   ├── hooks/             # 自定义 Hooks
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型定义
│   ├── constants/         # 常量
│   └── storage/           # 数据持久化
├── .ai/                   # AI 知识体系
│   ├── context/           # 项目上下文（项目是什么）
│   ├── rules/             # 编码规范（代码怎么写）
│   └── specs/             # 需求规格（要做什么功能）
└── .github/               # GitHub 协作模板
```

## 数据存储方案

待定。候选方案：
- AsyncStorage（轻量 KV 存储）
- expo-sqlite（结构化数据）

## 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| expo | ~56.0.12 | 框架 |
| react-native | 0.85.3 | UI 运行时 |
| expo-notifications | 待安装 | 本地通知推送 |
