# 需求规格 (Specs)

本目录存放每个功能需求的规格文档。每个需求一个子目录，按以下结构组织：

```
specs/
├── README.md                        # 本文件
├── 001-periodic-reminder/           # 示例：第一个需求
│   ├── requirements.md              # 需求描述：用户故事、功能范围、验收标准
│   ├── design.md                    # 技术设计：方案选型、数据模型、接口设计
│   └── tasks.md                     # 任务拆分：开发任务清单、依赖关系、优先级
└── 002-notification-settings/       # 示例：第二个需求
    └── ...
```

## 使用流程

1. 讨论需求时，将确定的需求写入 `requirements.md`
2. 技术方案讨论后，将设计决策写入 `design.md`
3. 开发前，将任务拆分写入 `tasks.md`
4. 开发完成后，关键决策沉淀到 `.ai/context/` 中

## 命名规则

Spec 目录和对应的 Git 分支使用**统一的三位数字编号 + kebab-case 名称**：

- Spec 目录: `.ai/specs/{NNN}-{feature-name}/`
- Git 分支: `feat/{NNN}-{feature-name}`

编号从 001 开始递增，保证顺序和唯一性。

示例：
- 目录 `.ai/specs/001-periodic-reminder/` ↔ 分支 `feat/001-periodic-reminder`
- 目录 `.ai/specs/002-notification-settings/` ↔ 分支 `feat/002-notification-settings`
