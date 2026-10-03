---
name: kit-iteration-item
description: 迭代项处理助手。接收一个迭代项（可能只是一段模糊的问题描述，也可能是关联某个 spec 的开发诉求，或已经明确到"改哪个文件"的改动指令），先理解问题本质，再给出多个候选方案并对比、判断落点（改业务代码 / 改工程配置 / 改文档与规范 / 组合 / 都不改），经用户确认方案后在独立 worktree 中完成详细设计与实施，验收通过后合并回发起时所在分支。当用户说「处理一下这个迭代项」「这个问题该怎么改」「迭代一下 xxx」「单独开个 worktree 改这个」并给出一个问题描述或 spec 编号时使用。
---

## 用户输入

```text
$ARGUMENTS
```

## 概述

本 skill 是本项目迭代管理体系中"具体做一件事"的执行环节，与 `kit-iteration-start`（迭代收尾/版本 bump）、`kit-iteration-log`（记录维护）配套但职责不同：`kit-iteration-start` 负责版本粒度的分支流转，本 skill 负责**单个迭代项**从"一个模糊问题"到"落地代码变更"的完整闭环。

`$ARGUMENTS` 是本次要处理的迭代项，可以是以下任意形态，不要求用户预先加工成结构化指令：

- 一段自然语言问题描述（如"全部页筛选收纳后滚动性能不行"）
- 一个 spec 编号或目录名（如 `006` 或 `.ai/specs/006-product-redesign`），表示推进该 spec 内的某个未完成任务
- 一个已经明确到"改哪个文件"粒度的具体诉求（此时可跳过深度调研，直接进入方案设计，但方案设计步骤不可跳过）

**核心流程**：① 创建独立 worktree → ② 问题理解 → ③ 方案设计与落点判断 →〔确认点1：方案评审〕→ ④ 详细方案 → ⑤ 实施 →〔确认点2：全部完成收口确认〕→ ⑥ 清理 worktree。

**关键设计（一个迭代项 = 一个 worktree，贯穿全流程）**：worktree 在流程最早期就创建，从问题理解、方案设计、详细方案到最终实施，全部在**同一个** worktree / 同一个分支中完成，中途不因跨越确认点或阶段切换而重新创建。具体编辑始终发生在这个独立 worktree 中（隔离），但产出不攒到最后才一次性合并——**每完成一个阶段性产出（一版方案说明、一个代码改动点）就立即 commit 并同步 `merge` 回用户发起本次处理时所在的分支**（该分支对应的主工作区目录通常就是用户 IDE 正打开的窗口），让用户能在 IDE 里近实时看到变化、随时叫停或提意见。

全流程只有两个强制人工确认点（方案评审、收口确认），其余步骤 Agent 自主推进；用户可在任意时刻基于看到的变化主动叫停，不必等到确认点。

## 前置检查

- 在仓库根目录执行，确认 `git rev-parse --show-toplevel` 结果为本仓库根路径。
- 记录发起本次处理时所在的分支（`git branch --show-current`），作为全流程持续同步合并的目标分支（`BASE_BRANCH`），不得假设为固定分支名。
- 若工作区存在冲突标记、未完成的 rebase/merge（`git status` 中出现 `Unmerged paths`），必须先停下来让用户处理，不得继续。

## 执行步骤

### Step 1：创建独立 worktree（全流程只创建一次）

沿用本项目 `.worktrees/` 下的 worktree 惯例（参考已存在的 `.worktrees/icon-candidates`）：

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
BASE_BRANCH="$(git branch --show-current)"   # 前置检查中记录的发起分支
TS="$(date '+%Y%m%d%H')"
TOPIC="<2-5个单词的英文kebab-case改动简介，据$ARGUMENTS内容提炼>"

# 若迭代项关联 spec：分支名必须用规范格式 feat/{NNN}-{name}（编号与 .ai/specs/ 目录一致）
# 若不关联 spec：分支名用 {TS}-{TOPIC}
BRANCH_NAME="feat/{NNN}-{name}" 或 "${TS}-${TOPIC}"
WORKTREE_DIR="${REPO_ROOT}/.worktrees/${TOPIC}"

