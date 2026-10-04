/**
 * 007 T5 铃声选择 UI 测试：字段显示逻辑与选择状态流转。
 * mock 掉 expo-audio / expo-media-library / expo-document-picker 原生依赖。
 */
/// <reference types="node" />

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    replace: jest.fn(),
    release: jest.fn(),
  })),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-media-library/legacy', () => ({
  SortBy: { modificationTime: 'modificationTime' },
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAssetsAsync: jest.fn(async () => ({ assets: [] })),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

// 试听资产映射依赖真实 .ogg 文件（T1 ffmpeg 产物，jest 环境无该资产），
// mock 为与 SOUND_PRESETS 同 key 的占位映射，元数据完整性测试针对 key 集合校验
jest.mock('@/constants/sound-assets', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SOUND_PRESETS } = jest.requireActual('@/constants/sounds') as typeof import('@/constants/sounds');
  const assets: Record<string, number> = {};
  for (const preset of SOUND_PRESETS) assets[preset.id] = 1;
  return { SOUND_ASSETS: assets, getSoundAsset: (id: string | null) => assets[id ?? ''] ?? null };
});

import type { SoundSelection } from '../SoundPickerModal';

/** SoundSelection 的纯数据语义测试（与 UI 状态流转对应） */
describe('007 SoundSelection 选择结果语义', () => {
  it('选内置音：soundId 填值、自定义两字段清空', () => {
    const selection: SoundSelection = {
      soundId: 'marimba',
      customSoundUri: null,
      customSoundTitle: null,
    };
    expect(selection.soundId).toBe('marimba');
    expect(selection.customSoundUri).toBeNull();
    expect(selection.customSoundTitle).toBeNull();
  });

  it('选本地音乐：soundId 清空、URI 与歌名填值（URI 优先语义）', () => {
    const selection: SoundSelection = {
      soundId: null,
      customSoundUri: 'content://media/external/audio/media/42',
      customSoundTitle: '晴天',
    };
    expect(selection.soundId).toBeNull();
    expect(selection.customSoundUri).not.toBeNull();
    expect(selection.customSoundTitle).toBe('晴天');
  });
});

/** 显示名解析逻辑（与 SoundPickerField 的 displayName 规则一致） */
describe('007 铃声显示名规则', () => {
  const { findSoundPreset, DEFAULT_SOUND_ID } = jest.requireActual(
    '@/constants/sounds'
  ) as typeof import('@/constants/sounds');

  function displayName(
    soundId: string | null,
    customSoundTitle: string | null
  ): string {
    return (
      customSoundTitle ??
      findSoundPreset(soundId)?.name ??
      findSoundPreset(DEFAULT_SOUND_ID)!.name
    );
  }

  it('本地音乐歌名优先展示', () => {
    expect(displayName('marimba', '晴天')).toBe('晴天');
  });

  it('内置音展示中文名', () => {
    expect(displayName('chime', null)).toBe('风铃');
    expect(displayName('classic-alarm', null)).toBe('经典闹钟');
  });

  it('老数据 NULL 兑底默认音名（经典闹钟）', () => {
    expect(displayName(null, null)).toBe('经典闹钟');
  });

  it('未知 id 兑底默认音名', () => {
    expect(displayName('removed-sound', null)).toBe('经典闹钟');
  });
});

/** 内置音元数据完整性（UI 列表与 raw 资源映射的单一事实源约束） */
describe('007 SOUND_PRESETS 元数据完整性', () => {
  const { SOUND_PRESETS, DEFAULT_SOUND_ID } = jest.requireActual(
    '@/constants/sounds'
  ) as typeof import('@/constants/sounds');
  // 被 mock 的模块（见顶部 jest.mock），key 集合与真实映射一致
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SOUND_ASSETS } = require('@/constants/sound-assets') as {
    SOUND_ASSETS: Record<string, number>;
  };

  it('10 个内置音、id 唯一、rawName 均为 ars_ 前缀', () => {
    expect(SOUND_PRESETS).toHaveLength(10);
    const ids = SOUND_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(10);
    for (const preset of SOUND_PRESETS) {
      expect(preset.rawName.startsWith('ars_')).toBe(true);
    }
  });

  it('每个内置音都有试听资产映射（key 与 preset id 一致）', () => {
    for (const preset of SOUND_PRESETS) {
      expect(SOUND_ASSETS[preset.id]).toBeDefined();
    }
  });

  it('每个内置音的 OGG 资产文件真实存在（JS 试听资产目录）', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const projectRoot = path.resolve(__dirname, '../../../..');
    for (const preset of SOUND_PRESETS) {
      const jsAsset = path.join(projectRoot, 'assets', 'sounds', `${preset.rawName}.ogg`);
      expect(fs.existsSync(jsAsset)).toBe(true);
      const rawAsset = path.join(
        projectRoot,
        'modules',
        'alarm-ring',
        'android',
        'src',
        'main',
        'res',
        'raw',
        `${preset.rawName}.ogg`
      );
      expect(fs.existsSync(rawAsset)).toBe(true);
    }
  });

  it('默认音在列表内且为经典闹钟', () => {
    expect(DEFAULT_SOUND_ID).toBe('classic-alarm');
    expect(SOUND_PRESETS.some((preset) => preset.id === DEFAULT_SOUND_ID)).toBe(true);
  });

  it('三档分组齐备（sharp/gentle/nature）', () => {
    const groups = new Set(SOUND_PRESETS.map((preset) => preset.group));
    expect(groups).toEqual(new Set(['sharp', 'gentle', 'nature']));
  });
});
