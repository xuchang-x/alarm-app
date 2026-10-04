# 007 - 提示音与自定义铃声 技术设计

对应需求：[requirements.md](./requirements.md)。前置调研：`docs/dev-knowledge/alarm-sound-research.md`、`docs/dev-knowledge/alarm-ring-duration-research.md`。

## 技术选型总览

| 决策点 | 选择 | 理由 |
|---|---|---|
| 内置音打包方式 | 模块 `android/src/main/res/raw/` 资源 | alarm-ring 模块自带资源，RingService 用 `raw 资源 ID` 播放，无需 JS bundle 参与；OGG 体积小 |
| 试听播放 | expo-audio | 官方推荐（expo-av 已废弃），支持 require() 打包资源与本地 URI |
| 本地音乐选取 | expo-media-library + expo-document-picker 兜底 | 需求已定音乐库选歌；Android 13+ 媒体权限粒度下 document-picker 作降级入口 |
| 内置音元数据 | `src/constants/sounds.ts` TS 常量 | id/name/分组/资源映射单一事实源，UI 与调度层共用 |
| 本地音乐歌名 | 存库（`custom_sound_title`） | 响铃由原生层播放，URI 解析标题需异步查询且 content URI 可能失效；存库保证列表/编辑页同步展示零成本 |

**不引入** expo-av（SDK 56 已废弃）；不用 Notification.channels 声音机制（播放由 RingService 承载，与 0.0.4 架构一致）。

## 数据模型

### DB 迁移（沿用 schema.ts 的幂等 PRAGMA 模式）

`alarms` 表新增三列：

```sql
sound_id           TEXT,              -- 内置音标识，NULL = 默认音 classic-alarm
custom_sound_uri   TEXT,              -- 本地音乐 content:// URI，优先级高于 sound_id
custom_sound_title TEXT               -- 选歌时的歌名快照（展示用）
```

迁移函数 `ensureSoundColumns(db)`：`PRAGMA table_info` 检测缺列则 `ALTER TABLE ADD COLUMN`，老数据 NULL → 读取时兜底 `classic-alarm`，无需 UPDATE 回填。

### 类型层

`Alarm` 接口新增 `soundId: string | null`、`customSoundUri: string | null`、`customSoundTitle: string | null`；`CreateAlarmInput`/`UpdateAlarmInput` 同步补可选字段。repository 的行映射补三字段（snake_case ↔ camelCase）。

### 内置音常量 `src/constants/sounds.ts`

```ts
export interface SoundPreset {
  id: string;            // 'classic-alarm'
  name: string;          // '经典闹钟'
  group: 'sharp' | 'gentle' | 'nature';
  /** Android 模块 res/raw 资源名（同 id） */
  rawName: string;
}
export const SOUND_PRESETS: readonly SoundPreset[] = [...10 项];
export const DEFAULT_SOUND_ID = 'classic-alarm';
```

## 核心流程设计

### 1. 铃声选择与保存链路

```
AlarmForm 新增「铃声」字段
  → SoundPickerModal（分组列表 + 试听 + 「从音乐库选择」入口）
      试听：expo-audio createAudioPlayer(require('...raw 资源'))  ← 试听走 JS 层
      本地音乐：expo-media-library requestPermissionAsync + MediaLibrary.getAssetsAsync({ mediaType: 'audio' })
        → 系统选择列表（简化：getAssetsAsync 前 500 首 + 搜索，或直接走系统 picker UI）
  → 保存时写 soundId / customSoundUri+customSoundTitle 三字段
  → store.updateAlarm → repo 落库 → scheduleAlarmRinging(alarm)
```

### 2. 调度链路（ring-scheduler 扩展）

`computeTriggerTimestamps` 旁新增计划字段透传：

```ts
await native.syncAlarms([{
  ...原有字段,
  soundId: alarm.customSoundUri ? null : (alarm.soundId ?? DEFAULT_SOUND_ID),
  soundUri: alarm.customSoundUri ?? null,   // content:// URI 优先
}])
```

