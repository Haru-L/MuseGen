import { KalimbaConfig } from './kalimba.types';

/**
 * 难度等级
 */
export type DifficultyLevel = 'beginner' | 'normal' | 'advanced';

/**
 * 音符事件
 */
export interface NoteEvent {
  tineNumber: number;          // 琴键编号
  midiNote: number;            // MIDI音符号
  noteName: string;            // 音符名称
  startTime: number;           // 开始时间（四分音符为单位）
  duration: number;            // 持续时间（四分音符为单位）
  velocity: number;            // 力度 0-127
  isChord: boolean;            // 是否为和弦
  chordNotes?: number[];       // 和弦其他琴键编号
}

/**
 * 小节
 */
export interface Measure {
  number: number;              // 小节号（从1开始）
  timeSignature: {
    numerator: number;         // 拍号分子
    denominator: number;       // 拍号分母
  };
  notes: NoteEvent[];          // 该小节的音符
}

/**
 * 统计信息
 */
export interface ScoreStatistics {
  totalNotes: number;          // 总音符数
  chordsCount: number;         // 和弦数量
  averageNotesPerMeasure: number;  // 平均每小节音符数
  uniqueNotes: number;         // 不同音符数量
  noteRange: {
    lowest: string;            // 最低音
    highest: string;           // 最高音
  };
}

/**
 * 卡林巴乐谱
 */
export interface KalimbaScore {
  id: string;                  // 唯一标识符
  title: string;               // 乐谱标题
  duration: number;            // 时长（秒）
  tempo: number;               // 速度 BPM
  difficulty: DifficultyLevel; // 难度等级
  kalimbaConfig: KalimbaConfig;// 使用的卡林巴配置
  measures: Measure[];         // 小节列表
  statistics: ScoreStatistics; // 统计信息
  sourceAudioHash?: string;    // 源音频的哈希值（用于缓存）
  createdAt: number;           // 创建时间戳
  updatedAt: number;           // 更新时间戳
}

/**
 * 处理状态
 */
export type ProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'decoding'
  | 'analyzing'
  | 'generating'
  | 'complete'
  | 'error';

/**
 * 处理阶段进度
 */
export interface StageProgress {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;            // 0-100
  message: string;
  error?: string;
}

/**
 * 音频处理状态
 */
export interface ProcessingState {
  status: ProcessingStatus;
  progress: number;            // 总体进度 0-100
  currentStep: string;
  error?: Error;
  stages: {
    decode: StageProgress;
    pitchDetection: StageProgress;
    noteExtraction: StageProgress;
    rhythmAnalysis: StageProgress;
    difficultyGeneration: StageProgress;
  };
}

/**
 * 原始检测到的音高数据
 */
export interface PitchDetectionResult {
  time: number;                // 时间（秒）
  frequency: number;           // 频率 Hz
  confidence: number;          // 置信度 0-1
  amplitude: number;           // 振幅 0-1
}

/**
 * 音符映射中间结果
 */
export interface RawNote {
  time: number;
  midiNote: number;
  tineNumber: number | null;
  confidence: number;
  amplitude: number;
}
