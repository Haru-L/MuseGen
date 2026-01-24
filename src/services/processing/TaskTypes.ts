export type TaskStatus = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

export interface ProgressEvent {
  taskId: string
  phase: string
  percent: number
  stagePercent?: number
  message: string
  etaMs?: number
  updatedAt: number
}

export interface TaskError {
  code: string
  userMessage: string
  recoverable: boolean
  debugMessage?: string
  cause?: unknown
}

export interface TaskRunContext {
  taskId: string
  signal: AbortSignal
  reportProgress: (progress: Omit<ProgressEvent, 'taskId' | 'updatedAt'> & { updatedAt?: number }) => void
}

export interface TaskSpec<TResult> {
  name: string
  run: (ctx: TaskRunContext) => Promise<TResult>
}

export type TaskEvent =
  | { type: 'status'; taskId: string; status: TaskStatus }
  | { type: 'progress'; taskId: string; progress: ProgressEvent }
  | { type: 'error'; taskId: string; error: TaskError }

export interface TaskSnapshot {
  id: string
  name: string
  status: TaskStatus
  progress: ProgressEvent | null
  error: TaskError | null
}

