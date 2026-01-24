import type { TineConfig } from '@/types/kalimba.types'

function positionForSortedIndex(index: number): number {
  if (index === 0) {
    return 0
  }
  const distance = Math.ceil(index / 2)
  return index % 2 === 1 ? -distance : distance
}

export function sortTuningPhysicalLeftToRight(tuning: TineConfig[]): TineConfig[] {
  const byPitchAsc = tuning
    .slice()
    .sort((a, b) => (a.midiNote - b.midiNote) || (a.tineNumber - b.tineNumber))

  const withPosition = byPitchAsc.map((t, index) => {
    return {
      tine: t,
      position: positionForSortedIndex(index)
    }
  })

  return withPosition
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(x => x.tine)
}
