import { describe, it, expect } from 'vitest'
import { formatPitchLabel } from '@/utils/previewNotation'

describe('previewNotation', () => {
  it('formats note name as C mode', () => {
    expect(formatPitchLabel('C4', 'C')).toEqual({ label: 'C4', isValid: true })
  })

  it('formats note name as number mode', () => {
    expect(formatPitchLabel('C4', '1')).toEqual({ label: '1', isValid: true })
    expect(formatPitchLabel('C#4', '1')).toEqual({ label: '#1', isValid: true })
    expect(formatPitchLabel('D4', '1')).toEqual({ label: '2', isValid: true })
    expect(formatPitchLabel('A#4', '1')).toEqual({ label: '#6', isValid: true })
    expect(formatPitchLabel('B3', '1')).toEqual({ label: '7', isValid: true })
  })

  it('formats note name as solfege mode', () => {
    expect(formatPitchLabel('C4', '哆')).toEqual({ label: '哆', isValid: true })
    expect(formatPitchLabel('C#4', '哆')).toEqual({ label: '哆♯', isValid: true })
    expect(formatPitchLabel('F4', '哆')).toEqual({ label: '发', isValid: true })
    expect(formatPitchLabel('F#4', '哆')).toEqual({ label: '发♯', isValid: true })
  })

  it('returns placeholder for invalid note name', () => {
    expect(formatPitchLabel('H9', 'C')).toEqual({ label: '—', isValid: false })
    expect(formatPitchLabel('H9', '1')).toEqual({ label: '—', isValid: false })
    expect(formatPitchLabel('H9', '哆')).toEqual({ label: '—', isValid: false })
  })
})

