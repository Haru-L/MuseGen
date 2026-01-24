import { useMemo } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { KALIMBA_PRESETS, getPresetById } from '@/utils/kalimbaPresets'

export function PresetSelector() {
  const currentKalimba = useSettingsStore(s => s.currentKalimba)
  const customKalimbas = useSettingsStore(s => s.customKalimbas)
  const setCurrentKalimba = useSettingsStore(s => s.setCurrentKalimba)

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
    </div>
  )
}

