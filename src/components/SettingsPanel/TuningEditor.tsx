import { useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettingsStore } from '@/stores/settingsStore'
import { midiToFrequency, noteNameToMidi } from '@/utils/musicTheory'
import { sortTuningPhysicalLeftToRight } from '@/utils/kalimbaLayout'
import { KalimbaScalePreview } from './KalimbaScalePreview'
import type { KalimbaConfig, TineConfig } from '@/types/kalimba.types'

function normalizeNoteName(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/^([a-gA-G])(#?)(-?\d+)$/)
  if (!match) {
    return trimmed
  }
  const [, note, sharp, octave] = match
  return `${note.toUpperCase()}${sharp}${octave}`
}

function copyAsCustom(config: KalimbaConfig): KalimbaConfig {
  const tuning: TineConfig[] = config.tuning.map(t => ({
    tineNumber: t.tineNumber,
    midiNote: t.midiNote,
    noteName: t.noteName,
    frequency: t.frequency
  }))

  return {
    id: uuidv4(),
    name: `自定义(${config.name})`,
    keyCount: config.keyCount,
    tuning,
    isCustom: true,
    createdAt: Date.now()
  }
}

export function TuningEditor() {
  const currentKalimba = useSettingsStore(s => s.currentKalimba)
  const addCustomKalimba = useSettingsStore(s => s.addCustomKalimba)
  const setCurrentKalimba = useSettingsStore(s => s.setCurrentKalimba)
  const updateCustomKalimba = useSettingsStore(s => s.updateCustomKalimba)

  const sortedTuning = useMemo(() => {
    return sortTuningPhysicalLeftToRight(currentKalimba.tuning)
  }, [currentKalimba.tuning])

  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    const nextDrafts: Record<number, string> = {}
    for (const t of sortedTuning) {
      nextDrafts[t.tineNumber] = t.noteName
    }
    setDrafts(nextDrafts)
    setErrors({})
  }, [sortedTuning])

  const canEdit = currentKalimba.isCustom

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">调音编辑</div>
          <p className="text-sm text-gray-600 mt-1">逐个琴键设置音名。仅自定义配置可编辑。</p>
        </div>
        {!canEdit && (
          <button
            className="btn-primary"
            onClick={() => {
              const copied = copyAsCustom(currentKalimba)
              addCustomKalimba(copied)
              setCurrentKalimba(copied)
            }}
          >
            复制为自定义并编辑
          </button>
        )}
      </div>

      <div className="mt-6 mb-8">
        <KalimbaScalePreview tuning={currentKalimba.tuning} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-4">键位</th>
              <th className="py-2 pr-4">音名</th>
              <th className="py-2 pr-4">MIDI</th>
              <th className="py-2 pr-4">频率</th>
            </tr>
          </thead>
          <tbody>
            {sortedTuning.map((t) => {
              const draft = drafts[t.tineNumber] ?? t.noteName
              const rowError = errors[t.tineNumber]

              return (
                <tr key={t.tineNumber} className="border-t border-gray-100">
                  <td className="py-3 pr-4 font-medium text-gray-900">{t.tineNumber}</td>
                  <td className="py-3 pr-4">
                    <input
                      className={rowError ? 'input border-red-300 ring-red-200/50' : 'input'}
                      value={draft}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const value = e.target.value
                        setDrafts(prev => ({ ...prev, [t.tineNumber]: value }))
                      }}
                      onBlur={() => {
                        if (!canEdit) {
                          return
                        }

                        const normalized = normalizeNoteName(draft)
                        try {
                          const midi = noteNameToMidi(normalized)
                          const frequency = midiToFrequency(midi)

                          const nextTuning = currentKalimba.tuning.map((x) => {
                            if (x.tineNumber !== t.tineNumber) {
                              return x
                            }
                            return {
                              ...x,
                              noteName: normalized,
                              midiNote: midi,
                              frequency
                            }
                          })

                          setDrafts(prev => ({ ...prev, [t.tineNumber]: normalized }))
                          setErrors(prev => {
                            const { [t.tineNumber]: _, ...rest } = prev
                            return rest
                          })

                          updateCustomKalimba(currentKalimba.id, { tuning: nextTuning })
                        } catch (e: any) {
                          setErrors(prev => ({ ...prev, [t.tineNumber]: e?.message ?? '音名无效' }))
                        }
                      }}
                      aria-label={`tine-${t.tineNumber}-note-name`}
                    />
                    {rowError && (
                      <div role="alert" className="text-xs text-red-600 mt-1">{rowError}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{t.midiNote}</td>
                  <td className="py-3 pr-4 text-gray-700">{t.frequency.toFixed(2)} Hz</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
