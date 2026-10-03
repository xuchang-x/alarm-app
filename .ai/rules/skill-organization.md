# Skill 组织规范

本项目的可复用 AI 工作流以 **Skill** 形式组织（而非普通指令文档），遵循以下原则。

## 存放位置

- **真实内容唯一存放在 `.ai/skills/{skill-name}/SKILL.md`**，这是所有内容的唯一真相来源（Single Source of Truth）。
- `.claude/skills/`、`.catpaw/skills/`、`.codex/skills/`、`.cursor/skills/` 下的同名目录均为**软链接**，指向 `.ai/skills/` 下对应目录，用于适配不同 AI 编码工具（Claude Code、CatPaw、Codex、Cursor）的 skill 发现机制。
- 新增/修改 skill 时，**只编辑 `.ai/skills/` 下的内容**，各平台目录会通过软链接自动同步，不需要重复维护。
- 新增一个 skill 时，需要在四个平台目录下都补建同名软链接：

```bash
skill=kit-xxx-xxx
ln -sf "../../.ai/skills/${skill}" ".claude/skills/${skill}"
ln -sf "../../.ai/skills/${skill}" ".catpaw/skills/${skill}"
ln -sf "../../.ai/skills/${skill}" ".codex/skills/${skill}"
ln -sf "../../.ai/skills/${skill}" ".cursor/skills/${skill}"
```

## 命名规范

Skill 目录名格式：`kit-{阶段}-{具体动作}`，全部使用小写英文单词 + 连字符，不使用中文、不使用缩写导致歧义的词（如 `req` 应写全 `requirement`）。

- `kit-` 前缀：标识这是本项目 Coding Kit 体系下的 skill
- `{阶段}`：所处的开发环节，当前已有 `requirement`（需求）、`design`（设计）、`iteration`（迭代管理）；后续按需扩展 `backend`（后端开发）、`expo`（Expo/RN 开发）、`ios`（iOS 原生开发）、`android`（Android 原生开发）等
- `{具体动作}`：该 skill 具体做什么，如 `research`（调研）、`prototype`（原型）、`plan`（方案）、`tasks`（任务拆分）

已有 skill：

| Skill 名称 | 所属阶段 | 作用 |
|---|---|---|
| `kit-requirement-research` | 需求 | 需求调研，产出 `requirements.md` |
| `kit-design-prototype` | 设计 | 原型设计，产出可交互 HTML 原型 |
| `kit-design-plan` | 设计 | 技术设计，产出 `design.md` |
| `kit-design-tasks` | 设计 | 任务拆分，产出 `tasks.md` |
| `kit-iteration-log` | 迭代 | 迭代记录维护，版本日志 + 周迭代日志 |
| `kit-iteration-start` | 迭代 | 迭代收尾与版本号 bump（小/中/大粒度） |
| `kit-iteration-item` | 迭代 | 单个迭代项在独立 worktree 中的处理闭环 |

## SKILL.md 格式

每个 Skill 目录下必须有一个 `SKILL.md`，包含：

- YAML frontmatter：`name`（与目录名一致）、`description`（第三人称描述做什么 + 何时使用，用于 AI 判断是否触发）
- 正文：触发条件、执行流程、输出格式模板、注意事项

## AGENTS.md 索引

`AGENTS.md` 的「技能（Skills）」章节需要与 `.ai/skills/` 下的实际目录保持同步，新增/删除 skill 时同步更新索引链接。

