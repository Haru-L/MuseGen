import { describe, it, expect } from 'vitest'
import { sortTuningPhysicalLeftToRight } from '@/utils/kalimbaLayout'
import type { TineConfig } from '@/types/kalimba.types'

describe('kalimbaLayout', () => {
  it('orders tines left-to-right based on alternating layout assumption', () => {
    const tuning: TineConfig[] = [
      { tineNumber: 1, noteName: 'F4', midiNote: 65, frequency: 349.23 },
      { tineNumber: 2, noteName: 'C4', midiNote: 60, frequency: 261.63 },
      { tineNumber: 3, noteName: 'G4', midiNote: 67, frequency: 392.0 },
      { tineNumber: 4, noteName: 'D4', midiNote: 62, frequency: 293.66 },
      { tineNumber: 5, noteName: 'E4', midiNote: 64, frequency: 329.63 }
    ]

    const ordered = sortTuningPhysicalLeftToRight(tuning)
    expect(ordered.map(t => t.noteName)).toEqual(['F4', 'D4', 'C4', 'E4', 'G4'])
  })
})
