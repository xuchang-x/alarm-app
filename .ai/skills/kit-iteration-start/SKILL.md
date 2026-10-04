---
name: kit-iteration-start
description: 开迭代助手。收尾当前迭代（补迭代记录 → 提交当前工作区改动 → push 当前分支 → 合并进当前 release/x.y.z 分支 → release 分支合并进 master 并 push），随后从 master 切出新的 release/{新版本号} 分支并按迭代粒度（小/中/大，默认小）bump 版本号（package.json 与 app.json 两处同步修改），bump 只发生在 release 分支上，master 的版本号永远等于已收尾版本。当用户说「开个迭代」「开一个小迭代」「开个中迭代」「开个大迭代」「开新迭代」「开始下一个版本」「版本收尾」时使用。
---

## 用户输入

```text
$ARGUMENTS
```

## 概述

本 skill 是 `kit-iteration-log`（迭代记录维护）的下游动作：一次迭代收尾时，先确保记录补全，再完成分支合并与版本号 bump。

本项目采用 **release 分支模式**管理版本号流转：

- **master**：只承载已收尾版本的内容，版本号永远等于「最后一个已收尾版本」；不允许在 master 上直接提交功能代码。
- **release/x.y.z**：一个迭代一条 release 分支，是迭代期间的集线分支（集成分支）。版本号 bump **只发生在 release 分支上**（从 master 切出后第一步就 bump），迭代内的 feat 分支、`kit-iteration-item` 的 worktree 分支都合并进它。整个迭代周期内 release 分支上的 package.json 稳定写着本迭代版本号，期间任何 dev build 都正确标注版本。
- **收尾**：下次「开迭代」时，当前 release 分支整体合并进 master——此时 master 的版本号才追上该版本内容，语义上「版本号超前于内容」的状态只存在于 release 分支上，不出现在 master。

`$ARGUMENTS` 用于指定本次开的迭代粒度，默认**小迭代**：

| 粒度 | 触发词示例 | 版本变化规则 | 示例 |
|------|------------|--------------|------|
| 小迭代（默认） | 未指定 / "小迭代" | 最后一位（patch）+1 | `0.0.2` → `0.0.3` |
| 中迭代 | "中迭代" / "中等迭代" | 中间一位（minor）+1，最后一位归 0 | `0.0.2` → `0.1.0` |
| 大迭代 | "大迭代" | 第一位（major）+1，中间和最后一位归 0 | `0.2.3` → `1.0.0` |

## 前置检查

- 在仓库根目录执行，确认 `git rev-parse --show-toplevel` 结果为本仓库根路径。
- 本项目主分支实际为 `master`（`.ai/rules/git-commit-convention.md` 中写的 `main` 与仓库实际不一致，以实际为准；若仓库实际主分支不是 master，停下来向用户确认）。
- **定位当前活跃 release 分支**：

```bash
git fetch origin
# 扫描本地与远端的 release/* 分支
git branch -a --format='%(refname:short)' | grep -E '(^|/)release/' | sed 's|^origin/||' | sort -u
```

- 正常情况应恰好存在一条活跃 release 分支（`release/x.y.z`），记为 `RELEASE_BRANCH`。若无（历史遗留或首次接入该模式）：以 `origin/master` 的版本号为「当前收尾版本」，跳过步骤 4 中"合并 release 进 master"部分，向用户说明后继续；若有多条，向用户确认哪条是当前迭代的收尾对象。
- 记录当前分支名（`git branch --show-current`），后续以此为"当前工作分支"（可能是 feat 分支、release 分支本身或 master）。若当前分支是 `master` 且工作区有未提交改动，需先向用户确认如何处置，避免误把 master 当工作分支处理。
- 若工作区存在冲突标记、未完成的 rebase/merge（`git status` 中出现 `Unmerged paths`），必须先停下来让用户处理，不得继续。

## 执行步骤

### 1. 补全迭代记录

调用 `kit-iteration-log` skill，确保**当前收尾版本**（`RELEASE_BRANCH` 上的版本号）对应的 `docs/iteration/release/{收尾版本}.md`，以及覆盖当前时间的周迭代日志都已按最新变更更新完毕。这一步必须在提交工作区之前完成，确保迭代记录本身也随本次提交一并归档。

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

### 3. push 当前工作分支

```bash
git push origin <当前工作分支名>
```

若该分支尚无上游，改用 `git push --set-upstream origin <当前工作分支名>`。若 push 失败（如 non-fast-forward），如实报告错误并停下来询问用户如何处理，不擅自执行可能覆盖远程历史的操作。

### 4. 合并进当前 release 分支，再合并进 master 并 push

**4a. 当前工作分支 → `RELEASE_BRANCH`**（当前工作分支就是 release 分支本身时跳过）：

```bash
git checkout <RELEASE_BRANCH>
git merge --no-ff <当前工作分支名>
git push origin <RELEASE_BRANCH>
```

**4b. `RELEASE_BRANCH` → master**：

```bash
git fetch origin master
git checkout master
git merge origin/master --ff-only   # 确保本地 master 与远程一致，避免基于过期 master 合并
git merge --no-ff <RELEASE_BRANCH>
git push origin master
```

