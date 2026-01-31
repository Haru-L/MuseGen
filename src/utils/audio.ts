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
