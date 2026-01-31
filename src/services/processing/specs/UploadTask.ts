import type { TaskSpec } from '@/services/processing/TaskTypes'
import type { AudioMeta } from '@/stores/uploadStore'

export interface UploadTaskResult {
  meta: AudioMeta
  audioBuffer: AudioBuffer
}

export const MAX_DURATION_SEC = 10 * 60 // 10 minutes

export function createUploadTask(file: File): TaskSpec<UploadTaskResult> {
  return {
    name: `解析音频: ${file.name}`,
    run: async ({ signal, reportProgress }) => {
      // 1. Read File
      reportProgress({
        phase: 'read',
        percent: 0,
        message: '正在读取文件...',
      })

      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('读取文件失败'))
        
        // Handle cancellation
        signal.addEventListener('abort', () => {
          reader.abort()
          reject(new Error('Canceled'))
        })

        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            reportProgress({
              phase: 'read',
              percent: (e.loaded / e.total) * 50, // Reading is first 50%
              message: '正在读取文件...',
            })
          }
        }

        reader.readAsArrayBuffer(file)
      })

      if (signal.aborted) throw new Error('Canceled')

      // 2. Decode Audio
      reportProgress({
        phase: 'decode',
        percent: 50,
        message: '正在解码音频...',
      })

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      try {
        // Note: decodeAudioData does not support AbortSignal natively in all browsers yet,
        // but we can close the context to stop it effectively.
        const decodePromise = ctx.decodeAudioData(arrayBuffer)
        
        // Race against abort
        const audioBuffer = await Promise.race([
          decodePromise,
          new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => reject(new Error('Canceled')))
          })
        ])

        if (signal.aborted) throw new Error('Canceled')

        // Validate duration
        if (audioBuffer.duration > MAX_DURATION_SEC) {
          throw new Error('音频时长超过 10 分钟')
        }

        const meta: AudioMeta = {
          name: file.name,
          type: file.type,
          size: file.size,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
        }

        reportProgress({
          phase: 'done',
          percent: 100,
          message: '解析完成',
        })

        return { meta, audioBuffer }

      } finally {
        // Always close context to free resources
        ctx.close().catch(() => {})
      }
    },
  }
}
