# 006 - 产品整体重设计 技术设计

## 技术选型总览

| 决策点 | 结论 | 理由 |
|---|---|---|
| 视觉体系 | 沿用现有 Eva / UI Kitten token（`src/constants` COLORS），仅小幅补充缺失 token | 方案 0 基线（用户 2026-10-03 确认），零视觉迁移成本 |
| 导航方案 | expo-router 文件路由重排：`(tabs)` 下 4 Tab + create/edit 保持 Tab 外层 Stack 屏 | 现有结构已是 `(tabs)` + 外层表单页，改动最小；无新依赖 |
| 今日页数据 | 不新增存储；新建 `useTodayOverview` hook 复用 `computeNextRingDate` 与 calendar 服务实例计算，派生今日视图数据 | 需求要求复用现有日期规则，不新写一套 |
| create/edit 复用 | 抽 `AlarmForm` 组件，两页退化为薄壳 | 消除现有两份 370 行重复实现 |
| 组件组织 | `src/components` 按域拆子目录（common/today/plan/alarm-list/alarm-form） | 组件数量将翻三倍，按域组织优于平铺 |
| 筛选收纳状态 | 筛选行展开与否用组件本地 state；搜索/筛选/排序值维持现有 store 持久逻辑 | 展开态是纯 UI 态，无需持久化 |
| 倒计时刷新 | 轻量 `useNow(stepMs=60_000)` hook，驱动今日页重算 | 一分钟粒度足够「还有 X 小时 X 分」显示 |
| 数据模型 / 调度 | **零改动** | 需求红线，见 [001 design.md](../001-alarm-mvp/design.md) |
| 新依赖 | 无 | 全部用现有依赖（expo-router / zustand / date-fns / reanimated） |

## 目录结构（目标态）

```
alarm-app/
├── app/
│   ├── _layout.tsx                # 根 Stack（保持现状，加载字体/初始化）
│   ├── (tabs)/
│   │   ├── _layout.tsx            # Tabs：today(初始)/plan/all/settings
│   │   ├── today.tsx              # 今日（新首屏）
│   │   ├── plan.tsx               # 计划（原 calendar.tsx 迁入并重组头部）
│   │   ├── all.tsx                # 全部（原 index.tsx 迁入 + 筛选收纳）
│   │   └── settings.tsx           # 设置（原样迁入）
│   ├── create.tsx                 # 创建页（薄壳 → AlarmForm）
│   └── [id]/
│       └── edit.tsx               # 编辑页（薄壳 → AlarmForm）
└── src/
    ├── components/
    │   ├── common/                # PageHeader（现有）、FAB、EmptyState（新）
    │   ├── today/                 # NextRingCard、TodayTimeline、RhythmDots（新）
    │   ├── plan/                  # 日历视图相关组件（从 plan.tsx 拆出，拆分粒度实施时定）
    │   ├── alarm-list/            # AlarmCard（现有）、FilterBar（新：筛选收纳行）
    │   └── alarm-form/            # AlarmForm、FrequencySelector、CycleFields、OptionalFields（新）
    ├── hooks/                     # useTodayOverview、useNow（新）
    ├── store/                     # alarm-store、settings-store（不动的行为语义）
    ├── db/                        # schema、connection、repositories（零改动）
    ├── services/                  # scheduler、calendar、conflicts、notification（零改动）
    ├── utils/                     # date.ts（可新增周期天数差纯函数）+ 单测
    ├── types/                     # alarm.ts、settings.ts（零改动）
    └── constants/                 # COLORS 等现有常量；新增 token 仅限现有体系内补位
```

迁移说明：`(tabs)/index.tsx`、`(tabs)/calendar.tsx` 在内容迁入 `all.tsx`、`plan.tsx` 后删除；Tab 图标首版继续用字体符号。

## 数据模型

零改动。表结构（alarms / alarm_adjustments / settings）、字段、迁移逻辑均维持 [001 design.md](../001-alarm-mvp/design.md) 定义；「用药分类下线」的存量数据迁移（`migrateRemovedCategories`）保持现状。

## 导航结构

- `(tabs)/_layout.tsx` 使用 `<Tabs>`，`initialRouteName="today"`，四个 screen：today / plan / all / settings。
- create、edit 在 `(tabs)` 之外（`app/create.tsx`、`app/[id]/edit.tsx`），由根 Stack 承载，进入时天然无 Tab 栏，`router.back()` 返回来源 Tab，无额外状态机。
- 通知点击打开 App 的路由需在实施时核对 `src/services/notification.ts`：若 push `/`，落地页为今日 Tab，符合「看下一次」语义；无需为此改通知层。

