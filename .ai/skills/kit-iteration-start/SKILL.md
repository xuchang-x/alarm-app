---
name: kit-iteration-start
description: 开迭代助手。收尾当前迭代（补迭代记录 → 提交当前工作区改动 → push 当前分支 → 合并进 master 并 push）并按迭代粒度（小/中/大，默认小）bump 版本号（package.json 与 app.json 两处同步修改），在 master 上落地新版本号并 push。当用户说「开个迭代」「开一个小迭代」「开个中迭代」「开个大迭代」「开新迭代」「开始下一个版本」「版本收尾」时使用。
---

## 用户输入

```text
$ARGUMENTS
```

## 概述

本 skill 是 `kit-iteration-log`（迭代记录维护）的下游动作：一次迭代收尾时，先确保记录补全，再完成分支合并与版本号 bump。

`$ARGUMENTS` 用于指定本次开的迭代粒度，默认**小迭代**：

| 粒度 | 触发词示例 | 版本变化规则 | 示例 |
|------|------------|--------------|------|
| 小迭代（默认） | 未指定 / "小迭代" | 最后一位（patch）+1 | `0.0.2` → `0.0.3` |
| 中迭代 | "中迭代" / "中等迭代" | 中间一位（minor）+1，最后一位归 0 | `0.0.2` → `0.1.0` |
| 大迭代 | "大迭代" | 第一位（major）+1，中间和最后一位归 0 | `0.2.3` → `1.0.0` |

## 前置检查

- 在仓库根目录执行，确认 `git rev-parse --show-toplevel` 结果为本仓库根路径。
- 记录当前分支名（`git branch --show-current`），后续所有步骤以此为"当前迭代分支"。本项目迭代分支通常是 `feat/{NNN}-{name}` 格式（编号与 `.ai/specs/` 目录一一对应），也可能是 `fix/` 或 `chore/` 分支。若当前分支就是 `master`，需先向用户确认是否仍要继续，避免误把 master 当迭代分支处理。
- 本项目主分支实际为 `master`（`.ai/rules/git-commit-convention.md` 中写的 `main` 与仓库实际不一致，以实际为准；若仓库实际主分支不是 master，停下来向用户确认）。
- 若工作区存在冲突标记、未完成的 rebase/merge（`git status` 中出现 `Unmerged paths`），必须先停下来让用户处理，不得继续。

## 执行步骤

### 1. 补全迭代记录

调用 `kit-iteration-log` skill，确保当前版本（bump 前的旧版本号）对应的 `docs/iteration/release/{旧version}.md`，以及覆盖当前时间的周迭代日志都已按最新变更更新完毕。这一步必须在提交工作区之前完成，确保迭代记录本身也随本次提交一并归档。

### 2. 提交当前工作区改动

```bash
git status --short
```

- 若为空（无任何改动），跳过本步，直接进入步骤 3。
- 若有改动，按 `.ai/rules/git-commit-convention.md`（Angular 规范 + 中文 message，多个不相关改动拆分多个 commit）执行：

```bash
git add <本次改动涉及的文件>   # 不要无脑 -A，先梳理变更文件，避免夹带无关产物
git commit -F - <<'EOF'
{type}({scope}): {中文描述本次收尾提交的核心内容}
EOF
```

不使用 `git commit -m "多行文本"` 的写法，统一用 `-F -` 配合 heredoc。

### 3. push 当前分支

```bash
git push origin <当前分支名>
```

若该分支尚无上游，改用 `git push --set-upstream origin <当前分支名>`。若 push 失败（如 non-fast-forward），如实报告错误并停下来询问用户如何处理，不擅自执行可能覆盖远程历史的操作。

### 4. 合并当前分支进 master 并 push

```bash
git fetch origin master
git checkout master
git merge origin/master --ff-only   # 确保本地 master 与远程一致，避免基于过期 master 合并
git merge --no-ff <当前迭代分支名>
```

- **合并冲突**：如果产生冲突，必须停下来：执行 `git status` 列出冲突文件，如实报告给用户，等待用户明确指示如何解决，不能自作主张选择某一方内容强行合并；冲突解决并 `git add` 后，由用户或按用户指示执行 `git commit` 完成合并。
- 合并成功后：

