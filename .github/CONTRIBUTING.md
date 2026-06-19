# 贡献指南

## 分支策略

- `main`: 稳定分支，始终保持可发布状态
- `feat/*`: 功能开发分支，从 main 拉出，完成后 PR 回 main
- `fix/*`: Bug 修复分支
- `chore/*`: 构建、配置等杂项

## 开发流程

1. 从 `main` 创建功能分支: `git checkout -b feat/your-feature`
2. 开发并提交（遵循 Angular 提交规范，message 使用中文）
3. 推送分支并创建 Pull Request
4. Review 通过后合并到 `main`

## 提交规范

使用 Angular Commit 规范，message 使用中文。格式如下:

```
<type>(<scope>): <subject>
```

type 取值: feat / fix / docs / style / refactor / perf / test / chore / ci

示例:
- `feat(提醒): 添加周期性提醒创建功能`
- `fix(通知): 修复 iOS 通知权限未正确请求的问题`
- `docs(文档): 更新 SDD 功能需求章节`
- `chore(依赖): 升级 expo-notifications 到最新版本`
