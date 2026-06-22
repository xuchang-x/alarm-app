# 001 - 闹钟 MVP 任务拆分

基于 [需求规格](./requirements.md)、[技术设计](./design.md)、[交互原型](./prototype/index.html) 拆分的开发任务清单。

## 任务依赖关系

```
T1 项目结构改造
 └──→ T2 数据库层
       └──→ T3 周期计算引擎 ──→ T5 通知调度服务
       └──→ T4 Zustand Store ──→ T5
             └──→ T6 闹钟列表页
                   └──→ T7 创建闹钟页
                         └──→ T8 编辑闹钟页
                               └──→ T9 通知交互（贪睡/关闭）
                                     └──→ T10 启动补调度 & 收尾
T3 ──→ T11 核心逻辑单测
```

## 任务清单

### T1 项目结构改造

**目标**：从当前 App.tsx 入口迁移到 expo-router 文件系统路由，安装所有依赖。

**产出**：

- 安装依赖：expo-sqlite、expo-notifications、zustand、date-fns
- 创建 `app/` 目录，添加 `_layout.tsx`（Stack 导航）和 `index.tsx`（占位首页）
- 删除或改造 `App.tsx`、`index.ts`，切换到 expo-router 入口
- 创建 `src/` 子目录结构：components/、store/、db/、services/、hooks/、utils/、types/、constants/
- 创建 `src/types/alarm.ts` 类型定义（Alarm、CreateAlarmInput、UpdateAlarmInput 等）
- 验证 `npx expo start` 能正常启动并显示占位首页

**依赖**：无

---

### T2 数据库层

**目标**：实现 expo-sqlite 数据库初始化和闹钟 CRUD 操作。

**产出**：

- `src/db/connection.ts`：数据库连接（使用 expo-sqlite 的同步 API）
- `src/db/schema.ts`：建表语句（alarms 表 + alarm_adjustments 表），含 `initDatabase()` 函数
- `src/db/alarm-repository.ts`：CRUD 函数——getAll、getById、create、update、delete、toggle、addAdjustment（跳过/加一次）

**依赖**：T1

---

### T3 周期计算引擎

**目标**：实现各类型闹钟的下次/未来 N 天响铃日期计算逻辑。

**产出**：

- `src/services/scheduler.ts`：核心函数
  - `computeNextRingDate(alarm)`：计算下一次响铃日期（用于列表展示）
  - `computeRingDatesInRange(alarm, startDate, endDate)`：计算指定范围内所有响铃日期（用于批量调度）
  - 内部处理四种类型的计算逻辑，cycle 类型需查询 alarm_adjustments 做 skip/add 过滤
- `src/utils/date.ts`：基于 date-fns 的日期工具函数

**依赖**：T1

---

### T4 Zustand Store

**目标**：实现闹钟状态管理，串联 UI 与数据库层。

**产出**：

- `src/store/alarm-store.ts`：Zustand store，包含 alarms 列表状态和所有 action（loadAlarms、createAlarm、updateAlarm、deleteAlarm、toggleAlarm、skipNext、addOnce）
- 每个 action 内部调用 alarm-repository 写库 → 调用通知服务重新调度 → 刷新 store 状态

**依赖**：T2

---

### T5 通知调度服务

**目标**：实现通知权限申请、批量调度、取消等功能。

**产出**：

- `src/services/notification.ts`：
  - `requestPermissions()`：申请通知权限
  - `scheduleAlarmNotifications(alarm)`：根据闹钟类型批量调度通知（cycle 类型调度 90 天）
  - `cancelAlarmNotifications(alarmId)`：按 `alarm-{id}-` 前缀取消该闹钟所有通知
  - `scheduleSnooze(alarm)`：调度一条贪睡通知
  - 通知 ID 格式：`alarm-{alarmId}-{YYYYMMDD}`
- 注册 notification category（alarm），配置「稍后提醒」和「关闭」action button

**依赖**：T3、T4

---

### T6 闹钟列表页

**目标**：实现首页闹钟列表，包含卡片展示、开关切换、左滑操作。

**产出**：

- `app/index.tsx`：闹钟列表页，从 store 读取数据，空状态引导
- `src/components/AlarmCard.tsx`：闹钟卡片组件
  - 展示：时间、重复规则描述、下次响铃日期（周期闹钟）、开关
  - 禁用状态：文字变暗 + 不透明背景色（不用 opacity）
  - 左滑手势（gesture-handler + reanimated）：
    - 启用的周期闹钟：跳过一次 / 加一次 / 删除（168px）
    - 其他闹钟：删除（64px）
- 右下角 FAB 按钮跳转创建页

**依赖**：T4

---

### T7 创建闹钟页

**目标**：实现创建闹钟页面，支持四种类型切换和对应设置项。

**产出**：

- `app/create.tsx`：创建闹钟页面
  - 闹钟类型选择（once / daily / weekly / cycle）
  - 时间选择器（`src/components/TimePicker.tsx`）
  - 按类型动态展示设置项：
    - once：日期选择器
    - weekly：星期选择器（`src/components/WeekdaySelector.tsx`）
    - cycle：间隔天数 + 起始日期（`src/components/CycleSettings.tsx`）
    - daily：无额外设置
  - 贪睡时长设置（默认 10 分钟）
  - 保存 → store.createAlarm → 返回列表

**依赖**：T6

---

### T8 编辑闹钟页

**目标**：实现编辑闹钟页面，复用创建页组件，支持修改所有设置项。

**产出**：

- `app/[id]/edit.tsx`：编辑闹钟页面
  - 从路由参数获取 alarmId，加载已有数据回填表单
  - 复用 TimePicker、WeekdaySelector、CycleSettings 组件
  - 周期闹钟支持修改间隔天数、偏移起始日
  - 保存 → store.updateAlarm → 返回列表

**依赖**：T7

---

### T9 通知交互（贪睡 / 关闭）

**目标**：实现通知弹出后的用户交互处理。

**产出**：

- 在 `app/_layout.tsx` 中注册 notification response handler
- 处理逻辑：
  - 点击「稍后提醒」→ 调用 notification.scheduleSnooze()
  - 点击「关闭」→ 不做额外操作
  - 点击通知本身 → 跳转到对应闹钟编辑页
  - 一次性闹钟响铃后 → store.toggleAlarm() 自动关闭

**依赖**：T8

---

### T10 启动补调度 & 收尾

**目标**：实现 App 启动时的通知补充调度，以及整体联调收尾。

**产出**：

- 在 `app/_layout.tsx` 的启动流程中：
  - 初始化数据库
  - 申请通知权限
  - 加载闹钟列表到 store
  - 检查所有启用闹钟的已调度通知，不足 90 天的补充调度
- 整体联调：创建 → 通知触发 → 贪睡 → 列表刷新 → 编辑 → 删除，全流程跑通
- 处理边界情况：App 首次安装（空数据库）、通知权限被拒、时区问题

**依赖**：T9

---

### T11 核心逻辑单测

**目标**：为周期计算引擎和日期工具编写单元测试。

**产出**：

- 安装测试依赖（jest 或 expo 内置测试方案）
- `scheduler.test.ts`：测试用例覆盖
  - 四种类型的 computeNextRingDate 计算
  - cycle 类型 90 天范围内日期列表计算
  - skip 调整后正确跳过
  - add 调整后正确追加
  - 边界情况：跨月、跨年、起始日在未来、起始日在过去
- `date.test.ts`：日期工具函数测试

**依赖**：T3
