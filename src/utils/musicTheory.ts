/**
 * 音符名称数组（半音）
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * MIDI音符号转音符名称
 * @param midiNote MIDI音符号 (0-127)
 * @returns 音符名称 如 "C4", "A#5"
 */
export function midiToNoteName(midiNote: number): string {
  if (midiNote < 0 || midiNote > 127) {
    throw new Error(`Invalid MIDI note: ${midiNote}`);
  }

  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * 音符名称转MIDI音符号
 * @param noteName 音符名称 如 "C4", "A#5"
 * @returns MIDI音符号
 */
export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  const [, note, octave] = match;
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) {
    throw new Error(`Invalid note: ${note}`);
  }

  const octaveNum = parseInt(octave, 10);
  return (octaveNum + 1) * 12 + noteIndex;
}

/**
 * MIDI音符号转频率
 * @param midiNote MIDI音符号
 * @returns 频率 (Hz)
 */
export function midiToFrequency(midiNote: number): number {
  // A4 (MIDI 69) = 440 Hz
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * 频率转MIDI音符号（取最接近的半音）
 * @param frequency 频率 (Hz)
 * @returns MIDI音符号
 */
export function frequencyToMidi(frequency: number): number {
  if (frequency <= 0) {
    throw new Error(`Invalid frequency: ${frequency}`);
  }

  const midiFloat = 69 + 12 * Math.log2(frequency / 440);
  return Math.round(midiFloat);
}

/**
 * 计算两个MIDI音符号之间的半音距离
 * @param midi1 第一个MIDI音符号
 * @param midi2 第二个MIDI音符号
 * @returns 半音数量（绝对值）
 */
export function semitoneDifference(midi1: number, midi2: number): number {
  return Math.abs(midi1 - midi2);
}

/**
 * 检查音符是否在给定范围内
 * @param midiNote 要检查的MIDI音符号
 * @param minMidi 最小MIDI音符号
 * @param maxMidi 最大MIDI音符号
 * @returns 是否在范围内
 */
export function isNoteInRange(
  midiNote: number,
  minMidi: number,
  maxMidi: number
): boolean {
  return midiNote >= minMidi && midiNote <= maxMidi;
}

/**
 * 获取音符列表中的最低和最高音
 * @param midiNotes MIDI音符号数组
 * @returns {min, max} 最低和最高音符号
 */
export function getNoteRange(midiNotes: number[]): { min: number; max: number } {
  if (midiNotes.length === 0) {
    throw new Error('Empty note array');
  }

  return {
    min: Math.min(...midiNotes),
    max: Math.max(...midiNotes)
  };
}