if [ -e "$WORKTREE_DIR" ] || git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    echo "ERROR: 分支或目录已存在：${BRANCH_NAME}" >&2
    exit 1
fi

git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME" "$BASE_BRANCH"
```

- `TOPIC` 命名不得凭空编造，必须来自 `$ARGUMENTS` 本身内容的真实概括（此时尚未进入 Step 2 问题理解，若信息太少不足以概括，可先用最简短的原始关键词，不强求精确）。
- 若分支名/目录名冲突，换一个更具区分度的 `TOPIC` 重试，不擅自删除或覆盖已有分支/目录。
- **`WORKTREE_DIR`、`BRANCH_NAME`、`BASE_BRANCH` 三个变量贯穿 Step 2~6 全程复用，不重新创建、不切换到其他 worktree**。
- 创建成功后，**后续所有文件改动、`git add`/`git commit` 均在 `$WORKTREE_DIR` 目录中进行**，不在主工作区（`$REPO_ROOT`）直接操作；`$REPO_ROOT` 只在"同步合并回 BASE_BRANCH"时被切换过去执行 `git merge`。

### 同步动作（贯穿 Step 2~5 反复使用的通用步骤）

每当 Step 2~5 中产出了一个值得同步的阶段性成果（问题理解小结、一版方案说明、一个代码改动点等），执行以下两步，之后再继续下一项工作：

1. **在 `$WORKTREE_DIR` 中提交**（Angular 规范 + 中文 message，沿用 heredoc `-F -` 提交方式）：

```bash
cd "$WORKTREE_DIR"
git add <本次产出涉及的文件>
git commit -F - <<'EOF'
<type>(<scope>): <中文简明说明本次产出>
EOF
```

2. **同步合并回用户所在的 `BASE_BRANCH`**：

```bash
cd "$REPO_ROOT"

# 安全校验：确认主工作区仍在 BASE_BRANCH 上
CURRENT="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT" != "$BASE_BRANCH" ]; then
    echo "⚠️ 主工作区当前分支为 ${CURRENT}，与发起时的 ${BASE_BRANCH} 不一致，停止自动合并，向用户报告" >&2
    exit 1
fi
# 安全校验：主工作区已跟踪文件不得有未提交改动（未跟踪文件若与本次改动路径无交集，可提示用户后继续）
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "⚠️ 主工作区存在已跟踪文件的未提交改动，停止自动合并，向用户报告并询问如何处理" >&2
    exit 1
fi

