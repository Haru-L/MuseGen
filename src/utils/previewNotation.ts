import { noteNameToMidi } from '@/utils/musicTheory'

export type PreviewMode = '1' | 'C' | '哆'

const PITCH_CLASS_TO_NUMBER = ['1', '#1', '2', '#2', '3', '4', '#4', '5', '#5', '6', '#6', '7']
const PITCH_CLASS_TO_SOLFEGE = ['哆', '哆♯', '来', '来♯', '咪', '发', '发♯', '嗦', '嗦♯', '啦', '啦♯', '西']

function safePitchClassFromNoteName(noteName: string): { pitchClass: number; isValid: boolean } {
  try {
    const midi = noteNameToMidi(noteName)
    const pitchClass = ((midi % 12) + 12) % 12
    return { pitchClass, isValid: true }
  } catch {
    return { pitchClass: 0, isValid: false }
  }
}

export function formatPitchLabel(noteName: string, mode: PreviewMode): { label: string; isValid: boolean } {
  const { pitchClass, isValid } = safePitchClassFromNoteName(noteName)

  if (!isValid) {
    return { label: '—', isValid: false }
  }

  if (mode === 'C') {
    return { label: noteName, isValid: true }
  }

  if (mode === '1') {
    return { label: PITCH_CLASS_TO_NUMBER[pitchClass], isValid: true }
  }

  return { label: PITCH_CLASS_TO_SOLFEGE[pitchClass], isValid: true }
}

function safeMidiFromNoteName(noteName: string): { midi: number; isValid: boolean } {
  try {
    const midi = noteNameToMidi(noteName)
    return { midi, isValid: true }
  } catch {
    return { midi: 60, isValid: false }
  }
}

export function formatPitchDiagramLabel(noteName: string, mode: PreviewMode): {
  label: string
  isValid: boolean
  dotsAbove: number
  dotsBelow: number
} {
  const { midi, isValid } = safeMidiFromNoteName(noteName)

  if (!isValid) {
    return { label: '—', isValid: false, dotsAbove: 0, dotsBelow: 0 }
  }

  const pitchClass = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const baseOctave = 4
  const delta = octave - baseOctave

  const dotsAbove = delta > 0 ? delta : 0
  const dotsBelow = delta < 0 ? -delta : 0

  if (mode === 'C') {
    return { label: noteName, isValid: true, dotsAbove: 0, dotsBelow: 0 }
  }

  if (mode === '1') {
    return { label: PITCH_CLASS_TO_NUMBER[pitchClass], isValid: true, dotsAbove, dotsBelow }
  }

  return { label: PITCH_CLASS_TO_SOLFEGE[pitchClass], isValid: true, dotsAbove, dotsBelow }
}
