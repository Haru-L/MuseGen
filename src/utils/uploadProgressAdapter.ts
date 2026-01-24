import type { UploadStatus } from '@/stores/uploadStore'
import type { ProgressEvent, TaskError, TaskStatus } from '@/services/processing/TaskTypes'
import { ERROR_CODES } from '@/services/processing/ErrorModel'

const UPLOAD_TASK_ID = 'upload-parse'

type Input = {
  status: UploadStatus
  progress?: number
  error?: string
  now?: () => number
}

export function mapUploadToProcessing(input: Input): {
  status: TaskStatus
  progress: ProgressEvent
  error?: TaskError
} | null {
  const now = input.now ?? (() => Date.now())

  if (input.status === 'idle' || input.status === 'dragging') return null
  if (input.status === 'ready') return null

  const percent = Math.max(0, Math.min(100, input.progress ?? 0))
  const base: ProgressEvent = {
    taskId: UPLOAD_TASK_ID,
    phase: 'upload',
    percent,
    message: input.status === 'validating' ? '正在校验文件…' : '正在解析音频…',
    updatedAt: now(),
  }

  if (input.status === 'error') {
    const taskError: TaskError = {
      code: ERROR_CODES.UNKNOWN,
      userMessage: input.error || '解析失败',
      recoverable: true,
    }
    return { status: 'failed', progress: base, error: taskError }
  }

  return { status: 'running', progress: base }
}

