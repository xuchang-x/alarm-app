# 架构设计

## 项目结构

采用 expo-router 文件系统路由，页面放在 `app/` 目录，业务逻辑放在 `src/` 目录：

```
alarm-app/
├── app/                        # expo-router 路由页面
│   ├── _layout.tsx             # 根布局（Stack 导航）
│   ├── index.tsx               # 首页 = 闹钟列表
│   ├── create.tsx              # 创建闹钟页
│   └── [id]/
│       └── edit.tsx            # 编辑闹钟页（动态路由）
├── src/                        # 业务逻辑
│   ├── components/             # UI 组件
│   ├── store/                  # Zustand 状态管理
│   ├── db/                     # SQLite 数据库层
│   ├── services/               # 通知调度等服务
│   ├── hooks/                  # 自定义 Hooks
│   ├── utils/                  # 工具函数
│   ├── types/                  # TypeScript 类型定义
│   └── constants/              # 常量
├── assets/                     # 静态资源（图标、启动图等）
├── .ai/                        # AI 知识体系
│   ├── context/                # 项目上下文（项目是什么）
│   ├── rules/                  # 编码规范（代码怎么写）
│   ├── commands/               # 可复用工作流指令
│   └── specs/                  # 需求规格（要做什么功能）
└── .github/                    # GitHub 协作模板
```

## 数据存储方案

使用 expo-sqlite 进行本地结构化存储。闹钟数据天然适合关系型模型（主表 + 调整表），SQL 查询和事务支持比 KV 存储更合适。

## 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| expo | ~56.0.12 | 框架 |
| react-native | 0.85.3 | UI 运行时 |
| expo-router | SDK 56 内置 | 文件系统路由 |
| expo-notifications | 待安装 | 本地通知推送 |
| expo-sqlite | 待安装 | 本地数据库 |
| zustand | 待安装 | 状态管理 |
| date-fns | 待安装 | 日期计算 |
| react-native-gesture-handler | SDK 56 内置 | 手势交互 |
| react-native-reanimated | SDK 56 内置 | 动画 |
