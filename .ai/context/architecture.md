# 架构设计

## 项目结构

采用 expo-router 文件系统路由，页面放在 `app/` 目录，业务逻辑放在 `src/` 目录：

```
alarm-app/
├── app/                        # expo-router 路由页面
│   ├── _layout.tsx             # 根布局（Stack 导航）
│   ├── (tabs)/                 # 底部 4 Tab（006 目标态：today 初始/plan/all/settings）
│   │   ├── _layout.tsx
│   │   ├── today.tsx           # 今日（下一次响铃 + 时间轴）
│   │   ├── plan.tsx            # 计划（日历视图）
│   │   ├── all.tsx             # 全部（管理列表 + 筛选收纳）
│   │   └── settings.tsx        # 设置
│   ├── create.tsx              # 创建提醒（薄壳 → AlarmForm）
│   └── [id]/
│       └── edit.tsx            # 编辑提醒（薄壳 → AlarmForm）
├── src/                        # 业务逻辑
│   ├── components/             # UI 组件（按域分目录：common/today/plan/alarm-list/alarm-form）
│   ├── hooks/                  # 自定义 Hooks（useTodayOverview、useNow）
│   ├── store/                  # Zustand 状态管理
│   ├── db/                     # SQLite 数据库层
│   ├── services/               # 通知调度等服务
│   ├── utils/                  # 工具函数
│   ├── types/                  # TypeScript 类型定义
│   └── constants/              # 常量（COLORS token 单一来源）
├── assets/                     # 静态资源（图标、启动图等）
├── docs/dev-knowledge/         # 给人看的开发知识（构建环境等）
├── .ai/                        # AI 知识体系
│   ├── context/                # 项目上下文（项目是什么）
│   ├── rules/                  # 编码规范（代码怎么写）
│   ├── skills/                 # 可复用工作流（与 .catpaw/skills 同源）
│   └── specs/                  # 需求规格（要做什么功能）
└── .github/                    # GitHub 协作模板
```

> 注：以上为 006 重构目标态；当前实施进度以 [006 design.md](../specs/006-product-redesign/design.md) 为准。

## 数据存储方案

使用 expo-sqlite 进行本地结构化存储。闹钟数据天然适合关系型模型（主表 + 调整表），SQL 查询和事务支持比 KV 存储更合适。

## 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| expo | ~56.0.12 | 框架 |
| react-native | 0.85.3 | UI 运行时 |
| expo-router | ~56.2.11 | 文件系统路由 |
| expo-notifications | ~56.0.18 | 本地通知推送 |
| expo-sqlite | ~56.0.5 | 本地数据库 |
| zustand | ^5.0.14 | 状态管理 |
| date-fns | ^4.4.0 | 日期计算 |
| react-native-gesture-handler | ~2.31.1 | 手势交互 |
| react-native-reanimated | ~4.3.1 | 动画 |
| react-native-screens / safe-area-context / worklets | SDK 56 | 导航与布局配套 |