原生 `RingPlan` 增加 `soundId: String?`、`soundUri: String?`；SharedPreferences JSON 同步增加两字段（向后兼容：旧持久化数据 optString 缺省 null → 默认音）。

### 3. 原生播放链路（RingService 扩展）

```
resolveSoundUri(plan):
  1. plan.soundUri 非空 → 检查可解析（ContentResolver openInputStream 探测）
     ├─ 可用 → setDataSource(context, uri)
     └─ 失效 → 记日志，走 3
  2. plan.soundId 非空 → resources.getIdentifier(soundId, 'raw', packageName)
     ├─ 命中 → raw 资源 URI（android.resource://pkg/raw/xxx）
     └─ 未命中（模块版本错位等）→ 走 3
  3. 兜底 → RingtoneManager.getDefaultUri(TYPE_ALARM)（现状行为）
```

回退链保证验收 6/可靠性与验收 8（任何一层失效都不中断响铃）。`isLooping=true` 与 30 秒自停逻辑不变。

### 4. 试听播放器生命周期

SoundPickerModal 内 `useSoundPreview` hook：expo-audio `createAudioPlayer`，单实例复用切换源，卸载/关闭时 `player.release()`；试听音量走媒体流（不占 ALARM 音量），与系统行为一致。

## 模块与依赖变更

- `package.json`：新增 `expo-audio`、`expo-media-library`（均 SDK 56 兼容版本，`npx expo install`）
- `modules/alarm-ring/`：
  - `res/raw/` 新增 10 个 OGG 资源（命名 = soundId）
  - `AlarmRingModule.kt`：syncAlarms 参数透传 soundId/soundUri
  - `RingStore.kt`：RingPlan 字段 + JSON 序列化
  - `RingService.kt`：resolveSoundUri 三级回退
- `app.json`：无需改（expo-media-library 权限由 config plugin 自动注入；Android 13+ READ_MEDIA_AUDIO）

## 目录结构落点

```
src/constants/sounds.ts                    内置音元数据
src/components/alarm-form/SoundPickerField.tsx   表单字段入口（显示当前铃声）
src/components/alarm-form/SoundPickerModal.tsx  分组选择器 + 试听 + 音乐库入口
src/components/alarm-form/__tests__/…      选择器与字段测试
src/hooks/useSoundPreview.ts               试听播放 hook
modules/alarm-ring/android/src/main/res/raw/*.ogg
```

## 关键风险与对策

| 风险 | 对策 |
|---|---|
| 内置音源获取（CC0 渠道逐个下载） | 任务拆分前置为独立任务，先收集齐 10 个源文件并统一转 OGG（ffmpeg + 响度归一化 -1dB）再进开发；文件缺失时该任务不得标记完成 |
| expo-media-library Android 13+ 权限粒度（选部分照片/音乐） | `requestPermissionAsync` 走 READ_MEDIA_AUDIO；拒绝时降级 document-picker（type audio/*），两者都拒则提示 |
| content URI 持久化后 App 重装失效 | 重装后首次响铃走回退链，用户重选即可；不做运行时全量校验 |
| OGG 循环点不精确导致接缝杂音 | 选源时优先短音自然重复型（1~10s），循环接缝在验收试听时人工确认，不达标换源 |
| 模块 res 资源名冲突 | raw 名统一 `ars_` 前缀（如 `ars_classic_alarm`），soundId 保持语义名 |

## 与既有架构的一致性

- store 层调用语义不变（scheduleAlarmRinging 签名不变，字段透传在服务内部）
- 降级路径不变：iOS/Expo Go 走 notification.ts 原路径，铃声字段被忽略
- 30 秒时长语义由 RING_DURATION_SECONDS 统一控制，试听不做截断（完整短音更符合试听预期）
