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
- [006-product-redesign](.ai/specs/006-product-redesign/requirements.md): 产品整体重设计（今日/计划/全部/设置 4 Tab、创建主线化、视觉方向选型中；001~005 能力全保留）
  - [技术设计](.ai/specs/006-product-redesign/design.md): 导航重排、useTodayOverview、AlarmForm 复用、目录结构目标态
  - [任务拆分](.ai/specs/006-product-redesign/tasks.md): T1~T9 开发任务清单与依赖关系

## 技能（Skills）— 可复用的工作流

按开发环节组织，真实内容存放在 `.ai/skills/` 下（详见 [Skill 组织规范](.ai/rules/skill-organization.md)），当用户触发特定任务时自动匹配对应 skill 并按流程执行：

- [kit-requirement-research](.ai/skills/kit-requirement-research/SKILL.md): 需求调研，从模糊想法到结构化需求文档
- [kit-design-prototype](.ai/skills/kit-design-prototype/SKILL.md): 原型设计，从需求文档到可交互 HTML 原型
- [kit-design-plan](.ai/skills/kit-design-plan/SKILL.md): 技术设计，从需求+原型到 design.md 技术方案
- [kit-design-tasks](.ai/skills/kit-design-tasks/SKILL.md): 任务拆分，从技术设计到可执行任务清单
- [kit-iteration-log](.ai/skills/kit-iteration-log/SKILL.md): 迭代记录维护，版本日志 + 周迭代日志按需新建/合并
- [kit-iteration-start](.ai/skills/kit-iteration-start/SKILL.md): 开迭代，收尾当前迭代并 bump 版本号（小/中/大粒度）
- [kit-iteration-item](.ai/skills/kit-iteration-item/SKILL.md): 迭代项处理，单个问题在独立 worktree 中从方案到落地的闭环

## 铁律

1. Expo SDK 56 — 查阅 https://docs.expo.dev/versions/v56.0.0/ 的文档，不要用废弃 API
2. Git 提交 — Angular 规范 + 中文 message，梳理变更文件后写有意义的描述
3. TypeScript strict — 不允许 any 类型逃逸
