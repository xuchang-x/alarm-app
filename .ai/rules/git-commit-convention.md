# Git 规范

## 提交规范

遵循 Angular Commit 规范，commit message 使用**中文**。

### 格式

```
<type>(<scope>): <subject>
```

### type 取值

- feat: 新功能
- fix: Bug 修复
- docs: 文档变更
- style: 代码格式（不影响逻辑）
- refactor: 重构（非新功能、非修复）
- perf: 性能优化
- test: 测试相关
- chore: 构建、依赖、配置等杂项
- ci: CI/CD 相关

### 规则

1. scope 可选，用中文描述模块，如 `提醒`、`通知`、`首页`
2. subject 用中文，简洁描述本次变更的实质内容
3. 提交前必须梳理所有当次变更的文件，整理出有意义的 message
4. 不允许使用 "update" / "fix bug" 等笼统描述
5. 如果一次提交包含多个不相关改动，应拆分为多个 commit

### 示例

- `feat(提醒): 添加周期性提醒的创建和编辑功能`
- `fix(通知): 修复 iOS 后台通知未触发的问题`
- `chore(依赖): 升级 expo-notifications 并锁定 npm 源为官方源`

## 分支策略

- `main`: 稳定分支，保持可发布状态
- `feat/{NNN}-{name}`: 功能分支，编号与 `.ai/specs/` 下的目录一一对应
- `fix/{NNN}-{name}`: Bug 修复分支
- `chore/*`: 构建、配置等杂项分支

分支命名中的编号必须与 spec 目录编号一致，如 spec 目录为 `001-periodic-reminder`，分支即为 `feat/001-periodic-reminder`。