## 状态管理

Store 行为语义零改动，仅视图派生新增：

- `useTodayOverview()`（hooks 层）：输入 alarm-store 列表 + settings，输出
  - `nextRing`: 距离现在最近的未来提醒（含倒计时文案所需原始值）
  - `todayItems`: 今天会响的提醒实例，升序，已响置灰标记
  - `greeting`: 「今天有 N 个提醒 / 今天没有提醒，下一个在 X 天后」
  - 计算全部委托 `computeNextRingDate`、calendar 服务与 `utils/date`，不在 hook 内新写日期规则；周期「第 X 天 / N 天」如需新纯函数，放 `utils/date.ts` 并补单测。
- `useNow(stepMs=60_000)`：`setInterval` 提供当前时间，组件卸载清理；仅今日页消费。
- 筛选收纳：`FilterBar` 本地 `useState<boolean>` 控制展开；搜索词、类型/分类筛选、排序值继续走现有 store 字段。

## 关键流程

### 今日页渲染

1. `useTodayOverview()` 派生数据；`useNow` 每分钟触发重算。
2. 顶部 PageHeading（日期 + 一句话状态）→ `NextRingCard`（时间大字号、标签、分类色、倒计时、`RhythmDots` 节奏点阵，点击进编辑）→ `TodayTimeline`（今日实例升序，点击进编辑，周期项左滑跳过一次复用现有调整逻辑）→ 空态用 `EmptyState` 引导。
3. FAB 进创建页。

### 创建 / 编辑（AlarmForm 主线化）

1. `AlarmForm({ initialAlarm?: Alarm })`：无 initialAlarm 为创建态，有则为编辑态（含删除按钮）。
2. 时间区（复用 TimePicker）+ `FrequencySelector` 四选项：就一次 / 每天 / 每周 / 每 N 天；**创建态默认选中「每 N 天」**；不向用户展示「核心」类标签（需求已确认口径）。
3. 选项切换映射现有数据模型：once → 清空重复字段；daily → `repeatType=daily`；weekly → 展开星期选择（WeekdaySelector）；cycle → 展开 `CycleFields`（间隔步进 + 偏移起始日，含「今天/明天开始」快捷项）。切换时清空不相关字段，与 nullable 字段一一对应。
4. 标签、分类、稍后提醒时长收进 `OptionalFields` 低权重区，均有默认值；**用户可见文案统一「稍后提醒」，内部 `snooze` 标识符不改**。
5. 保存：走现有 repository + `conflicts` 静默检测（冲突时弹确认）→ `scheduler` 重建调度。该链路逻辑不改，仅调用方换为 AlarmForm。
6. 编辑态额外：删除按钮（现有确认流程）、周期调整记录展示维持现有能力。

### 全部 Tab 筛选收纳

1. 默认渲染：排序后的卡片列表（下次响铃升序、暂停沉底）+ 头部一行「筛选 ▾ / 排序」胶囊。
2. 点开 `FilterBar` 展开搜索框、类型/分类筛选、排序选项；取值与持久化逻辑全部复用现有实现，只挪位置。
3. 卡片操作（跳过/加一次/复制/删除）保留现有交互与逻辑。

## 手势交互

沿用现有方案：列表左滑操作（周期跳过一次等）继续用 gesture-handler 现有实现；今日时间轴复用同一套滑动行为。不新增手势能力。

## 依赖清单

无新增依赖。现有依赖版本以 `package.json` 为准（expo ~56、expo-router ~56、zustand 5、date-fns 4、reanimated 4.3 等）。

## 风险与实施注意

- **通知落地路由**：核对 notification 点击路由目标，确保指向今日 Tab；不改通知层逻辑。
- **单测红线**：scheduler / calendar / conflicts / date 现有单测必须全过；utils 新增纯函数只增不改。
- **旧数据兼容**：四种类型 + 周期调整记录在新表单下打开必须回填正确（AlarmForm 从 initialAlarm 反推频率选项）。
- **tsc strict**：hooks 返回类型显式定义，无 any。

## 后续考虑

- 深色主题：token 体系已集中在 constants，留口子，本次不做。
- 计划页组件拆分粒度（month/week/day 视图组件化）视 plan.tsx 现状在实施任务中定，不阻塞本次骨架。
- 平板布局、全屏响铃等 004 P2 项继续搁置。
