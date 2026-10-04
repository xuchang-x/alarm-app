# Expo 的两种运行方式：Expo Go 与 Dev Build

## 一句话结论

闹钟 App 依赖 `expo-notifications` 做到点提醒，而通知功能在 Expo Go 里不可用，所以本项目**必须用 Dev Build 跑**，Expo Go 只能当「纯界面预览器」用。

## Expo Go 是什么，为什么它不行

Expo Go 是一个装在手机/模拟器上的「通用容器 App」，所有项目共用它，你的代码没有自己的原生层。这带来两个限制：

1. 通知能力被官方砍掉了。从 SDK 53 起，`expo-notifications` 在 Expo Go 里大面积不可用；即便部分能力保留，通知也是记在 Expo Go 名下而不是你的 App 名下，对于闹钟这种「应用身份很重要」的场景没有意义。
2. 需要精确后台调度的功能（闹钟、后台任务、推送）在共享容器里天然不可靠。

项目里 `src/services/notification.ts` 开头的 `try { require('expo-notifications') } catch` 就是预判了这一点：模块加载失败时静默降级为空操作。坑在于降级是「安静」的，App 界面上毫无提示，这就是当年「设了闹钟到点没反应」的直接原因。

## 三种启动命令的区别

| 命令 | 干什么 | 什么时候用 |
|---|---|---|
| `npx expo start` | 只启动 Metro（JS 打包服务器），不碰原生 | 配合 Dev Build 日常热更新 |
| `npx expo start --android` | 启动 Metro 并让设备上的 Expo Go 打开项目 | 纯 JS 项目 + Expo Go 时代的老脚本，**本项目已弃用** |
| `npx expo run:android` | 编译原生工程 → 装 Dev Build 到设备 → 启动 App → 连 Metro | 原生代码或原生依赖变更后（`package.json` 里 `npm run android` 就是它） |
| `npx expo start --dev-client` | 启动 Metro，等 Dev Build 来连接 | Dev Build 已装好后的日常开发，热更新快 |

典型节奏：改了 JS/TS 代码用 `expo start --dev-client`（秒级热更新）；改了 `app.json`、装了新的原生依赖、改了包名，就重新 `npx expo prebuild -p android` 再 `npx expo run:android`。

## 相关的坑

- Expo Go 里降级无提示：保存闹钟时如果通知不可用，界面上应该有明确提示（TODO：目前只有 console.warn）。
- 改 `app.json` 的 `android.package` 后要重新 prebuild，且对新包名的 App 来说通知权限要重新授权一次。
