import { Music } from 'lucide-react';
import { useUploadStore } from '@/stores/uploadStore'
import { AudioDropzone } from '@/components/Upload/AudioDropzone'
import { useRef, useState, useEffect } from 'react'
import { ProcessingIndicator } from '@/components/ProcessingIndicator'
import { mapUploadToProcessing } from '@/utils/uploadProgressAdapter'
import { AudioMetadataEditor } from '@/components/AudioMetadata'
import { getAudioSource, updateAudioSource } from '@/db/audioRepository'
import type { AudioSource } from '@/db/schema'

export function HomePage() {
  const status = useUploadStore(s => s.status)
  const meta = useUploadStore(s => s.meta)
  const error = useUploadStore(s => s.error)
  const progress = useUploadStore(s => s.progress)
  const file = useUploadStore(s => s.file)
  const audioSourceId = useUploadStore(s => s.audioSourceId)
  const cancelUpload = useUploadStore(s => s.cancelUpload)
  const startUpload = useUploadStore(s => s.startUpload)
  const reset = useUploadStore(s => s.reset)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processing = mapUploadToProcessing({ status, progress, error })

  // AudioSource 状态
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null)

  // 当 audioSourceId 变化时加载数据
  useEffect(() => {
    if (audioSourceId) {
      getAudioSource(audioSourceId)
        .then(setAudioSource)
        .catch(console.error)
    } else {
      setAudioSource(null)
    }
  }, [audioSourceId])

  // 处理元数据保存
  const handleSaveMetadata = async (updates: { title: string }) => {
    if (audioSourceId) {
      const updated = await updateAudioSource(audioSourceId, updates)
      setAudioSource(updated)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold mb-4 title-gradient">
          卡林巴琴乐谱生成器
        </h1>
        <p className="text-lg text-gray-600">
          上传MP3音频文件，自动生成适合卡林巴演奏的乐谱
        </p>
      </div>

      <div className="card">
        <div className="flex flex-col items-center justify-center py-10 space-y-8">
          <Music className="w-20 h-20 text-primary-500 animate-pulse-slow" />
          <AudioDropzone />
          {processing && (
            <ProcessingIndicator
              status={processing.status}
              progress={processing.progress}
              error={processing.error}
              onCancel={processing.status === 'running' ? cancelUpload : undefined}
              onRetry={
                processing.status === 'failed'
                  ? () => { if (file) startUpload(file) }
                  : undefined
              }
            />
          )}
          {error && !processing && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}
          {status === 'ready' && (
            <div className="w-full md:w-2/3 space-y-6">
              {/* 使用新的元数据编辑器组件 */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm border border-white/60">
                <AudioMetadataEditor 
                  audioSource={audioSource} 
                  onSave={handleSaveMetadata}
                />
              </div>

              {/* 操作按钮区域 */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a href="/settings" className="btn-primary">开始生成（配置检查）</a>
                <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>更换文件</button>
                <button className="btn-secondary" onClick={reset}>清除文件</button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg,.wav,audio/wav"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    startUpload(file)
                    // 重置 input value，允许重复选择同一文件
                    e.target.value = ''
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">自定义配置</h3>
          <p className="text-gray-600 text-sm">
            支持17键、21键或自定义琴键数量和调音
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">三种难度</h3>
          <p className="text-gray-600 text-sm">
            根据您的演奏水平选择入门、普通或进阶难度
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">本地存储</h3>
          <p className="text-gray-600 text-sm">
            所有乐谱保存在本地，保护您的隐私
          </p>
        </div>
      </div>
    </div>
  );
}
