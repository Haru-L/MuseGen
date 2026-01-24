import { useCallback } from 'react'
import { useUploadStore } from '@/stores/uploadStore'
import { handleFileUpload } from '@/utils/audio'

export function AudioDropzone() {
  const status = useUploadStore(s => s.status)
  const setDragging = useUploadStore(s => s.setDragging)

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }, [setDragging])

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [setDragging])

  const onDragLeave = useCallback(() => {
    setDragging(false)
  }, [setDragging])

  const onSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }, [])

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        status === 'dragging'
          ? 'border-primary-400 bg-primary-50'
          : 'border-gray-300 bg-white/70 backdrop-blur-md'
      }`}
      aria-label="拖拽或点击上传音频文件"
    >
      <p className="text-gray-700 mb-4">
        将 MP3 或 WAV 文件拖拽到此处，或点击下方按钮选择文件
      </p>
      <p className="text-xs text-gray-500 mb-6">
        支持文件类型：MP3、WAV · 大小不超过 20MB · 时长不超过 10 分钟
      </p>
      <label className="btn-primary cursor-pointer">
        选择文件
        <input
          type="file"
          accept=".mp3,audio/mpeg,.wav,audio/wav"
          className="sr-only"
          onChange={onSelect}
        />
      </label>
    </div>
  )
}
