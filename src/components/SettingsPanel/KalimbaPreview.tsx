import type { TineConfig } from '@/types/kalimba.types'
import { formatPitchLabel, type PreviewMode } from '@/utils/previewNotation'
import { sortTuningPhysicalLeftToRight } from '@/utils/kalimbaLayout'

interface KalimbaPreviewProps {
  tuning: TineConfig[]
  mode: PreviewMode
}

export function KalimbaPreview({ tuning, mode }: KalimbaPreviewProps) {
  const ordered = sortTuningPhysicalLeftToRight(tuning)
  const minMidi = Math.min(...ordered.map(t => t.midiNote))
  const maxMidi = Math.max(...ordered.map(t => t.midiNote))
  const midiRange = Math.max(1, maxMidi - minMidi)

  return (
    <div className="overflow-x-auto" data-testid="kalimba-preview">
      <div className="flex gap-3 min-w-max items-end">
        {ordered.map((t) => {
          const { label, isValid } = formatPitchLabel(t.noteName, mode)
          const showAssist = mode !== 'C'
          const lengthRatio = (maxMidi - t.midiNote) / midiRange
          const tineHeight = 72 + Math.round(lengthRatio * 96)

          return (
            <div
              key={t.tineNumber}
              data-testid={`kalimba-preview-cell-${t.tineNumber}`}
              className={
                isValid
                  ? 'w-28 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md shadow-soft px-3 py-3'
                  : 'w-28 rounded-2xl border border-red-200 bg-red-50/60 backdrop-blur-md px-3 py-3'
              }
            >
              <div className="flex items-baseline justify-between">
                <div className="text-xs text-gray-600">{t.tineNumber}</div>
                <div className="text-xs text-gray-500">{t.frequency.toFixed(1)}Hz</div>
              </div>
              <div className="mt-2 flex flex-col items-center justify-end" style={{ height: tineHeight }}>
                <div
                  data-testid={`kalimba-preview-label-${t.tineNumber}`}
                  className={isValid ? 'text-lg font-semibold text-gray-900' : 'text-lg font-semibold text-red-700'}
                >
                  {label}
                </div>
                {showAssist && (
                  <div className={isValid ? 'text-xs text-gray-500 mt-1' : 'text-xs text-red-600 mt-1'}>
                    {isValid ? t.noteName : '音名无效'}
                  </div>
                )}
                <div className="mt-2 w-2 rounded-full bg-gradient-to-b from-primary-300 to-primary-700" style={{ height: tineHeight - 28 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
