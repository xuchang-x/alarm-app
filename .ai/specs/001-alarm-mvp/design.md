# 001 - 闹钟 MVP 技术设计

本文档基于 [需求规格](./requirements.md) 和 [交互原型](./prototype/index.html)，定义 MVP 的技术实现方案。

## 技术选型总览

| 领域 | 选型 | 说明 |
|------|------|------|
| 导航 | expo-router | 文件系统路由，自动 deep linking，Expo 官方推荐 |
| 状态管理 | Zustand | 轻量、支持组件外调用（通知回调场景需要） |
| 数据存储 | expo-sqlite | 闹钟数据为结构化数据，适合 SQL 查询和事务 |
| 日期处理 | date-fns | 按需引入、tree-shaking 友好，不像 dayjs/moment 全量打包 |
| 手势交互 | react-native-gesture-handler + react-native-reanimated | 列表左滑操作（删除/跳过/加一次），Expo SDK 56 内置 |
| 通知推送 | expo-notifications | 本地通知，MVP 阶段 Android 优先 |

## 目录结构

采用 expo-router 文件系统路由，页面放在 `app/` 目录下，业务逻辑放在 `src/` 下：

```
alarm-app/
├── app/                        # expo-router 路由页面
│   ├── _layout.tsx             # 根布局（Stack 导航）
│   ├── index.tsx               # 首页 = 闹钟列表
│   ├── create.tsx              # 创建闹钟页
│   └── [id]/
│       └── edit.tsx            # 编辑闹钟页（动态路由）
├── src/
│   ├── components/             # UI 组件
│   │   ├── AlarmCard.tsx       # 闹钟卡片（含左滑操作）
│   │   ├── TimePicker.tsx      # 时间选择器
│   │   ├── WeekdaySelector.tsx # 星期选择器
│   │   └── CycleSettings.tsx   # 周期设置组件
│   ├── store/
│   │   └── alarm-store.ts      # Zustand store
│   ├── db/
│   │   ├── schema.ts           # 建表语句
│   │   ├── connection.ts       # 数据库连接
│   │   └── alarm-repository.ts # CRUD 操作
│   ├── services/
│   │   ├── notification.ts     # 通知调度服务
│   │   └── scheduler.ts        # 周期计算引擎
│   ├── hooks/
│   │   └── useAlarms.ts        # 闹钟列表 Hook
│   ├── utils/
│   │   └── date.ts             # 日期工具函数
│   ├── types/
│   │   └── alarm.ts            # 类型定义
│   └── constants/
│       └── index.ts            # 常量
├── assets/                     # 静态资源
└── .ai/                        # AI 知识体系
```

## 数据模型

### 闹钟表 (alarms)

