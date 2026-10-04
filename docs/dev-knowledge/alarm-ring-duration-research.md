# 提醒响铃时长（循环够 30 秒）技术调研与方案

## 背景

需求：当前提醒只响一次（系统默认通知提示音，几秒钟），应改为**循环播放够 30 秒**；且时长语义应为「时长感知」——铃声不足 30 秒则循环补齐，超过 30 秒则截断。不采用「为每个目标时长生成一个定长音频文件」的做法（改 50s 就得重新生成，不可靠）。

## 调研结论

### 纯通知层（expo-notifications）做不到循环

- **Android**：通知渠道化（API 26+）后，通知声音由系统播放一次即止。`Notification.FLAG_INSISTENT` 与 `audioAttributes.setFlags` 在渠道声音上不可靠（Stack Overflow 有实证），无法实现循环播放。
- **iOS**：通知声音上限 30 秒，且**只播一次**，无循环播放的公开 API。
- 结论：跨平台纯通知层均无法实现「短音循环补齐、长音截断」。

### 成熟方案（Google Clock 等系统闹钟）的标准做法

AlarmManager 精确触发 + full-screen intent + 前台 Service 用 MediaPlayer/Ringtone `setLooping(true)` 循环播放，用户停止或超时（系统闹钟普遍约 10 分钟）自动停。**声音由原生播放器承载，不依赖通知声音**。

### 社区轮子

`react-native-alarm-notification`：有 `loopSound` API，但上游约 2021 年后停更，RN 0.85 新架构兼容性风险高；Joplin 的修复 fork 是 private 包不可直接使用。引入后踩坑大概率仍需 fork 自修，不如自研轻量模块。

## 方案（已采纳）：自研本地 Expo 模块 `modules/alarm-ring`

### 架构

- **调度**：JS 层复用现有 `computeRingDatesInRange` 计算响铃时间序列（截断上限沿用 `SCHEDULE_MAX_PER_ALARM=60`），全量同步给原生模块；原生持久化（SharedPreferences）后只排最近 1 个 `setExactAndAllowWhileIdle` PendingIntent，触发后自动排下一个。
- **可靠性**：App 被杀不影响（AlarmManager 系统级）；设备重启由 `BootReceiver` 读持久化计划重排（需 `RECEIVE_BOOT_COMPLETED`）。
- **响铃**：`RingService` 前台服务，MediaPlayer `isLooping=true` + `AudioAttributes(USAGE_ALARM)` 播放系统默认闹钟铃声（`RingtoneManager.getDefaultUri(TYPE_ALARM)`）；`Handler` 到 `ringDurationSeconds` 自动停并取消通知。改 30s→50s 只改 JS 常量。
- **通知**：RingService 发 heads-up 通知（MAX importance 渠道），带「关闭 / 稍后提醒」action；贪睡由原生直接排 `+snoozeMinutes`。full-screen intent 留待响铃页迭代。
- **平台分层**：Android 走 `modules/alarm-ring`；iOS 继续走现有 expo-notifications 路径（通知一声，差异已知）。分发收敛在 `src/services/ring-scheduler.ts`，store 层调用语义不变。

### 关键工程事实

- `/android`、`/ios` 被 gitignore，原生代码必须放在 `modules/alarm-ring/`（本地 Expo 模块，autolinking 自动编译，可提交）。
- Android 12+ 精确闹钟需 `SCHEDULE_EXACT_ALARM` 权限 + `canScheduleExactAlarms()` 检查，未授权退化为 `setAndAllowWhileIdle`（不精确但可用）。
- Android 14+ 前台服务需声明 `foregroundServiceType`（响铃用 `mediaPlayback`）+ `FOREGROUND_SERVICE_MEDIA_PLAYBACK` 权限。
- 渠道声音/通知 action 由原生侧实现，Android 不再依赖 expo-notifications 的 category；iOS 侧保留现有 category 注册。

### 验证方式

本机构建链见 `android-build-env.md`（JAVA_HOME 17 + CMake 3.31.1）。worktree 无 node_modules，构建验证借用主工作区执行 `npx expo prebuild` + `expo run:android`（模拟器 Pixel_8）。