```bash
git push origin master
```

若 push 失败，执行 `git fetch origin master` 重新确认后再决定处理方式，不擅自强推（`--force`）。

- 合并完成后可按需保留或删除已合并的迭代分支（本地 + 远端），删除前先询问用户，不擅自删除。

### 5. 计算新版本号

本项目没有 release 分支体系，版本号基准来源是**所有远端分支中最大的版本号**，而不只是 `origin/master`——可能存在已开出但尚未合并的迭代分支。

```bash
git fetch origin
# 扫描所有远端分支上 package.json 的 version，取语义版本最大值
for ref in $(git branch -r --format='%(refname:short)' | grep -v HEAD); do
  git show "${ref}:package.json" 2>/dev/null | grep -m1 '"version"'
done
```

同时读取 `origin/master` 上的版本号（`git show origin/master:package.json | grep '"version"'`），取所有分支中的最大值作为基准版本。若找不到任何可用来源（极端情况），停下来向用户报告。

按 `major.minor.patch` 三段解析（严格校验为纯数字三段，格式异常时停下来向用户报告，不擅自猜测修正）。

根据 `$ARGUMENTS` 判断的迭代粒度（默认小迭代）计算新版本号：

- **小迭代**（默认）：`patch = patch + 1`，`major`、`minor` 不变。
- **中迭代**：`minor = minor + 1`，`patch = 0`，`major` 不变。
- **大迭代**：`major = major + 1`，`minor = 0`，`patch = 0`。

### 6. 在 master 上落地新版本号

本项目的版本号存放在**两处**，必须同步修改，避免 App 构建版本与依赖版本漂移：

- `package.json` 的 `"version"` 字段
- `app.json` 的 `expo.version` 字段

```bash
# 确认当前在 master 且工作区干净
git add package.json app.json
git commit -F - <<'EOF'
chore(构建): 版本号更新至 <新版本号>
EOF
git push origin master
```

完成后停留在 master。下一步开发通常从新需求开始：可提示用户用 `kit-requirement-research` 调研新需求并按 `.ai/specs/` 规范建立新 spec 目录与 `feat/{NNN}-{name}` 分支，或直接在 master 上继续小改动。

### 7. 完成汇报

```
✅ 迭代收尾 + 新迭代已开启

迭代记录：已通过 kit-iteration-log 补全 {旧版本号} 版本日志/周迭代日志（如无需更新则注明"本次无变更需要记录"）
提交：<列出本次提交的 commit，若步骤2无改动则注明"工作区无未提交改动，跳过">
分支合并：<当前迭代分支> → master（<注明是否有冲突及如何解决>）
新版本：<旧版本号> → <新版本号>（<迭代粒度>，package.json 与 app.json 已同步）
当前分支：master（新版本号 commit 已 push）
```

## 核心约束

- **不擅自处理冲突**：master 合并冲突必须原样报告给用户，等待明确指示。
- **不擅自强推**：任何 push 失败场景都不允许使用 `--force`/`--force-with-lease`，只能报告并询问用户。
- **版本号解析严格校验**：版本号不符合 `x.y.z` 纯数字三段格式时必须停下来报告，不擅自"修正"或猜测。
- **两处版本号必须同步改**：只改 `package.json` 漏改 `app.json`（或反之）视为未完成。
- **顺序不可颠倒**：必须先补全迭代记录、提交、push、合并 master 成功之后，才能进行版本号 bump；不允许在迭代分支还有未提交/未合并改动的情况下就动版本号。
- **bump commit 只改版本号**：不要在这个 commit 里夹带其他文件改动，保持"版本号 bump"提交的原子性和历史可读性。
- **不擅自删除已合并分支**：删除本地/远端迭代分支前必须征得用户同意。

## 注意事项

- 与 `kit-iteration-log` 配套使用：`kit-iteration-log` 负责"记录内容"，本 skill 负责"记录归档时机的触发 + 分支/版本号流转"，两者职责不重叠。
- 与 `kit-iteration-item` 的关系：`kit-iteration-item` 处理"单个迭代项"（独立 worktree 中完成方案与实施），若干个迭代项合并完后，用本 skill 做整代收尾。
