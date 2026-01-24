import { describe, it, expect } from 'vitest'
import { midiToNoteName, noteNameToMidi, midiToFrequency, frequencyToMidi, semitoneDifference, isNoteInRange, getNoteRange } from '@/utils/musicTheory'

describe('musicTheory', () => {
  it('converts MIDI to note name', () => {
    expect(midiToNoteName(60)).toBe('C4')
    expect(midiToNoteName(69)).toBe('A4')
  })

  it('converts note name to MIDI', () => {
    expect(noteNameToMidi('C4')).toBe(60)
    expect(noteNameToMidi('A4')).toBe(69)
  })

  it('converts MIDI to frequency and back', () => {
    const freq = midiToFrequency(69)
    expect(Math.round(freq)).toBe(440)
    const midi = frequencyToMidi(freq)
    expect(midi).toBe(69)
  })

  it('computes semitone difference', () => {
    expect(semitoneDifference(60, 72)).toBe(12)
  })

  it('checks note in range', () => {
    expect(isNoteInRange(60, 57, 72)).toBe(true)
    expect(isNoteInRange(56, 57, 72)).toBe(false)
  })

  it('gets note range', () => {
    expect(getNoteRange([60, 64, 72])).toEqual({ min: 60, max: 72 })
  })
})
