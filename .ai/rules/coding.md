# 编码规范

## 语言与框架

- 使用 TypeScript strict mode，不允许 any 类型逃逸
- 组件使用函数式组件 + Hooks，不使用 Class 组件
- 样式使用 React Native 的 StyleSheet.create，不使用内联样式对象

## Expo 特别注意

- Expo SDK 版本为 56，**必须**查阅 https://docs.expo.dev/versions/v56.0.0/ 的文档，不要使用已废弃的 API
- 保持 Managed Workflow，不引入需要原生编译的依赖

## 命名规范

- 文件名：组件用 PascalCase（如 `ReminderCard.tsx`），工具函数用 camelCase（如 `formatDate.ts`）
- 变量/函数：camelCase
- 类型/接口：PascalCase，接口不加 `I` 前缀
- 常量：UPPER_SNAKE_CASE

## 项目结构

- 路由页面放 `app/`（expo-router 文件系统路由）
- 可复用组件放 `src/components/`
- 业务逻辑用自定义 Hook 封装在 `src/hooks/`
- 状态管理放 `src/store/`
- 数据库操作放 `src/db/`
- 服务层放 `src/services/`
- 类型定义集中在 `src/types/`
- 常量放 `src/constants/`
- 工具函数放 `src/utils/`
- 使用 `@/*` 路径别名引用 `src/` 下的模块（如 `@/types/alarm`）
