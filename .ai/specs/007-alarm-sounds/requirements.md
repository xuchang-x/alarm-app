# 007 - 提示音与自定义铃声 需求规格

## 产品定位

让每个提醒有自己的声音：App 内置 10 个风格多样的提示音（刺耳/温和/自然）供逐闹钟选择，并支持从设备音乐库选本地音乐作为铃声，解决「所有提醒一个单调系统音」的问题。响铃播放由 0.0.4 落地的 alarm-ring 原生模块承载，天然继承「循环播放够 30 秒，短音循环补齐、长音截断」的时长语义。

## 目标平台

- Android（dev build）：完整功能——内置音选择 + 本地音乐铃声。
- iOS：维持现状（系统默认通知声）。本 spec 不做 iOS 响铃页，属后续迭代（见非功能需求中的平台差异说明）。
- Expo Go：提示音选择 UI 可展示但选择不生效（原生模块不可用，与现有降级策略一致）。

## 功能详述

### 1. 内置提示音库（10 个）

- **功能说明**：App 打包 10 个免版权（CC0 / Apache 2.0 / Pixabay 许可）提示音，按「刺耳 / 温和 / 自然」三档分组，每个闹钟独立配置。
- **内置清单**（来自 `docs/dev-knowledge/alarm-sound-research.md` 调研结论）：
  - 刺耳：Classic Alarm（经典双铃，默认音）、Buzzer（电子蜂鸣）、Radar Ping（尖锐脉冲）
  - 温和：Radar Soft、Marimba（马林巴）、Piano Arpeggio（钢琴琶音）、Music Box（八音盒）、Chime（风铃）
  - 自然：Birds Morning（清晨鸟鸣）、Ocean Waves（海浪）
- **交互方式**：创建/编辑闹钟表单内新增「铃声」选择项；选择器为分组列表，每项带试听按钮（点击即播放，再点停止），当前选中项有标记；默认选中 Classic Alarm。
- **格式**：Android 打包 OGG（AOSP 惯例）+ 备份 WAV；单文件目标 ≤500KB，总计预算 ≤5MB。

### 2. 本地音乐铃声（Android）

- **功能说明**：从设备音乐库（expo-media-library）选一首歌作为该闹钟的铃声，优先级高于内置音。
- **交互方式**：铃声选择器顶部提供「从音乐库选择」入口，系统音乐选择器选歌后回填显示歌名；选中本地音乐的闹钟，铃声项显示歌名而非内置音名。
- **适用场景**：用户想用喜欢的歌叫醒自己。
- **边界**：音乐文件被删除/移动后响铃回退到内置默认音（Classic Alarm），不报错；音频格式支持 MediaPlayer 全格式（MP3/M4A/OGG/FLAC/WAV 等）。

### 3. 铃声数据的调度联动

- **功能说明**：闹钟的铃声选择（内置音标识或本地音乐 URI）随响铃计划同步到原生模块，触发时 RingService 用该铃声播放。
- **交互方式**：无独立交互，属于实现层职责——编辑铃声后重新保存即重新调度。

## 数据存储

- `alarms` 表新增两列（走现有 schema 版本迁移）：
  - `sound_id TEXT`：内置音标识（如 `classic-alarm`），NULL 时取默认音
  - `custom_sound_uri TEXT`：本地音乐 content:// URI，优先级高于 sound_id
- 内置音元数据（id、名称、分组、文件名）在 `src/constants/` 以 TS 常量维护，不落库。
- 本地音乐显示名（歌名）不单独存，响铃时由原生层解析（MediaMetadataRetriever），或简化为存 URI 时同步存一次歌名（技术设计时定）。

## 非功能需求

- **响铃时长语义不变**：无论内置音还是本地音乐，循环播放够 30 秒（RING_DURATION_SECONDS）后自停，改时长只改常量。
- **音量一致性**：内置音源统一做响度归一化（-1dB 峰值），避免不同铃声忽大忽小。
- **平台差异透明**：iOS/Expo Go 上铃声选择项可展示，实际响铃仍走系统通知声，不做隐藏或禁用。
- **性能**：内置音资源计入 APK 体积（预算 ≤5MB）；试听播放器随选择器关闭释放。
- **可靠性**：本地音乐 URI 失效回退默认音；原生模块读取不到指定资源时回退系统默认闹钟铃声。