```sql
CREATE TABLE IF NOT EXISTS alarms (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL CHECK(type IN ('once', 'daily', 'weekly', 'cycle')),
  hour          INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
  minute        INTEGER NOT NULL CHECK(minute >= 0 AND minute <= 59),
  label         TEXT NOT NULL DEFAULT '',
  enabled       INTEGER NOT NULL DEFAULT 1,

  -- once 专用
  once_date     TEXT,              -- ISO 日期 'YYYY-MM-DD'

  -- weekly 专用
  weekdays      TEXT,              -- JSON 数组 '[1,3,5]'（1=周一，7=周日）

  -- cycle 专用
  interval_days INTEGER,           -- 间隔天数
  start_date    TEXT,              -- 起始日期 'YYYY-MM-DD'

  -- 稍后提醒
  snooze_minutes INTEGER NOT NULL DEFAULT 10,

  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

设计说明：四种类型共用一张表，通过 `type` 字段区分，各类型专属字段允许 NULL。这样做的好处是查询简单、不需要 JOIN，闹钟数量级很小（通常几十个），不需要分表优化。

### 闹钟调整表 (alarm_adjustments)

```sql
CREATE TABLE IF NOT EXISTS alarm_adjustments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  alarm_id  INTEGER NOT NULL REFERENCES alarms(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK(type IN ('skip', 'add')),
  date      TEXT NOT NULL,        -- 跳过/加一次的目标日期 'YYYY-MM-DD'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

跳过和临时加一次记录在调整表中，调度器计算响铃日期时查询此表过滤/追加。

## ID 生成策略

闹钟 ID 使用 SQLite 自增主键（`INTEGER PRIMARY KEY AUTOINCREMENT`）。理由：闹钟数据纯本地，不需要分布式唯一性；自增 ID 简单直接，查询排序方便。

通知 ID 格式为 `alarm-{alarmId}-{YYYYMMDD}`（如 `alarm-3-20250626`），确保唯一性且可反查所属闹钟。取消特定闹钟的通知时，按 `alarm-{alarmId}-` 前缀匹配批量取消。

## 通知调度方案

详见 [周期闹钟通知调度方案](./notification-scheduling.md)。

核心策略：创建/修改闹钟时**批量预调度未来 90 天**的通知，App 启动时检查并补充。MVP 先做 Android，不受 iOS 64 条限制。

### 各类型调度逻辑

**一次性闹钟**：调度 1 条 date trigger 通知。响铃后标记 `enabled = 0`。

**每天重复**：使用 expo-notifications 的 daily trigger，只需 1 条。

**按星期重复**：使用 weekly trigger，每个勾选的星期创建 1 条（最多 7 条）。

**按间隔周期**：计算从 `start_date` 开始、间隔 `interval_days` 的所有日期，在 90 天范围内批量创建 date trigger。创建前查询 `alarm_adjustments` 表：skip 日期剔除、add 日期追加。

### 稍后提醒（贪睡）

通知响起后，用户可选择「稍后提醒」。实现方式：点击通知上的 action button → App 收到 notification response → 立即调度一条 `snooze_minutes` 分钟后的一次性通知。

通知 action 配置：

```typescript
Notifications.setNotificationCategoryAsync('alarm', [
  { identifier: 'snooze', buttonTitle: '稍后提醒', options: { opensAppToForeground: false } },
  { identifier: 'dismiss', buttonTitle: '关闭', options: { isDestructive: true } },
]);
```

## 状态管理

使用 Zustand 管理闹钟列表状态。选择 Zustand 而不是 Context 的关键理由：**通知回调（notification response handler）运行在组件树之外**，无法使用 React Context，但 Zustand store 可以在任何地方 import 调用。

```typescript
// store/alarm-store.ts 核心结构
interface AlarmStore {
  alarms: Alarm[];
  loading: boolean;
  loadAlarms: () => Promise<void>;
  createAlarm: (input: CreateAlarmInput) => Promise<void>;
  updateAlarm: (id: number, input: UpdateAlarmInput) => Promise<void>;
  deleteAlarm: (id: number) => Promise<void>;
  toggleAlarm: (id: number) => Promise<void>;
  skipNext: (id: number) => Promise<void>;
  addOnce: (id: number, date: string) => Promise<void>;
}
```

数据流：UI 操作 → Zustand action → 写 SQLite → 重新调度通知 → 更新 store state → UI 响应。

## 导航结构

使用 expo-router 的 Stack 导航：

```
/            → 闹钟列表（首页）
/create      → 创建闹钟
/[id]/edit   → 编辑闹钟
```

expo-router 的优势：文件即路由，自动生成 deep linking（通知点击可直接跳转到编辑页），TypeScript 类型安全的路由参数。

## 手势交互

闹钟卡片支持左滑操作，使用 react-native-gesture-handler + react-native-reanimated 实现：

**启用状态的周期闹钟**（左滑最大距离 168px，3 个按钮）：跳过一次、加一次、删除。

**其他闹钟**（左滑最大距离 64px，1 个按钮）：删除。

开关操作使用卡片内的 Switch 组件，不通过滑动触发。

## 关键流程

### 创建闹钟

1. 用户进入创建页，选择闹钟类型
2. 根据类型展示对应设置项（时间选择器 + 类型专属设置）
3. 点击保存 → 写入 SQLite → 计算通知日期 → 批量调度通知 → 返回列表

### App 启动

1. 注册 notification response handler（处理稍后提醒/关闭操作）
2. 从 SQLite 加载闹钟列表到 Zustand store
3. 检查每个启用闹钟的已调度通知是否覆盖未来 90 天 → 不足则补充

### 通知响起

1. 系统展示通知（带「稍后提醒」和「关闭」按钮）
2. 用户点击「稍后提醒」→ 调度 N 分钟后的一次性通知
3. 用户点击通知本身 → 打开 App → 跳转到对应闹钟
4. 一次性闹钟响铃后 → 自动置为 `enabled = 0`

## 依赖清单

```json
{
  "expo-router": "SDK 56 内置",
  "expo-notifications": "本地通知",
  "expo-sqlite": "本地数据库",
  "zustand": "状态管理",
  "date-fns": "日期计算",
  "react-native-gesture-handler": "SDK 56 内置",
  "react-native-reanimated": "SDK 56 内置"
}
```

需要额外安装的依赖：`zustand`、`date-fns`、`expo-sqlite`、`expo-notifications`。
`react-native-gesture-handler` 和 `react-native-reanimated` 已随 Expo SDK 56 内置。
`expo-router` 是 Expo SDK 56 的默认路由方案。

## 后续考虑（不在 MVP 范围）

- iOS 适配：通知 64 条限制需切换为混合调度策略
- 全屏响铃界面：需 dev client 或 bare workflow
- 自定义铃声：需将音频文件打包到 native 层
- 数据导出/备份
