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

## 铁律

1. Expo SDK 56 — 查阅 https://docs.expo.dev/versions/v56.0.0/ 的文档，不要用废弃 API
2. Git 提交 — Angular 规范 + 中文 message，梳理变更文件后写有意义的描述
3. TypeScript strict — 不允许 any 类型逃逸
