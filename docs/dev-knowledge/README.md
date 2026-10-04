# 开发知识库

这是写给人看的开发知识沉淀，记录「为什么这么设计」「踩过什么坑」「下次怎么少踩」。
它不是给 AI 的指令（AI 的知识索引在 `.ai/` 下），也不包含任务清单和需求规格（那些在 `.ai/specs/` 下）。

## 目录

- [Expo 的两种运行方式：Expo Go 与 Dev Build](./expo-dev-build.md) — 为什么闹钟在 Expo Go 里不响，以及三种启动命令到底差在哪
- [Android 构建环境笔记](./android-build-env.md) — 本机 NDK / CMake / JDK 的坑与修法，日常构建和查日志的姿势
- [编辑闹钟后的历史与未来行为边界](./alarm-edit-history.md) — 改周期规则后真实响铃不变、但日历历史显示会跟着重算的取舍
- [提醒响铃时长调研与方案](./alarm-ring-duration-research.md) — 为什么纯通知层做不到循环 30 秒，以及原生闹钟模块的架构决策
- [提示音调研：格式惯例与20个候选](./alarm-sound-research.md) — 内置提示音格式怎么选、版权渠道、候选清单与建议入选的10个
