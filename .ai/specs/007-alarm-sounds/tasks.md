# 007 - 提示音与自定义铃声 任务拆分

依据 [design.md](./design.md)。任务按依赖排序，T1 → T2 为关键路径（音源先行，缺失不开工）；T3~T5 可并行；T6 汇合；T7 全链路验证。

## T1 内置音源收集与加工（前置，阻塞后续所有任务）

- 从调研指定渠道（Pixabay / Mixkit / AOSP）收集 10 个音源：classic-alarm、buzzer、radar-ping、radar-soft、marimba、piano-arpeggio、music-box、chime、birds-morning、ocean-waves
- ffmpeg 统一加工：转单声道 OGG Vorbis、响度归一化 -1dB 峰值、裁剪到目标时长（短音 1~10s）、`ars_` 前缀命名
- 产出 `modules/alarm-ring/android/src/main/res/raw/` 下 10 个 .ogg，总计 ≤5MB
- 验收：文件齐全、ffprobe 时长/格式符合、总体积达标；**本任务完成前 T3/T4 不开工**

## T2 数据层扩展

- schema.ts：`ensureSoundColumns` 幂等迁移（sound_id / custom_sound_uri / custom_sound_title 三列）
- types/alarm.ts：Alarm 及 Create/UpdateInput 补三字段
- alarm-repository.ts：行映射与增改语句同步三字段
- 测试：迁移幂等（重复 init 不报错）、老数据 NULL 兜底默认音、三字段读写回路
- 验收：jest 通过，tsc strict 无错

## T3 内置音元数据与调度透传（依赖 T1 的 id 清单、T2 的类型）

- `src/constants/sounds.ts`：SOUND_PRESETS 10 项 + DEFAULT_SOUND_ID
- ring-scheduler.ts：syncAlarms 计划透传 soundId / soundUri（customSoundUri 优先）
- 原生 RingStore.RingPlan + JSON 序列化补 soundId/soundUri 两字段（旧数据 optString 缺省兼容）
- AlarmRingModule.syncAlarms 参数接收透传
- 测试：透传优先级（customSoundUri > soundId > 默认）、旧持久化数据兼容
- 验收：jest 通过；计划 JSON 中字段正确

## T4 原生播放扩展（依赖 T1 资源、T3 的 RingPlan 字段）

- RingService.resolveSoundUri 三级回退：soundUri 探测（ContentResolver）→ soundId raw 资源 → 系统默认闹钟铃声
- content URI 失效 / raw 未命中均记日志并回退，不中断响铃
- 验收：gradle 编译通过 + assembleDebug 通过；模拟器实测三级路径（正常音 / 删除文件后的本地音乐 / 未知 soundId）

## T5 铃声选择 UI 与试听（依赖 T2、T3；可与 T4 并行）

- `SoundPickerField`：表单字段入口，显示当前铃声（内置音名或歌名）
- `SoundPickerModal`：三档分组列表、选中标记、试听按钮、「从音乐库选择」入口
- `useSoundPreview` hook：expo-audio 单实例试听，切换源/释放生命周期
- expo-media-library 选歌：权限请求 → 音频资产列表 → 选中回填 URI + 歌名；拒绝权限降级 document-picker
- AlarmForm 接入铃声字段（创建默认 classic-alarm，编辑回显）
- 测试：字段显示逻辑（内置音/歌名/默认）、选择器状态流转
- 验收：UI 可用、试听可播可停、选歌回填正确

## T6 依赖安装与集成收口（依赖 T1~T5）

- `npx expo install expo-audio expo-media-library`
- 全链路走查：创建带铃声闹钟 → 保存 → 调度计划含铃声 → （模拟器）触发响铃用所选音
- tsc + 全量 jest + prebuild + assembleDebug
- 验收：验收标准 1/3/4/5/8 通过（模拟器范围）

## T7 规格收尾

- requirements.md 验收标准逐条核对并标注结果
- 迭代记录（版本日志 + 周报）补录
- 分支合并回 release/0.0.5

## 依赖关系

```
T1 ──┬──→ T3 ──→ T4 ──┐
     │                ├──→ T6 ──→ T7
T2 ──┴──→ T5 ─────────┘
```

T1 是唯一外部依赖任务（音源下载），风险最高，安排最先做；T2/T3/T5 为纯代码任务可连续推进；T4 需构建验证放后；T6/T7 收口。
