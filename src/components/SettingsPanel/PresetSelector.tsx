import { useMemo, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { KALIMBA_PRESETS, getPresetById } from '@/utils/kalimbaPresets'

export function PresetSelector() {
  const currentKalimba = useSettingsStore(s => s.currentKalimba)
  const customKalimbas = useSettingsStore(s => s.customKalimbas)
  const setCurrentKalimba = useSettingsStore(s => s.setCurrentKalimba)
  const deleteCustomKalimba = useSettingsStore(s => s.deleteCustomKalimba)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const options = useMemo(() => {
    const presets = KALIMBA_PRESETS.map(p => ({ id: p.id, label: `${p.name}（预设）` }))
    const customs = customKalimbas.map(c => ({ id: c.id, label: `${c.name}（自定义）` }))
    return [...presets, ...customs]
  }, [customKalimbas])

  return (
    <div>
      <div className="text-lg font-semibold text-gray-900">选择配置</div>
      <p className="text-sm text-gray-600 mt-1">切换预设或已保存的自定义配置。</p>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="text-sm text-gray-700">当前</label>
        <select
          className="input"
          value={currentKalimba.id}
          onChange={(e) => {
            const id = e.target.value
            const preset = getPresetById(id)
            const custom = customKalimbas.find(c => c.id === id)
            const next = preset ?? custom
            if (next) {
              setCurrentKalimba(next)
            }
          }}
        >
          {options.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      {customKalimbas.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-medium text-gray-700">已保存的自定义配置</div>
          <div className="mt-2 space-y-2">
            {customKalimbas.map((c) => {
              const isCurrent = c.id === currentKalimba.id
              const isConfirming = confirmingId === c.id
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/60 backdrop-blur-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {c.name}
                      {isCurrent && <span className="text-xs text-gray-500 ml-2">（当前）</span>}
                    </div>
                    <div className="text-xs text-gray-600">键数：{c.keyCount}</div>
                  </div>
                  {!isConfirming ? (
                    <button
                      type="button"
                      className="btn-secondary py-1.5 px-3 text-sm"
                      onClick={(e) => {
                        e.preventDefault()
                        setConfirmingId(c.id)
                      }}
                    >
                      删除
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-secondary py-1.5 px-3 text-sm bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                        onClick={(e) => {
                          e.preventDefault()
                          setConfirmingId(null)
                          deleteCustomKalimba(c.id)
                        }}
                      >
                        确认
                      </button>
                      <button
                        type="button"
                        className="btn-secondary py-1.5 px-3 text-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          setConfirmingId(null)
                        }}
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