## 验收标准

> 逐条核对（2026-10-04，feat/007-alarm-sounds 分支，Pixel_8 模拟器实测 + jest/tsc 验证）：

1. 创建闹钟时可选 10 个内置提示音之一，保存后响铃播放所选音 ✅（选风铃 → DB `sound_id='chime'` → plan `soundId='ars_chime'` → 20:52:00 触发 MediaPlayer `USAGE_ALARM` 播放；10 音共用同一链路，各音资源均已在 APK 内验证存在）
2. 铃声选择器支持逐项试听，试听可随时停止 ✅（选择器实测播放/停止，MediaSession 状态确认）
3. 编辑已有闹钟的铃声，重新保存后按新铃声响 ✅（编辑保存 → 重新调度 → 触发用新铃声）
4. Android 上可从音乐库选本地歌曲作为铃声，响铃播放该歌曲（循环至 30 秒）⚠️ 部分（选歌权限→列表→回填 URI+歌名已实测；真实歌曲响铃播放未在模拟器实测本地音乐库场景，播放走 RingService 同一 MediaPlayer 循环 30s 链路，URI 失效回退已实测触发过）
5. 选了本地音乐的闹钟，列表/编辑页显示歌名 ✅（编辑页铃声项回填歌名实测）
6. 本地音乐文件被删除后，闹钟仍按时响铃（回退默认音），无崩溃 ✅（实测触发过回退路径：URI 打开失败 → 记日志 → 回退内置音正常播放，无崩溃）
7. 老数据（无铃声字段）升级后默认 Classic Alarm，行为无异常 ✅（jest 覆盖：迁移幂等、NULL 兜底、`findSoundPreset` 未知 id 兜底 DEFAULT_SOUND_ID）
8. 被杀进程/设备重启后按所选铃声响（继承 alarm-ring 可靠性）✅（铃声字段随 plan 持久化 SharedPreferences，force-stop 后触发正常响铃实测；BootReceiver 重排为 0.0.4 既有能力）
9. 内置音总体积 ≤5MB，构建通过 ✅（实际 416KB；tsc strict 无错、101 jest 用例全绿、assembleDebug 通过）
10. iOS/Expo Go 上功能不报错，响铃行为维持现状 ⚠️ 代码层保障（expo-notifications 降级路径保留、UI 可展示不隐藏；未在 Expo Go 环境实测）

验收标准第 4/10 条残留项均不阻塞本迭代收尾，见上方「iOS 落后项清单」与「后续扩展」。

## 后续扩展（不在本 spec 范围）

- 音量渐强（gentle wake up）
- iOS 响铃页 + 本地音乐支持
- 铃声试听音量与响铃音量分离设置

## iOS 落后项清单（未来开发 iOS 时必读）

本项目 Android 先行，iOS 在多个能力上落后，后续启动 iOS 开发时需逐项补齐。当前清单（随迭代更新）：

### 响铃能力（0.0.4 起）

- Android 已落地 alarm-ring 原生模块（循环播放够 30 秒、App 被杀/重启可靠、贪睡原生重排）；iOS 仍是 expo-notifications 一声提示音，无时长控制
- iOS 需自建：精确触发用 `UNUserNotificationCenter` + 后台任务保活或 silent push（无 AlarmManager 等价物，是最大难点），响铃页 + AVAudioPlayer 循环播放
- iOS 通知声音上限 30 秒且只播一次，无法靠通知层实现循环

### 提示音与铃声（007 起）

- 内置 10 音选择与本地音乐铃声均为 Android only；iOS 铃声选择 UI 可展示但不生效
- iOS 需自建：响铃页内播放内置音/本地音乐（需音乐库权限 `NSAppleMusicUsageDescription`）；本地音乐做「通知铃声」不可行（打包限制），只能走响铃页方案

### 其他已知差异

- 通知 category（贪睡/关闭按钮）在 iOS 走 expo-notifications 的 category 机制，行为与 Android 原生 action 不一致（如贪睡后声音立即停 vs 持续响）
- 设备重启重排：Android 有 BootReceiver；iOS 依赖系统通知调度本身存续，无等价机制但通知不丢
- dev build 仅 Android（ios/ 目录被 gitignore，iOS 原生工程未初始化）
