type ToneModule = typeof import('tone')

let tone: ToneModule | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let synth: any | null = null
let isStarted = false

async function ensureSynth() {
  if (!tone) {
    tone = await import('tone')
  }
  if (!isStarted) {
    await tone.start()
    isStarted = true
  }

  if (!synth) {
    synth = new tone.PolySynth(tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0.0, release: 0.12 }
    }).toDestination()
    synth.volume.value = -10
  }
}

export async function auditionMidiNote(midiNote: number) {
  await ensureSynth()
  const freq = tone!.Frequency(midiNote, 'midi')
  synth!.triggerAttackRelease(freq, 0.18)
}