git merge --no-ff "$BRANCH_NAME"
```

- 校验不通过：停下来如实报告给用户，询问如何处理，不擅自 `stash`、不擅自强制切换分支、不跳过校验硬合并。
- **合并冲突**：停下来，`git status` 列出冲突文件，原样报告给用户，等待用户明确指示，不能自作主张选择某一方内容强行合并。
- 合并成功后，用一句话轻量播报本次同步内容（如"已同步：方案说明文档""已同步：全部页筛选逻辑调整"），不需要走完整确认流程。
- 合并完成后 `cd "$WORKTREE_DIR"` 继续后续工作。
- `git merge --no-ff` 是增量的（只会带入 `BASE_BRANCH` 尚未包含的新 commit），对同一个 `BRANCH_NAME` 重复执行安全、幂等，全流程可反复调用。

### Step 2：问题理解

先判断 `$ARGUMENTS` 的输入形态：

1. **若是 spec 编号/目录（如 `006`）**：完整读取 `.ai/specs/{NNN}-{name}/` 下的 `requirements.md`、`design.md`、`tasks.md`，对照 `tasks.md` 中未完成的任务项，向用户确认本次迭代项对应哪一项（或哪几项）。不臆测 spec 内容。
2. **若是自然语言问题描述**：直接以文字本身作为问题输入。
3. **若已经是明确到"改哪个文件"粒度的具体诉求**：记录下来，仍需完整走 Step 3 的方案设计（哪怕只有一种合理做法，也要说明排除了哪些备选做法及理由），不允许跳过 Step 3 直接实施。

若问题描述不足以定位问题所在层次，针对性调研现状，按需查阅：

- `.ai/specs/`：相关需求的 requirements/design/tasks，判断问题是否已有设计覆盖。
- `.ai/context/`：项目背景、技术选型、架构设计，判断问题落在哪个架构层次。
- `.ai/rules/`：是否已有相关规范，问题是否属于"规则缺失"。
- `src/`、`app/`：相关组件/hooks 的现状实现。
- `docs/dev-knowledge/`：Expo/安卓构建等开发知识沉淀。

产出一段简明的问题理解小结（对话中呈现即可，不强制落盘；若问题足够复杂值得存档，落盘到 spec 对应目录或 worktree 内临时目录后执行一次"同步动作"）。

### Step 3：方案设计与落点判断

**落点分类**（MECE，判断本次改动应归入以下哪一类或哪几类组合）：

| 分类 | 改动范围 | 实施要求 |
|------|----------|----------|
| A. 业务代码 | `src/`、`app/` | 写码前**必须**读取 `.ai/rules/AGENTS.md` 索引并遵守 `typescript-react-native-style.md`；TypeScript strict，不允许 any 类型逃逸；涉及 Expo API 时查阅 https://docs.expo.dev/versions/v56.0.0/ 官方文档，不用废弃 API |
| B. 工程与平台 | `package.json`、`app.json`、`tsconfig.json`、`jest.config.js`、`assets/` 等 | 涉及本地安卓构建时先读 `docs/dev-knowledge/android-build-env.md`（JAVA_HOME / CMAKE 等本机约定）；注意 `android/`、`ios/` 目录被 gitignore，其中的改动不会进入提交，需向用户说明记录方式 |
| C. 文档与规范 | `.ai/`（specs/skills/rules/context）、`docs/`、`AGENTS.md` | 改 skill 必须遵守 `.ai/rules/skill-organization.md`：只编辑 `.ai/skills/` 下的内容，并在 `.claude/.catpaw/.codex/.cursor` 四个平台目录补建软链接，同步更新 `AGENTS.md` 技能索引 |
| D. 组合 | 以上多类同时涉及 | 需明确各部分的实现顺序与依赖关系 |
| E. 都不改 | 结论是纯外部文档说明、或"当前不做"并说明理由 | 直接在对话中说明或按用户要求结束流程 |

**候选方案要求**：至少给出 2 个候选方案做对比；若问题足够简单只有一种合理做法，必须明确列出"已考虑但排除的备选方案及排除理由"，不能只呈现单一方案而回避对比。每个候选方案说明：

1. 落点分类（表中 A~E 或组合）
2. 具体改动点（哪些文件、大致改什么）
3. 优点
4. 代价/风险（含对现有功能、既有规范约定的冲突）

给出推荐方案及理由。

**〔确认点 1：方案评审，强制，不可跳过〕**

用结构化选项的方式（每个候选方案一句话概括为一个选项）向用户征求确认：采纳哪个方案、或要求重新设计。未获得用户明确选择前，不得进入 Step 4。若用户驳回全部方案，回到 Step 3 重新设计（仍在同一个 `$WORKTREE_DIR`），不得自行武断决定。

### Step 4：详细方案

基于用户选定的方案细化（仍在 Step 1 创建的同一个 `$WORKTREE_DIR` 中）：

1. 列出具体要改的文件清单，逐个说明改动要点。
2. 若落点涉及 A 类（业务代码）：确认改动符合 `.ai/rules/typescript-react-native-style.md` 的目录结构与命名约定；涉及导航/数据模型变更的，对照相关 spec 的 `design.md` 数据模型与流程设计核对一致性。
3. 若落点涉及 C 类（文档与规范）：明确 `skill-organization.md` 要求的软链接与索引同步动作清单。
4. 明确实现顺序（若为组合方案，说明各部分先后依赖关系）。

本步骤产出若值得存档（如关联 spec），落盘后执行一次"同步动作"。

### Step 5：实施（改动点级增量合并）

在 `$WORKTREE_DIR` 中按 Step 4 详细方案逐项落地。以**单个独立改动点**为最小闭环单位（一个改动点对应一个逻辑完整的小改动），每完成一个改动点就执行一次"同步动作"，不攒到最后。

- 落点为 A 类：直接写代码，遵守 strict TS 与 Expo SDK 56 约束。
- 落点为 B 类：改配置；涉及版本号两处（package.json / app.json）同步的，遵守与 `kit-iteration-start` 相同的约定。
- 落点为 C 类：编辑 `.ai/` 下的内容并完成软链接与 `AGENTS.md` 索引同步，自检软链接指向有效。

提交 message 均按 `.ai/rules/git-commit-convention.md`：Angular type + 中文 scope/subject，一次提交包含多个不相关改动时拆分。

### Step 6：全部完成收口确认

**〔确认点 2：收口确认，强制〕**

全部改动点都已完成并同步合并回 `BASE_BRANCH` 后（此时用户在 IDE 里应该已经能看到全部变化），向用户做一次总结汇报，明确询问是否确认完成：

- 用户确认完成：进入 Step 7 清理 worktree。
- 用户提出问题/需要调整：回到 Step 5（或视问题性质回到 Step 3/4 调整方案）在**同一个** `$WORKTREE_DIR` 中继续修改，修完仍执行"同步动作"，不新开 worktree、不回退已合并的改动。

### Step 7：清理 worktree

收口确认通过后，询问用户是否清理该 worktree 与本地分支（此时 `BRANCH_NAME` 上的全部 commit 均已合并进 `BASE_BRANCH`，删除是安全的）：

```bash
git worktree remove "$WORKTREE_DIR" --force
git branch -d "$BRANCH_NAME"
```

清理前必须先征得用户同意，不能未经确认直接删除。若迭代分支还需要后续 push / 合并 master（走 `kit-iteration-start`），提醒用户保留。

### 完成汇报

```
✅ 迭代项处理完成

