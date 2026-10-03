# 006 - 产品整体重设计 任务拆分

基于 [需求规格](./requirements.md)、[技术设计](./design.md) 拆分的开发任务清单。

拆分方式：混合拆（核心链路细拆、简单迁移粗拆），核心新逻辑配单测；每个任务以「tsc 零错误 + 现有单测全过」为内建完成标准，不再逐任务重复写。

## 任务依赖关系

```
T1 导航骨架（4 Tab 重排）
├── T4 common 组件整理 ────┐
├── T8 计划页迁移/重组      │
├── T7 全部页收纳重组 ──────┤
│                          ▼
├── T2 useNow + 日期纯函数+单测
│    └── T3 useTodayOverview+单测
│         └── T5 今日页（NextRingCard/TodayTimeline）
│
└── T6 AlarmForm 组件链（独立，可与 T2~T5 并行）
         │
         ▼
T9 收尾联调（tsc + 全量单测 + 构建装机 + 旧数据回填验证）
```

可并行组：T2 与 T4/T6/T7/T8；T3 与 T6/T7/T8。

## 任务清单

### T1 导航骨架：4 Tab 重排

**目标**：底部导航变为 今日/计划/全部/设置，today 为初始页，create/edit 仍在 Tab 外层，应用可正常运行。
**产出**：`(tabs)/_layout.tsx` 重写（initialRouteName="today"）；新建 `(tabs)/today.tsx` 占位页；`(tabs)/calendar.tsx` → `plan.tsx`、`(tabs)/index.tsx` → `all.tsx` 改名迁移（内容暂原样）；settings.tsx 保持；核对 `src/services/notification.ts` 通知点击落地路由。
**依赖**：无

---

### T2 基础 hooks 与日期纯函数（含单测）

**目标**：今日页与节奏展示的计算基础就位，纯函数有单测覆盖。
**产出**：`src/hooks/useNow.ts`（interval 可配、卸载清理）；`src/utils/date.ts` 新增周期节奏纯函数（如「第 X 天 / N 天」「距今 X 天」）；`src/utils/__tests__/date.test.ts` 补用例。
**依赖**：无（与 T1 并行）

---

### T3 今日页数据派生 useTodayOverview（含单测）

**目标**：今日页所需数据一个 hook 全量产出，计算全部委托现有服务与纯函数。
**产出**：`src/hooks/useTodayOverview.ts`（nextRing / todayItems / greeting 三段输出，显式返回类型）；`src/hooks/__tests__/useTodayOverview.test.ts`（mock store 数据验证派生正确性）。
**依赖**：T2

---

### T4 common 组件整理

**目标**：跨页面复用的基础组件归位，供各页面消费。
**产出**：`src/components/common/`（PageHeader 迁入并更新引用、新增 FAB、新增 EmptyState）；清理原平铺位置。
**依赖**：T1

---

### T5 今日页实现

**目标**：今日 Tab 达到原型验收形态：下一次响铃主卡（含倒计时与节奏点阵）+ 今日时间轴 + 空态。
**产出**：`src/components/today/NextRingCard.tsx`、`RhythmDots.tsx`、`TodayTimeline.tsx`；`(tabs)/today.tsx` 用 useTodayOverview + useNow 接线；周期项左滑「跳过一次」复用现有调整逻辑；Token 仅在现有 COLORS 体系内补位（hero 卡 primarySoft 用法）。
**依赖**：T1、T3、T4

---

### T6 AlarmForm 组件链（创建/编辑主线化）

**目标**：创建页以「多久响一次」为主线，create/edit 共用一套表单，消除双份实现。
**产出**：`src/components/alarm-form/AlarmForm.tsx`（initialAlarm 可选，创建态默认选中「每 N 天」，无「核心」类标签）、`FrequencySelector.tsx`、`CycleFields.tsx`（间隔步进 + 今天/明天开始快捷项）、`OptionalFields.tsx`；`app/create.tsx`、`app/[id]/edit.tsx` 退化为薄壳；用户可见文案「贪睡」→「稍后提醒」（内部 snooze 标识符不动）；保存链路（conflicts 静默检测 → repository → scheduler）换调用方不改逻辑。
**依赖**：T1（目录约定）；与 T2~T5 并行

---

### T7 全部页：筛选收纳与卡片重组

**目标**：管理列表默认清爽（下次响铃升序、暂停沉底），搜索/筛选/排序收进可展开筛选行，功能不删。
**产出**：`src/components/alarm-list/FilterBar.tsx`（本地展开态，取值持久化复用现有 store）、`AlarmCard.tsx` 迁入并更新引用；`(tabs)/all.tsx` 接线。
**依赖**：T1、T4

---

### T8 计划页迁移与头部重组

**目标**：日历完整迁入计划 Tab，顶部按原型两层结构重组（日期范围+翻页 / 视图分段），四视图功能不变。
**产出**：`(tabs)/plan.tsx` 头部重排；日历相关组件视规模拆入 `src/components/plan/`；空态接 EmptyState。
**依赖**：T1、T4

---

### T9 收尾联调与验证

**目标**：整体跑通并验证需求验收标准。
**产出**：tsc strict 零错误；全量 jest 通过；`npm run android` dev 构建装机，人工验证：4 Tab 切换、创建周期闹钟（每 N 天）→ 到点通知 → 稍后提醒、旧数据回填正确、搜索/筛选/排序、日历四视图；确认无遗漏后按 Angular 规范分批提交。
**依赖**：T1~T8 全部
