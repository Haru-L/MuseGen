import { Settings } from 'lucide-react'
import { SettingsPanel } from '@/components/SettingsPanel'

export function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Settings className="w-7 h-7 mr-2 text-primary-600 animate-pulse-slow" />
          设置
        </h1>
        <p className="text-gray-600 mt-2">
          配置您的卡林巴琴键预设或自定义调音，保存后用于后续乐谱生成。
        </p>
      </div>

      <div className="card">
        <SettingsPanel />
      </div>
    </div>
  )
}