问题：<Step 2 问题理解小结一句话>
落点：<Step 3 确定的分类：A/B/C/D/E>
方案：<用户确认采纳的方案要点>
同步次数：<本次共同步合并 N 次回 BASE_BRANCH>
worktree：<已清理 / 保留于 WORKTREE_DIR>
```

## 核心约束

- **一个迭代项只对应一个 worktree/一个分支，全程复用**：Step 1 创建后，Step 2~6 无论经过多少轮方案调整、多少个实施改动点，都不重新创建 worktree，不切换到其他分支；只有 Step 7 收口后才清理。
- **两个确认点不可跳过、不可合并**：方案评审（Step 3 末）确认"改什么、怎么改"，收口确认（Step 6）确认"全部做完了、做得对不对"，二者关注点不同，不能因为方案评审通过了就跳过收口确认。
- **产出即同步，不攒到最后**：任何阶段性产出一旦落盘/完成，立即执行"同步动作"合并回 `BASE_BRANCH`，让用户尽早在其可见的工作区里看到进展。
- **不擅自处理冲突**：合并冲突必须原样报告给用户，等待明确指示。
- **不擅自强推/清理**：任何 push 失败场景不使用 `--force`；worktree/分支清理必须经用户确认后才执行。
- **落点判断必须给出对比**：即使问题简单到只有一种合理做法，也要写明排除了哪些备选方案及理由，保留"为什么这么选"的可追溯性。
- **不臆造 TOPIC/分支名**：Step 1 的 `TOPIC` 必须来自 `$ARGUMENTS`/后续问题理解内容的真实概括；关联 spec 时分支名必须与 spec 编号严格一致（`feat/{NNN}-{name}`）。
- **写业务代码前必读 `.ai/rules/`**：这是本项目 AGENTS.md 的铁律，不得跳过。

## 注意事项

- 与 `kit-iteration-start`/`kit-iteration-log` 的关系：三者服务于不同粒度——本 skill 处理"单个迭代项"从问题到落地的完整闭环，`kit-iteration-start` 负责版本粒度的分支收尾与新版本开启，`kit-iteration-log` 负责版本/周维度的记录维护。一次 `kit-iteration-start` 收尾的版本内，通常已经过若干轮本 skill 的迭代项处理。
- worktree 中的 `node_modules` 不存在（新建 worktree 只有源码），需要跑测试/构建时在 worktree 目录重新 `npm install`，或向用户说明后借用主工作区验证。
