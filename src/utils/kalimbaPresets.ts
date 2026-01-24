import { v4 as uuidv4 } from 'uuid';
import { KalimbaConfig, TineConfig } from '@/types/kalimba.types';
import { midiToNoteName, midiToFrequency, noteNameToMidi } from './musicTheory';

/**
 * 创建琴键配置
 */
function createTineConfig(tineNumber: number, noteName: string): TineConfig {
  const midiNote = noteNameToMidi(noteName);
  return {
    tineNumber,
    midiNote,
    noteName,
    frequency: midiToFrequency(midiNote)
  };
}

/**
 * 17键卡林巴 C大调标准调音
 * 中央C4为基准，范围从C4到E6
 * 物理布局：中间为C5，左右交替排列
 */
export const KALIMBA_17_KEY_C: KalimbaConfig = {
  id: '17-key-c-major',
  name: '17键C大调',
  keyCount: 17,
  isCustom: false,
  tuning: [
    createTineConfig(1, 'D4'),  // 最左
    createTineConfig(2, 'B4'),
    createTineConfig(3, 'G4'),
    createTineConfig(4, 'E4'),
    createTineConfig(5, 'C4'),  // 左侧
    createTineConfig(6, 'A4'),
    createTineConfig(7, 'F4'),
    createTineConfig(8, 'D5'),
    createTineConfig(9, 'C5'),  // 中央
    createTineConfig(10, 'E5'),
    createTineConfig(11, 'G5'),
    createTineConfig(12, 'B5'),
    createTineConfig(13, 'D6'),
    createTineConfig(14, 'F5'),  // 右侧
    createTineConfig(15, 'A5'),
    createTineConfig(16, 'C6'),
    createTineConfig(17, 'E6'),  // 最右
  ]
};

/**
 * 21键卡林巴 C大调标准调音
 * 扩展范围，从A3到C7
 */
export const KALIMBA_21_KEY_C: KalimbaConfig = {
  id: '21-key-c-major',
  name: '21键C大调',
  keyCount: 21,
  isCustom: false,
  tuning: [
    createTineConfig(1, 'A3'),  // 最左
    createTineConfig(2, 'F4'),
    createTineConfig(3, 'D4'),
    createTineConfig(4, 'B4'),
    createTineConfig(5, 'G4'),
    createTineConfig(6, 'E4'),
    createTineConfig(7, 'C4'),  // 左侧低音区
    createTineConfig(8, 'A4'),
    createTineConfig(9, 'F5'),
    createTineConfig(10, 'D5'),
    createTineConfig(11, 'C5'),  // 中央
    createTineConfig(12, 'E5'),
    createTineConfig(13, 'G5'),
    createTineConfig(14, 'B5'),
    createTineConfig(15, 'D6'),  // 右侧高音区
    createTineConfig(16, 'F6'),
    createTineConfig(17, 'A6'),
    createTineConfig(18, 'C6'),
    createTineConfig(19, 'E6'),
    createTineConfig(20, 'G6'),
    createTineConfig(21, 'C7'),  // 最右
  ]
};

/**
 * 创建自定义卡林巴配置
 * @param keyCount 琴键数量
 * @param startNote 起始音符（MIDI号）
 * @returns 自定义配置
 */
export function createCustomKalimba(
  keyCount: number,
  startNote: number = 60  // 默认从C4开始
): KalimbaConfig {
  if (keyCount < 8 || keyCount > 30) {
    throw new Error('Key count must be between 8 and 30');
  }

  const tuning: TineConfig[] = [];
  for (let i = 0; i < keyCount; i++) {
    const midiNote = startNote + i;
    tuning.push({
      tineNumber: i + 1,
      midiNote,
      noteName: midiToNoteName(midiNote),
      frequency: midiToFrequency(midiNote)
    });
  }

  return {
    id: uuidv4(),
    name: `自定义${keyCount}键`,
    keyCount,
    isCustom: true,
    tuning,
    createdAt: Date.now()
  };
}

/**
 * 所有预设配置
 */
export const KALIMBA_PRESETS: KalimbaConfig[] = [
  KALIMBA_17_KEY_C,
  KALIMBA_21_KEY_C
];

/**
 * 根据ID获取预设配置
 */
export function getPresetById(id: string): KalimbaConfig | undefined {
  return KALIMBA_PRESETS.find(preset => preset.id === id);
}

/**
 * 获取默认配置（17键）
 */
export function getDefaultKalimba(): KalimbaConfig {
  return KALIMBA_17_KEY_C;
}

/**
 * 验证卡林巴配置是否有效
 */
export function validateKalimbaConfig(config: KalimbaConfig): boolean {
  if (!config || !config.id || !config.name) {
    return false;
  }

  if (config.keyCount !== config.tuning.length) {
    return false;
  }

  if (config.keyCount < 8 || config.keyCount > 30) {
    return false;
  }

  // 检查琴键编号是否连续且唯一
  const tineNumbers = config.tuning.map(t => t.tineNumber).sort((a, b) => a - b);
  for (let i = 0; i < tineNumbers.length; i++) {
    if (tineNumbers[i] !== i + 1) {
      return false;
    }
  }

  // 检查MIDI音符号是否有效
  for (const tine of config.tuning) {
    if (tine.midiNote < 0 || tine.midiNote > 127) {
      return false;
    }
  }

  return true;
}
