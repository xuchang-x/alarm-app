# Alarm App — AI 知识索引

本文件是 AI 辅助开发的入口索引。根据任务类型，按需读取对应文档。

## 项目上下文（Context）— 理解项目是什么

当需要了解项目背景、技术选型、架构设计时，读取索引：[.ai/context/AGENTS.md](.ai/context/AGENTS.md)

## 编码规范（Rules）— 代码怎么写

写代码前**必须**读取索引：[.ai/rules/AGENTS.md](.ai/rules/AGENTS.md)

## 需求规格（Specs）— 要做什么功能

每个功能需求一个子目录，包含需求描述、技术设计、任务拆分：

- [Specs 使用说明](.ai/specs/README.md)
- [001-alarm-mvp](.ai/specs/001-alarm-mvp/requirements.md): 闹钟 MVP（含周期闹钟核心功能）
  - [技术设计](.ai/specs/001-alarm-mvp/design.md): 技术选型、数据模型、关键流程
  - [通知调度方案](.ai/specs/001-alarm-mvp/notification-scheduling.md): 周期闹钟批量预调度策略
  - [任务拆分](.ai/specs/001-alarm-mvp/tasks.md): 开发任务清单与依赖关系
- [006-product-redesign](.ai/specs/006-product-redesign/requirements.md): 产品整体重设计（今日/计划/全部/设置 4 Tab、创建主线化；已落地，版本收口于 0.0.3；001~005 能力全保留）
  - [技术设计](.ai/specs/006-product-redesign/design.md): 导航重排、useTodayOverview、AlarmForm 复用、目录结构目标态
  - [任务拆分](.ai/specs/006-product-redesign/tasks.md): T1~T9 开发任务清单与依赖关系

## 技能（Skills）— 可复用的工作流

按开发环节组织，真实内容存放在 `.ai/skills/` 下（详见 [Skill 组织规范](.ai/rules/skill-organization.md)），当用户触发特定任务时自动匹配对应 skill 并按流程执行：

- [kit-requirement-research](.ai/skills/kit-requirement-research/SKILL.md): 需求调研，从模糊想法到结构化需求文档
- [kit-design-prototype](.ai/skills/kit-design-prototype/SKILL.md): 原型设计，从需求文档到可交互 HTML 原型
- [kit-design-plan](.ai/skills/kit-design-plan/SKILL.md): 技术设计，从需求+原型到 design.md 技术方案
- [kit-design-tasks](.ai/skills/kit-design-tasks/SKILL.md): 任务拆分，从技术设计到可执行任务清单
- [kit-iteration-log](.ai/skills/kit-iteration-log/SKILL.md): 迭代记录维护，版本日志 + 周迭代日志按需新建/合并
- [kit-iteration-start](.ai/skills/kit-iteration-start/SKILL.md): 开迭代，当前 release 分支合并进 master + 从 master 切新 release/x.y.z 分支 bump 版本号（小/中/大粒度）
- [kit-iteration-item](.ai/skills/kit-iteration-item/SKILL.md): 迭代项处理，单个问题在独立 worktree 中从方案到落地的闭环

### Skill 协作关系与分支模型

两组 skill 覆盖不同输入，不冲突：

- **设计四件套**（requirement-research → design-prototype → design-plan → design-tasks）：处理「整块新功能」。从模糊想法出发，依次产出 spec 目录下的 requirements / HTML 原型 / design / tasks，并开出 `feat/{NNN}-{name}` 分支。
- **迭代三件套**（item / log / start）：处理迭代内外的日常流转。

迭代三件套内部分工：**item 是干活的单元**（一个具体问题/优化/bug，在独立 worktree 中方案→实施→增量合并回集线分支）；**log 是记账的**（随时维护 `docs/iteration/` 版本日志与周报，不碰分支）；**start 是版本收口的**（release → master 合并 + 切新 release 分支 bump 版本号）。

分支模型：master 只存已收尾版本（版本号永远等于已收尾版本，不承载开发提交）；`release/x.y.z` 是当前迭代的集线分支，bump 只发生在它上面；feat 分支与 item 的 worktree 分支都合入 release 分支。一个迭代期间多次触发 item / log，最后触发一次 start 收口。

两者衔接：item 的输入若关联 spec 编号，直接复用 spec 的 design/tasks 作为方案输入（跳过调研）；若在 item 的问题理解中发现事情大到值得走完整 spec 链路，升级到设计四件套。

## 铁律

1. Expo SDK 56 — 查阅 https://docs.expo.dev/versions/v56.0.0/ 的文档，不要用废弃 API
2. Git 提交 — Angular 规范 + 中文 message，梳理变更文件后写有意义的描述
3. TypeScript strict — 不允许 any 类型逃逸
