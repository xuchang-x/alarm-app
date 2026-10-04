# 提示音调研：格式惯例与 20 个候选提示音

为「内置 10 个提示音 + 支持本地音乐铃声」迭代准备的调研。分三部分：业界格式惯例、音源版权渠道、20 个候选提示音清单。

## 一、业界格式惯例

### 系统与主流 App 用什么格式

| 平台/产品 | 格式 | 说明 |
|---|---|---|
| Android 系统铃声/闹钟（AOSP） | OGG Vorbis | 系统内置铃声的标准格式，音量循环点（LOOP 元数据）写在文件头 |
| Google Clock | OGG（内置）+ 任意格式（用户自选） | 用户选本地音乐时不限格式，播放由 MediaPlayer 承载 |
| iOS 系统铃声 | M4R（AAC） | 来电铃声 40s 上限；**通知提示音 30s 上限**且只播一次 |
| iOS 通知自定义音 | CAF / WAV（打包进 App） | expo-notifications 官方推荐 .wav |
| RN/Expo 生态 | WAV（打包）、MP3（运行时播放） | 通知层打包用 WAV；本地音乐播放用 expo-audio，格式随源文件 |

### 对本项目的落地结论

- **打包内置提示音**：Android 端 OGG（体积小、AOSP 惯例）+ 备一份 WAV（expo-notifications 插件 sounds 数组用，双保险）；iOS 通知路径用 WAV（30s 上限，正好等于我们的响铃时长）。
- **响铃播放**：已由本次迭代的 `modules/alarm-ring` RingService 承载（MediaPlayer 循环 + 到时自停），**任何 MediaPlayer 支持的格式都能当铃声**（MP3/M4A/OGG/FLAC/WAV 等），这正是「本地音乐铃声」的播放地基。
- **时长感知已实现**：短音循环补齐、长音截断 30 秒（`RING_DURATION_SECONDS` 常量），不需要为每档时长生成专用文件。
- **响度建议**：提示音源文件做 -1dB 峰值归一化，避免不同音源响度忽大忽小；提示音优先选 44.1kHz（Android 官方建议，48→44.1 降采样无低通）。

### 提示音设计惯例（来自 Google Clock / Samsung Clock / iOS 时钟）

分类维度基本固定三档：**刺耳型**（传统闹钟铃、蜂鸣，叫醒重度睡眠者）、**温和型**（旋律、自然音、渐强，日常提醒）、**特殊型**（人声、白噪音、电台）。内置音普遍 10~20 个，默认音多为温和渐强型。渐强（gentle volume）是主流 App 标配，可作为后续迭代项。

## 二、音源版权渠道

| 渠道 | 许可 | 说明 |
|---|---|---|
| Pixabay Sound Effects | Pixabay 许可（≈CC0，可商用免署名） | 首选，量大，直接下载 |
| Mixkit | 免费商用无需署名 | 分类细（alarm/UI/notification），MP3/WAV |
| Freepd | CC0 | 公共领域音乐 |
| Sonniss GDC | 免费商用无需署名 | 游戏音效大包，质量高 |
| AOSP 开源铃声 | Apache 2.0 | Android 系统自带铃声源码可复用（如 classic alarm 类） |

避坑：Zedge 是 UGC 平台版权混杂，不做商用内置音源；Freesound 部分许可是 CC BY-NC（禁商用），只选 CC0 项。

## 三、20 个候选提示音清单

设计原则：覆盖「刺耳/温和/特殊」三档 + 与闹钟语义匹配（循环友好：首尾可无缝衔接或短音自然重复）。均为可直接从上述渠道获得的类型，标注建议来源与目标时长。

### 刺耳型（叫醒重睡者）

1. **Classic Alarm** — 传统双铃机械闹钟「叮铃铃」，AOSP/AOSP 同类（Apache 2.0），约 3~5s 循环
2. **Buzzer** — 电子蜂鸣持续音，短促高穿透，Pixabay/ Mixkit "alarm buzzer"，约 2s 循环
3. **Beep Beep** — 经典两声短哔（老年手机风），Mixkit，约 1s 循环
4. **Radar Ping** — 尖锐雷达音（iOS 「雷达」风格），Mixkit，约 2s 循环
5. **School Bell** — 电铃连续响，Pixabay，约 4s 循环
6. **Fire Alarm** — 火警式变调警鸣，Pixabay，约 3s 循环

### 温和型（日常提醒主力）

7. **Radar Soft** — 温和版脉冲音（默认音候选），Mixkit，约 2s 循环
8. **Marimba** — 马林巴琴短乐句（iOS 风格），Pixabay，约 5s 循环
9. **Piano Arpeggio** — 钢琴琶音渐强，Mixkit，约 6s
10. **Music Box** — 八音盒旋律，Pixabay，约 8s
11. **Chime** — 风铃/管钟单敲余韵，Mixkit，约 4s
12. **Bell Tower** — 教堂钟/钟楼声，Pixabay，约 6s
13. **Gentle Guitar** — 木吉他分解和弦，Mixkit，约 8s
14. **Sunrise Pad** — 合成器长音渐强（Google Clock 「晨光」风格），Mixkit，约 10s

### 自然音型

15. **Birds Morning** — 清晨鸟鸣，Pixabay，约 10s
16. **Ocean Waves** — 海浪拍岸循环，Pixabay，约 10s（循环天然无缝）
17. **Forest Stream** — 溪流水声，Pixabay，约 10s

### 特殊型

18. **Digital Watch** — 电子表整点报时「嘀」声，Pixabay，约 1s 循环
19. **Retro Game** — 8-bit 游戏音效旋律，Mixkit，约 4s 循环
20. **Voice Chime** — 人声「该起床啦」风格提示（需确认商用授权的人声包），备选方案：合成语音或跳过

### 建议入选的 10 个（下迭代决策用）

覆盖三档且循环友好：Classic Alarm、Buzzer、Radar Ping（刺耳 3）；Radar Soft、Marimba、Piano Arpeggio、Music Box、Chime（温和 5，Radar Soft 为默认音）；Birds Morning、Ocean Waves（自然 2）。Voice Chime 因授权复杂度暂缓，Retro Game 与 Bell Tower 作为候补。

## 四、与本地音乐铃声的衔接

- 选音入口：expo-document-picker / expo-media-library 选本地音频，取 file:// URI 传给原生模块扩展字段 `soundUri`（RingService 的 MediaPlayer setDataSource 直接支持 file:// 与 content://）。
- 预览试听：expo-audio 播放所选片段。
- 数据模型：alarms 表加 `soundId`（内置音标识）与 `customSoundUri`（本地音乐，优先级高于 soundId）两列，DB 迁移走现有 schema 版本机制。
- iOS 边界：本地音乐做**通知铃声**不可行（打包限制），只能走响铃页 + expo-audio 路径，属于 iOS 响铃页迭代范畴，先在 Android 落地。
