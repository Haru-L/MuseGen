/**
 * 卡林巴琴键配置
 */
export interface TineConfig {
  tineNumber: number;          // 琴键编号（从1开始）
  midiNote: number;            // MIDI音符号（0-127）
  noteName: string;            // 音符名称 "C4", "D#5" 等
  frequency: number;           // 频率 (Hz)
}

/**
 * 卡林巴配置
 */
export interface KalimbaConfig {
  id: string;                  // 唯一标识符
  name: string;                // 配置名称 "17键C大调", "21键", "自定义"
  keyCount: number;            // 琴键数量
  tuning: TineConfig[];        // 每个琴键的配置
  isCustom: boolean;           // 是否为自定义配置
  createdAt?: number;          // 创建时间戳
}

/**
 * 预设类型
 */
export type KalimbaPresetType = '17-key-c' | '21-key-c' | 'custom';

/**
 * 音符名称到MIDI号的映射
 */
export interface NoteName {
  note: string;                // 音符名 C, C#, D, D#, E, F, F#, G, G#, A, A#, B
  octave: number;              // 八度 0-8
}
