import { useMemo, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { KALIMBA_PRESETS, getPresetById, createCustomKalimba, validateKalimbaConfig } from '@/utils/kalimbaPresets'
import { KalimbaConfig } from '@/types/kalimba.types'

export function SettingsPanel() {
  const currentKalimba = useSettingsStore(s => s.currentKalimba)
  const setCurrentKalimba = useSettingsStore(s => s.setCurrentKalimba)
  const resetToDefault = useSettingsStore(s => s.resetToDefault)
  const addCustomKalimba = useSettingsStore(s => s.addCustomKalimba)

  const [selectedPresetId, setSelectedPresetId] = useState<string>(currentKalimba.isCustom ? '' : currentKalimba.id)
  const [keyCount, setKeyCount] = useState<number>(currentKalimba.keyCount || 17)
  const [startNoteMidi, setStartNoteMidi] = useState<number>(60)
  const [error, setError] = useState<string>('')

  const presets = useMemo(() => KALIMBA_PRESETS, [])

  const handlePresetChange = (id: string) => {
    setError('')
    setSelectedPresetId(id)
    const preset = getPresetById(id)
    if (preset && validateKalimbaConfig(preset)) {
      setCurrentKalimba(preset)
    } else {
      setError('预设无效，请选择其他预设')
    }
  }

  const handleCreateCustom = () => {
    setError('')
    if (!Number.isInteger(keyCount) || keyCount < 8 || keyCount > 30) {
      setError('琴键数量需为 8-30 的整数')
      return
    }
    if (!Number.isFinite(startNoteMidi) || startNoteMidi < 0 || startNoteMidi > 127) {
      setError('起始 MIDI 音符需在 0-127 之间')
      return
    }
    try {
      const cfg: KalimbaConfig = createCustomKalimba(keyCount, startNoteMidi)
      if (!validateKalimbaConfig(cfg)) {
        setError('自定义配置不合法')
        return
      }
      addCustomKalimba(cfg)
      setCurrentKalimba(cfg)
      setSelectedPresetId('')
    } catch (e: any) {
      setError(e?.message || '创建自定义配置失败')
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="preset-section">
        <h2 id="preset-section" className="text-xl font-semibold text-gray-900 mb-4">
          选择预设
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetChange(preset.id)}
              className={`border rounded-md p-4 text-left transition-colors ${
                selectedPresetId === preset.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              aria-pressed={selectedPresetId === preset.id}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{preset.name}</div>
                  <div className="text-sm text-gray-600 mt-1">琴键数：{preset.keyCount}</div>
                </div>
                <div className="text-xs text-gray-500">{preset.isCustom ? '自定义' : '预设'}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="custom-section">
        <h2 id="custom-section" className="text-xl font-semibold text-gray-900 mb-4">
          自定义调音
        </h2>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <label htmlFor="keyCount" className="text-sm text-gray-700 w-32">
              琴键数量
            </label>
            <input
              id="keyCount"
              type="number"
              min={8}
              max={30}
              value={keyCount}
              onChange={e => setKeyCount(Math.round(Number(e.target.value)))}
              className="input"
              aria-describedby="keyCount-desc"
              aria-invalid={!!error && (error.includes('琴键数量'))}
            />
          </div>
          <p id="keyCount-desc" className="text-xs text-gray-500">
            8-30 之间的整数
          </p>

          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <label htmlFor="startNote" className="text-sm text-gray-700 w-32">
              起始 MIDI 音符
            </label>
            <input
              id="startNote"
              type="number"
              min={0}
              max={127}
              value={startNoteMidi}
              onChange={e => setStartNoteMidi(Number(e.target.value))}
              className="input"
              aria-describedby="startNote-desc"
              aria-invalid={!!error && (error.includes('MIDI'))}
            />
          </div>
          <p id="startNote-desc" className="text-xs text-gray-500">
            例如 60=C4
          </p>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="btn-primary"
              onClick={handleCreateCustom}
              disabled={
                !Number.isInteger(keyCount) ||
                keyCount < 8 ||
                keyCount > 30 ||
                !Number.isFinite(startNoteMidi) ||
                startNoteMidi < 0 ||
                startNoteMidi > 127
              }
            >
              创建自定义配置
            </button>
            <button type="button" className="btn-secondary" onClick={resetToDefault}>
              重置为默认
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      </section>

      <section aria-labelledby="current-section">
        <h2 id="current-section" className="text-xl font-semibold text-gray-900 mb-4">
          当前配置
        </h2>
        <div className="border border-gray-200 rounded-md p-4">
          <div className="text-gray-900 font-medium">{currentKalimba.name}</div>
          <div className="text-sm text-gray-600 mt-1">
            琴键数：{currentKalimba.keyCount}（{currentKalimba.isCustom ? '自定义' : '预设'}）
          </div>
          <p className="text-xs text-gray-500 mt-2">
            更改会自动保存到浏览器（LocalStorage），可随时重置为默认。
          </p>
        </div>
      </section>
    </div>
  )
}
