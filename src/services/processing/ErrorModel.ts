import type { TaskError } from '@/services/processing/TaskTypes'

export const ERROR_CODES = {
  UNKNOWN: 'UNKNOWN',
  CANCELED: 'CANCELED',
  TASK_CONFLICT: 'TASK_CONFLICT',
  WORKER_CRASHED: 'WORKER_CRASHED',
  WORKER_PROTOCOL_ERROR: 'WORKER_PROTOCOL_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  DURATION_TOO_LONG: 'DURATION_TOO_LONG',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  READ_FAILED: 'READ_FAILED',
  DECODE_FAILED: 'DECODE_FAILED',
  IDB_FAILED: 'IDB_FAILED',
  TASK_TIMEOUT: 'TASK_TIMEOUT',
} as const

function getMessageFromUnknown(error: unknown): string | undefined {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return undefined
}

export function toTaskError(error: unknown): TaskError {
  const debugMessage = getMessageFromUnknown(error)

  return {
    code: ERROR_CODES.UNKNOWN,
    userMessage: '操作失败，请重试',
    recoverable: false,
    debugMessage,
    cause: error,
  }
}

