import { useMemo, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { createCustomKalimba } from '@/utils/kalimbaPresets'
import { noteNameToMidi } from '@/utils/musicTheory'

export function CustomKalimbaBuilder() {
  const addCustomKalimba = useSettingsStore(s => s.addCustomKalimba)
  const setCurrentKalimba = useSettingsStore(s => s.setCurrentKalimba)

  const [keyCountText, setKeyCountText] = useState('17')
  const [startNoteName, setStartNoteName] = useState('C4')
  const [error, setError] = useState<string | null>(null)

  const keyCount = useMemo(() => {
    const n = Number(keyCountText)
    return Number.isFinite(n) ? n : NaN
  }, [keyCountText])

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-sm text-gray-700">键数（8~30）</label>
          <input
            className="input mt-1"
            value={keyCountText}
            inputMode="numeric"
            onChange={(e) => setKeyCountText(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-700">起始音符（如 C4）</label>
          <input
            className="input mt-1"
            value={startNoteName}
            onChange={(e) => setStartNoteName(e.target.value)}
          />
        </div>

        <button
          className="btn-primary justify-center"
          onClick={() => {
            try {
              setError(null)
              if (!Number.isFinite(keyCount)) {
                throw new Error('键数必须是数字')
              }
              const startMidi = noteNameToMidi(startNoteName)
              const custom = createCustomKalimba(keyCount, startMidi)
              addCustomKalimba(custom)
              setCurrentKalimba(custom)
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : '创建失败'
              setError(msg)
            }
          }}
        >
          创建并切换
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>
      )}
    </div>
  )
}
