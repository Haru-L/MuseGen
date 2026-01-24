import { useMemo, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { PresetSelector } from '@/components/SettingsPanel/PresetSelector'
import { CustomKalimbaBuilder } from '@/components/SettingsPanel/CustomKalimbaBuilder'
import { TuningEditor } from '@/components/SettingsPanel/TuningEditor'
import { KalimbaPreview } from '@/components/SettingsPanel/KalimbaPreview'
import { PreviewModeToggle } from '@/components/SettingsPanel/PreviewModeToggle'
import type { PreviewMode } from '@/utils/previewNotation'

export function SettingsPage() {
  const currentKalimba = useSettingsStore(s => s.currentKalimba)
  const isCurrentValid = useSettingsStore(s => s.isCurrentValid)
  const resetToDefault = useSettingsStore(s => s.resetToDefault)

  const [previewMode, setPreviewMode] = useState<PreviewMode>('C')

  const rangeText = useMemo(() => {
    const byMidi = currentKalimba.tuning.slice().sort((a, b) => a.midiNote - b.midiNote)
    const lowest = byMidi[0]?.noteName
    const highest = byMidi[byMidi.length - 1]?.noteName
    if (!lowest || !highest) {
      return '—'
    }
    return `${lowest} ~ ${highest}`
  }, [currentKalimba.tuning])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold title-gradient">设置</h1>
        <p className="text-gray-600 mt-2">配置卡林巴键位与调音，并预览最终显示效果。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">当前配置</div>
              <div className="text-xl font-semibold text-gray-900 mt-1">{currentKalimba.name}</div>
              <div className="text-sm text-gray-600 mt-2">键数：{currentKalimba.keyCount} · 音域：{rangeText}</div>
            </div>
            {!isCurrentValid() && (
              <button className="btn-secondary" onClick={resetToDefault}>恢复默认</button>
            )}
          </div>
          {!isCurrentValid() && (
            <p role="alert" className="text-sm text-red-600 mt-4">
              当前配置不合法，已禁用部分操作。请修复错误或恢复默认配置。
            </p>
          )}
        </div>

        <div className="card">
          <PresetSelector />
        </div>

        <div className="card lg:col-span-2">
          <CustomKalimbaBuilder />
        </div>

        <div className="card lg:col-span-2">
          <TuningEditor />
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-lg font-semibold text-gray-900">配置预览</div>
              <div className="text-sm text-gray-600 mt-1">切换显示模式以确认每个键位最终展示。</div>
            </div>
            <PreviewModeToggle value={previewMode} onChange={setPreviewMode} />
          </div>
          <KalimbaPreview tuning={currentKalimba.tuning} mode={previewMode} />
        </div>
      </div>
    </div>
  )
}
