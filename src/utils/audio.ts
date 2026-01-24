import { useUploadStore, AudioMeta } from '@/stores/uploadStore'

export const MAX_SIZE_BYTES = 50 * 1024 * 1024
export const MAX_DURATION_SEC = 10 * 60
export const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav']

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return '仅支持 MP3 或 WAV 音频文件'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return '文件过大（超过 50MB）'
  }
  return null
}

export async function parseAudioMetadata(file: File): Promise<AudioMeta> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const duration = audioBuffer.duration
    const sampleRate = audioBuffer.sampleRate
    const channels = audioBuffer.numberOfChannels
    if (duration > MAX_DURATION_SEC) {
      throw new Error('音频时长超过 10 分钟')
    }
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      duration,
      sampleRate,
      channels
    }
  } finally {
    ctx.close()
  }
}

export function parseAudioWithProgress(file: File) {
  const s = useUploadStore.getState()
  const reader = new FileReader()
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  s.attachSession(reader, ctx)
  s.setParsing()
  return new Promise<AudioMeta>((resolve, reject) => {
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = Math.min(100, Math.round((e.loaded / e.total) * 100))
        s.setProgress(p)
      }
    }
    reader.onerror = () => {
      s.attachSession(null, null)
      reject(new Error('读取文件失败'))
    }
    reader.onabort = () => {
      s.attachSession(null, null)
      reject(new Error('已取消解析'))
    }
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        const duration = audioBuffer.duration
        const sampleRate = audioBuffer.sampleRate
        const channels = audioBuffer.numberOfChannels
        if (duration > MAX_DURATION_SEC) {
          throw new Error('音频时长超过 10 分钟')
        }
        const meta: AudioMeta = {
          name: file.name,
          type: file.type,
          size: file.size,
          duration,
          sampleRate,
          channels
        }
        s.attachSession(null, null)
        resolve(meta)
      } catch (err) {
        s.attachSession(null, null)
        reject(err as Error)
      } finally {
        ctx.close()
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

export async function handleFileUpload(file: File) {
  const s = useUploadStore.getState()
  s.setFile(file)
  const err = validateFile(file)
  if (err) {
    s.setError(err)
    return
  }
  try {
    const meta = await parseAudioWithProgress(file)
    s.setReady(meta)
  } catch (e: any) {
    s.setError(e?.message || '解析音频失败')
  }
}
