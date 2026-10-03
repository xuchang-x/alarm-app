# 代码结构规范

> 本文档回答两个问题：**每个目录是做什么的**、**新代码应该放在哪里**。
> 目录现状由 006 产品重设计确立（4 Tab 信息架构 + 按域组件目录），详见 [006 design.md](../specs/006-product-redesign/design.md)。

## 总览

```
alarm-app/
├── app/                    # 路由层（expo-router 文件系统路由）：薄壳页面
├── src/
│   ├── components/         # UI 组件，按页面域分子目录
│   ├── hooks/              # 跨页面复用的 React hooks
│   ├── store/              # zustand 状态管理
│   ├── db/                 # SQLite 数据层（schema / 连接 / repository）
│   ├── services/           # 纯业务逻辑服务（调度 / 日历 / 冲突 / 通知）
│   ├── utils/              # 纯函数工具（日期等）
│   ├── types/              # TypeScript 类型定义
│   └── constants/          # 常量与视觉 token（COLORS 唯一来源）
├── .ai/                    # AI 知识库（specs / rules / skills / context）
└── .catpaw/                # CatPaw 工作区配置（skills 与 .ai/skills 同源）
```

## 分层规则

依赖方向自上而下单向流动：`app → components/hooks → store → services → db`。

- **app/ 只做三件事**：路由注册、页面级状态接线（store → 组件）、页面骨架（SafeAreaView / ScrollView）。
  业务逻辑一律下沉。页面超过 ~200 行就是信号，该拆组件了。
- **components/ 是纯展示层**：props 进、回调出，不直接读写 store（FAB/EmptyState 这类带默认路由的通用小组件除外）。
- **hooks/ 桥接数据与视图**：可以从 store/db 取数并派生（如 useTodayOverview），但日期规则必须委托 services/utils，不新写。
- **services/ 是纯逻辑**：不依赖 React，全部可单测（scheduler/calendar/conflicts 均有测试）。
- **constants/COLORS 是颜色唯一来源**：新色只能从现有体系派生（如 heroDivider 来自 primaryDark），不允许页面里写裸色值。

## app/ 目录（路由）

| 文件 | 职责 |
|---|---|
| `_layout.tsx` | 根 Stack：启动初始化（DB→通知→store）、通知响应处理、注册 create/[id]/edit |
| `(tabs)/_layout.tsx` | 4 Tab：today（初始）/ plan / all / settings |
| `(tabs)/today.tsx` | 今日页：NextRingCard + TodayTimeline 接线 |
| `(tabs)/plan.tsx` | 计划页：四视图日历薄壳 |
| `(tabs)/all.tsx` | 全部页：列表 + FilterBar 接线 |
| `(tabs)/settings.tsx` | 设置页 |
| `create.tsx` / `[id]/edit.tsx` | AlarmForm 薄壳（edit 多一个删除入口） |

页面命名 = Tab 名，别用 index.tsx 这类无语义名（历史教训：改名成本高）。

## src/components/ 目录（按域）

| 目录 | 放什么 | 不放什么 |
|---|---|---|
| `common/` | 跨页面复用：PageHeader（NavBar/PageHeading）、Fab、EmptyState | 只有一个页面用的东西 |
| `today/` | 今日页专属：NextRingCard、RhythmDots、TodayTimeline | — |
| `plan/` | 计划页专属：MonthView、TimelineView、AlarmDetailSheet、shared | — |
| `alarm-list/` | 全部页专属：AlarmCard、FilterBar | — |
| `alarm-form/` | 创建/编辑共用：AlarmForm（门面）+ FrequencySelector、CycleFields、OptionalFields、TimePicker、WeekdaySelector、CycleSettings | — |

**新增组件的判断顺序**：多个页面用 → `common/`；单个页面用 → 该页面域目录；随新页面出现就先建域目录。

## src/ 其余目录

| 目录 | 职责 | 关键约定 |
|---|---|---|
| `hooks/` | useNow（时间驱动）、useTodayOverview（今日页派生） | 派生逻辑抽纯函数放同文件导出，单测测纯函数（mock expo-sqlite 等原生模块） |
| `store/` | alarm-store（闹钟 CRUD + 调度联动）、settings-store | store 方法里完成「repo 写库 + 通知重排 + loadAlarms」三连，组件别拆开调 |
| `db/` | schema（含用药分类下线迁移）、alarm-repository、settings-repository | 只做 CRUD，不含业务规则 |
| `services/` | scheduler（响铃日期计算）、calendar（日历实例）、conflicts（冲突检测）、notification（通知调度） | 006 红线：这三个文件逻辑零改动 |
| `utils/` | date.ts：formatDate/today/getCycleRhythm/daysUntil 等纯函数 | 新日期规则先来这里 + 补单测 |
| `types/` | alarm.ts、settings.ts | 数据模型 006 红线：零改动 |
| `constants/` | COLORS、ALARM_CATEGORIES、DEFAULT_SNOOZE_MINUTES 等 | 视觉 token 仅体系内补位 |

## 术语与命名约定

- 用户可见文案用「稍后提醒」；代码内部标识符（snooze 字段、action、store 方法）保持 snooze 不动。
- 「用药」概念已全局下线，场景是排班 / 浇花等节奏提醒；存量分类数据迁移到「其他」。
- Git 提交：Angular 规范 + 中文 message（feat/refactor/docs/fix + scope）。

## 常见任务 → 改哪里

| 任务 | 入口 |
|---|---|
| 新页面/新 Tab | app/(tabs)/ 下新文件 + _layout.tsx 注册 |
| 新组件 | 先判断域（见上表），common 优先级最低 |
| 改视觉 | 只改 constants/COLORS 或组件样式，token 体系内派生 |
| 改日期/调度规则 | services/scheduler.ts + 补单测（红线：谨慎，影响通知正确性） |
| 新 hook | src/hooks/ + 同目录 __tests__/ |
