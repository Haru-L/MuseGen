import { Music } from 'lucide-react';
import { useUploadStore } from '@/stores/uploadStore'
import { AudioDropzone } from '@/components/Upload/AudioDropzone'
import { useRef } from 'react'
import { handleFileUpload } from '@/utils/audio'
import { ProcessingIndicator } from '@/components/ProcessingIndicator'
import { mapUploadToProcessing } from '@/utils/uploadProgressAdapter'

export function HomePage() {
  const status = useUploadStore(s => s.status)
  const meta = useUploadStore(s => s.meta)
  const error = useUploadStore(s => s.error)
  const progress = useUploadStore(s => s.progress)
  const file = useUploadStore(s => s.file)
  const cancelParsing = useUploadStore(s => s.cancelParsing)
  const clear = useUploadStore(s => s.clear)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processing = mapUploadToProcessing({ status, progress, error })

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
              onCancel={processing.status === 'running' ? cancelParsing : undefined}
              onRetry={
                processing.status === 'failed'
                  ? () => { if (file) handleFileUpload(file) }
                  : undefined
              }
            />
          )}
          {error && !processing && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}
          {meta && status === 'ready' && (
            <div className="w-full md:w-2/3 border border-white/60 rounded-2xl p-4 bg-white/70 backdrop-blur-md">
              <div className="font-medium text-gray-900">{meta.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                类型：{meta.type} · 大小：{(meta.size / 1024 / 1024).toFixed(2)}MB
              </div>
              <div className="text-sm text-gray-600 mt-1">
                时长：{meta.duration?.toFixed(2)}s · 采样率：{meta.sampleRate}Hz · 声道：{meta.channels}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <a href="/settings" className="btn-primary">开始生成（配置检查）</a>
                <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>更换文件</button>
                <button className="btn-secondary" onClick={clear}>清除文件</button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg,.wav,audio/wav"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
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
