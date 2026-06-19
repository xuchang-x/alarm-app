# 需求规格 (Specs)

本目录存放每个功能需求的规格文档。每个需求一个子目录，按以下结构组织：

```
specs/
├── README.md              # 本文件
└── {feature-name}/        # 按功能命名的子目录
    ├── requirements.md    # 需求描述：用户故事、功能范围、验收标准
    ├── design.md          # 技术设计：方案选型、数据模型、接口设计
    └── tasks.md           # 任务拆分：开发任务清单、依赖关系、优先级
```

## 使用流程

1. 讨论需求时，将确定的需求写入 `requirements.md`
2. 技术方案讨论后，将设计决策写入 `design.md`
3. 开发前，将任务拆分写入 `tasks.md`
4. 开发完成后，关键决策沉淀到 `.ai/context/` 中

## 命名规则

子目录使用 kebab-case，如 `periodic-reminder`、`notification-settings`。
