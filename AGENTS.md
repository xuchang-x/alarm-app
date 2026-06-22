# Alarm App — AI 知识索引

本文件是 AI 辅助开发的入口索引。根据任务类型，按需读取对应文档。

## 项目上下文（Context）— 理解项目是什么

当需要了解项目背景、技术选型、架构设计时，读取以下文档：

- [项目总览](.ai/context/overview.md): 项目定位、技术栈、关键决策
- [架构设计](.ai/context/architecture.md): 目录结构、数据存储方案、核心依赖

## 编码规范（Rules）— 代码怎么写

写代码前**必须**读取以下规范：

- [编码规范](.ai/rules/coding.md): TypeScript / React Native / Expo 编码约定
- [Git 规范](.ai/rules/git.md): Angular 提交规范（中文 message）、分支策略

## 需求规格（Specs）— 要做什么功能

每个功能需求一个子目录，包含需求描述、技术设计、任务拆分：

- [Specs 使用说明](.ai/specs/README.md)
- [001-alarm-mvp](.ai/specs/001-alarm-mvp/requirements.md): 闹钟 MVP（含周期闹钟核心功能）
  - [技术设计](.ai/specs/001-alarm-mvp/design.md): 技术选型、数据模型、关键流程
  - [通知调度方案](.ai/specs/001-alarm-mvp/notification-scheduling.md): 周期闹钟批量预调度策略

## 指令（Commands）— 可复用的工作流

当用户触发特定任务时，读取对应指令文档按流程执行：

- [需求调研](.ai/commands/requirement-research.md): 从模糊想法到结构化需求文档的完整流程
- [原型设计](.ai/commands/prototype-design.md): 从需求文档到可交互 HTML 原型的设计流程
- [技术设计](.ai/commands/technical-design.md): 从需求+原型到 design.md 技术方案的讨论流程

## 铁律

1. Expo SDK 56 — 查阅 https://docs.expo.dev/versions/v56.0.0/ 的文档，不要用废弃 API
2. Git 提交 — Angular 规范 + 中文 message，梳理变更文件后写有意义的描述
3. TypeScript strict — 不允许 any 类型逃逸
