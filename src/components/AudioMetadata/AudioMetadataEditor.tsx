/**
 * 音频元数据编辑器组件
 *
 * 功能：
 * - 展示音频文件的元数据信息
 * - 支持编辑标题等可修改字段
 * - 显示技术参数（只读）
 */

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Check, X, Music, Clock, FileAudio, HardDrive, Calendar } from 'lucide-react'
import { CollapsiblePanel } from '../SettingsPanel/CollapsiblePanel'
import { useAudioMetadata } from './useAudioMetadata'
import type { AudioMetadataEditorProps, MetadataDisplayItem } from './types'

// ============ 工具函数 ============

/**
 * 格式化时长（秒 -> mm:ss 或 hh:mm:ss）
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化日期时间
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============ 子组件 ============

/**
 * 元数据展示项组件
 */
function MetadataItem({ item }: { item: MetadataDisplayItem }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
        {item.icon === 'music' && <Music className="w-4 h-4 text-primary-600" />}
        {item.icon === 'clock' && <Clock className="w-4 h-4 text-primary-600" />}
        {item.icon === 'file' && <FileAudio className="w-4 h-4 text-primary-600" />}
        {item.icon === 'storage' && <HardDrive className="w-4 h-4 text-primary-600" />}
        {item.icon === 'calendar' && <Calendar className="w-4 h-4 text-primary-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{item.label}</div>
        <div className="text-sm font-medium text-gray-900 truncate">
          {item.value}
          {item.unit && <span className="text-gray-500 ml-1">{item.unit}</span>}
        </div>
      </div>
    </div>
  )
}

/**
 * 标题编辑组件
 */
function TitleEditor({
  value,
  error,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSave()
            } else if (e.key === 'Escape') {
              onCancel()
            }
          }}
          placeholder="输入音频标题"
          className={`flex-1 px-3 py-2 text-lg font-semibold bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
              : 'border-gray-200 focus:ring-primary-200 focus:border-primary-400'
          }`}
          disabled={isSaving}
          autoFocus
        />
        <button
          onClick={onSave}
          disabled={isSaving}
          className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="保存"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="取消"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * 标题展示组件
 */
function TitleViewer({
  title,
  onEdit,
  disabled = false,
}: {
  title: string
  onEdit: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-lg font-semibold text-gray-900 flex-1 truncate" title={title}>
        {title}
      </h3>
      <button
        onClick={onEdit}
        disabled={disabled}
        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="编辑标题"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============ 主组件 ============

/**
 * 音频元数据编辑器组件
 */
export function AudioMetadataEditor({
  audioSource,
  onSave,
  onCancel,
  isLoading = false,
}: AudioMetadataEditorProps) {
  const {
    formData,
    errors,
    mode,
    isSaving,
    setMode,
    updateField,
    submit,
    reset,
  } = useAudioMetadata({
    initialData: audioSource,
    onSave,
    onSaveSuccess: () => {
      // 保存成功后的回调（可选）
    },
  })

  // 处理取消
  const handleCancel = useCallback(() => {
    reset()
    onCancel?.()
  }, [reset, onCancel])

  // 处理编辑
  const handleEdit = useCallback(() => {
    setMode('edit')
  }, [setMode])

  // 构建展示数据
  const metadataItems: MetadataDisplayItem[] = audioSource
    ? [
        {
          label: '时长',
          value: formatDuration(audioSource.duration),
          icon: 'clock',
        },
        {
          label: '采样率',
          value: audioSource.sampleRate,
          unit: 'Hz',
          icon: 'music',
        },
        {
          label: '声道',
          value: audioSource.channels === 1 ? '单声道' : '立体声',
          icon: 'file',
        },
        {
          label: '文件大小',
          value: formatFileSize(audioSource.fileSize),
          icon: 'storage',
        },
        {
          label: '上传时间',
          value: formatDate(audioSource.uploadedAt),
          icon: 'calendar',
        },
      ]
    : []

  // 空状态
  if (!audioSource) {
    return (
      <div className="card p-6 text-center">
        <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">暂无音频信息</p>
      </div>
    )
  }

  return (
    <CollapsiblePanel
      title="音频信息"
      description={audioSource.fileName}
      defaultOpen={true}
    >
      <div className="space-y-4">
        {/* 标题区域 */}
        <div className="border-b border-gray-100 pb-4">
          {mode === 'edit' ? (
            <TitleEditor
              value={formData.title}
              error={errors.title}
              onChange={(value) => updateField('title', value)}
              onSave={submit}
              onCancel={handleCancel}
              isSaving={isSaving || isLoading}
            />
          ) : (
            <TitleViewer
              title={formData.title || audioSource.title}
              onEdit={handleEdit}
              disabled={isLoading}
            />
          )}
        </div>

        {/* 元数据展示 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {metadataItems.map((item, index) => (
            <MetadataItem key={index} item={item} />
          ))}
        </div>

        {/* 处理状态 */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">处理状态:</span>
            <span
              className={`text-xs font-medium ${
                audioSource.processingStatus === 'completed'
                  ? 'text-green-600'
                  : audioSource.processingStatus === 'error'
                    ? 'text-red-600'
                    : audioSource.processingStatus === 'processing'
                      ? 'text-blue-600'
                      : 'text-gray-500'
              }`}
            >
              {audioSource.processingStatus === 'completed' && '已完成'}
              {audioSource.processingStatus === 'error' && '处理失败'}
              {audioSource.processingStatus === 'processing' && '处理中...'}
              {audioSource.processingStatus === 'pending' && '待处理'}
            </span>
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  )
}