- **合并冲突**（4a 或 4b 任一处）：必须停下来：执行 `git status` 列出冲突文件，如实报告给用户，等待用户明确指示如何解决，不能自作主张选择某一方内容强行合并；冲突解决并 `git add` 后，由用户或按用户指示执行 `git commit` 完成合并。
- 若 push 失败，执行 `git fetch origin` 重新确认后再决定处理方式，不擅自强推（`--force`）。
- 收尾合并后可按需打 tag（`git tag v{收尾版本号} && git push origin v{收尾版本号}`），打不打先询问用户。
- 已合并的旧 release 分支与 feat 分支可按需保留或删除（本地 + 远端），删除前先询问用户，不擅自删除。

### 5. 计算新版本号

版本号基准来源是**所有远端分支（含 master 与各 release 分支）中最大的版本号**：

```bash
git fetch origin
# 扫描所有远端分支上 package.json 的 version，取语义版本最大值
for ref in $(git branch -r --format='%(refname:short)' | grep -v HEAD); do
  git show "${ref}:package.json" 2>/dev/null | grep -m1 '"version"'
done
```

若找不到任何可用来源（极端情况），停下来向用户报告。

按 `major.minor.patch` 三段解析（严格校验为纯数字三段，格式异常时停下来向用户报告，不擅自猜测修正）。

根据 `$ARGUMENTS` 判断的迭代粒度（默认小迭代）计算新版本号：

- **小迭代**（默认）：`patch = patch + 1`，`major`、`minor` 不变。
- **中迭代**：`minor = minor + 1`，`patch = 0`，`major` 不变。
- **大迭代**：`major = major + 1`，`minor = 0`，`patch = 0`。

### 6. 从 master 切新 release 分支并在其上 bump 版本号

本项目的版本号存放在**两处**，必须同步修改，避免 App 构建版本与依赖版本漂移：

- `package.json` 的 `"version"` 字段
- `app.json` 的 `expo.version` 字段

```bash
# 确认当前在刚 push 完的 master 上且工作区干净
git checkout -b release/<新版本号> master
# 编辑 package.json 与 app.json 两处版本号
git add package.json app.json
git commit -F - <<'EOF'
chore(构建): 版本号更新至 <新版本号>
EOF
git push --set-upstream origin release/<新版本号>
```

完成后**停留在新的 `release/<新版本号>` 分支**。后续开发以它为集线：正式需求按 `.ai/specs/` 规范建 `feat/{NNN}-{name}` 分支，完成后合并进 release 分支；零散迭代项用 `kit-iteration-item` 处理（其合并目标自动指向当前活跃 release 分支）。

### 7. 完成汇报

```
✅ 迭代收尾 + 新迭代已开启

迭代记录：已通过 kit-iteration-log 补全 {收尾版本号} 版本日志/周迭代日志（如无需更新则注明"本次无变更需要记录"）
提交：<列出本次提交的 commit，若步骤2无改动则注明"工作区无未提交改动，跳过">
分支合并：<当前工作分支> → <RELEASE_BRANCH> → master（<注明是否有冲突及如何解决>）<tag 如有>
新版本：<收尾版本号> → <新版本号>（<迭代粒度>，package.json 与 app.json 已同步，bump 落于 release/<新版本号>）
当前分支：release/<新版本号>（集线分支，feat/item 分支合并目标）
```

## 核心约束

- **不擅自处理冲突**：任何合并冲突必须原样报告给用户，等待明确指示。
- **不擅自强推**：任何 push 失败场景都不允许使用 `--force`/`--force-with-lease`，只能报告并询问用户。
- **版本号解析严格校验**：版本号不符合 `x.y.z` 纯数字三段格式时必须停下来报告，不擅自"修正"或猜测。
- **两处版本号必须同步改**：只改 `package.json` 漏改 `app.json`（或反之）视为未完成。
- **bump 只发生在 release 分支上，master 不做版本号提交**：master 的版本号只随"release 分支整体合并进 master"前进，保证 master 版本号永远等于已收尾版本内容。
- **顺序不可颠倒**：必须先补全迭代记录、提交、push、release 分支合并进 master 成功之后，才能切新 release 分支做 bump；不允许迭代还有未提交/未合并改动时就动版本号。
- **bump commit 只改版本号**：不要在这个 commit 里夹带其他文件改动，保持"版本号 bump"提交的原子性和历史可读性。
- **不擅自删除已合并分支 / 打 tag**：删除本地/远端迭代分支、打 tag 前必须征得用户同意。

## 注意事项

- 与 `kit-iteration-log` 配套使用：`kit-iteration-log` 负责"记录内容"，本 skill 负责"记录归档时机的触发 + 分支/版本号流转"，两者职责不重叠。
- 与 `kit-iteration-item` 的关系：`kit-iteration-item` 处理"单个迭代项"（独立 worktree 中完成方案与实施，合并目标是当前活跃 release 分支），若干个迭代项合并完后，用本 skill 做整代收尾。
- 历史遗留：master 上存在早于该模式建立的功能提交（版本号当时的口径为"bump 后归新版本"），属正常现象，不需要回溯整理；从首个 release 分支建立后即按本模式流转。
