import { toTaskError, ERROR_CODES } from '@/services/processing/ErrorModel'
import type { ProgressEvent, TaskEvent, TaskSnapshot, TaskSpec, TaskStatus } from '@/services/processing/TaskTypes'

type InternalTask<TResult> = {
  id: string
  name: string
  status: TaskStatus
  spec: TaskSpec<TResult>
  abortController: AbortController | null
  progress: ProgressEvent | null
  error: ReturnType<typeof toTaskError> | null
}

type ControllerState = {
  tasks: Record<string, InternalTask<any>> // eslint-disable-line @typescript-eslint/no-explicit-any
  queue: string[]
  runningTaskId: string | null
}

function defaultIdFactory(): string {
  return `task_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

export class TaskController {
  private state: ControllerState = { tasks: {}, queue: [], runningTaskId: null }
  private listeners: Array<(e: TaskEvent) => void> = []
  private readonly now: () => number
  private readonly idFactory: () => string

  constructor(opts?: { now?: () => number; idFactory?: () => string }) {
    this.now = opts?.now ?? (() => Date.now())
    this.idFactory = opts?.idFactory ?? defaultIdFactory
  }

  subscribe(listener: (e: TaskEvent) => void): () => void {
    this.listeners = [...this.listeners, listener]
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  enqueue<TResult>(spec: TaskSpec<TResult>): string {
    const id = this.idFactory()
    const task: InternalTask<TResult> = {
      id,
      name: spec.name,
      status: 'queued',
      spec,
      abortController: null,
      progress: null,
      error: null,
    }

    this.state = {
      ...this.state,
      tasks: {
        ...this.state.tasks,
        [id]: task,
      },
      queue: [...this.state.queue, id],
    }

    this.emit({ type: 'status', taskId: id, status: 'queued' })
    return id
  }

  getTask(taskId: string): TaskSnapshot | null {
    const t = this.state.tasks[taskId]
    if (!t) return null
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      progress: t.progress,
      error: t.error,
    }
  }

  cancel(taskId: string): void {
    const t = this.state.tasks[taskId]
    if (!t) return
    if (t.status === 'succeeded' || t.status === 'failed' || t.status === 'canceled') return

    const nextTask: InternalTask<any> = {
      ...t,
      status: 'canceled',
      abortController: null,
    }

    this.state = {
      ...this.state,
      tasks: {
        ...this.state.tasks,
        [taskId]: nextTask,
      },
      queue: this.state.queue.filter(id => id !== taskId),
      runningTaskId: this.state.runningTaskId === taskId ? null : this.state.runningTaskId,
    }

    try {
      t.abortController?.abort()
    } catch { /* ignore */ }

    this.emit({ type: 'status', taskId, status: 'canceled' })
  }

  async run<TResult>(taskId: string): Promise<TResult> {
    const t = this.state.tasks[taskId] as InternalTask<TResult> | undefined
    if (!t) {
      throw new Error('Task not found')
    }
    if (t.status === 'canceled') {
      throw new Error('Task canceled')
    }
    if (this.state.runningTaskId && this.state.runningTaskId !== taskId) {
      const err = {
        code: ERROR_CODES.TASK_CONFLICT,
        userMessage: '已有任务正在运行，请先取消或等待完成',
        recoverable: true,
      }
      this.emit({ type: 'error', taskId, error: err })
      throw new Error(err.userMessage)
    }

    const abortController = new AbortController()
    const runningTask: InternalTask<TResult> = {
      ...t,
      status: 'running',
      abortController,
      error: null,
    }

    this.state = {
      ...this.state,
      tasks: {
        ...this.state.tasks,
        [taskId]: runningTask,
      },
      queue: this.state.queue.filter(id => id !== taskId),
      runningTaskId: taskId,
    }

    this.emit({ type: 'status', taskId, status: 'running' })

    const reportProgress = (
      p: Omit<ProgressEvent, 'taskId' | 'updatedAt'> & { updatedAt?: number }
    ) => {
      const progress: ProgressEvent = {
        taskId,
        phase: p.phase,
        percent: clampPercent(p.percent),
        stagePercent: p.stagePercent,
        message: p.message,
        etaMs: p.etaMs,
        updatedAt: p.updatedAt ?? this.now(),
      }

      const current = this.state.tasks[taskId] as InternalTask<TResult> | undefined
      if (!current) return
      const next: InternalTask<TResult> = { ...current, progress }
      this.state = {
        ...this.state,
        tasks: { ...this.state.tasks, [taskId]: next },
      }
      this.emit({ type: 'progress', taskId, progress })
    }

    try {
      const result = await t.spec.run({ taskId, signal: abortController.signal, reportProgress })

      const current = this.state.tasks[taskId] as InternalTask<TResult> | undefined
      if (!current) return result
      if (current.status === 'canceled') {
        return result
      }

      const succeeded: InternalTask<TResult> = {
        ...current,
        status: 'succeeded',
        abortController: null,
      }

      this.state = {
        ...this.state,
        tasks: { ...this.state.tasks, [taskId]: succeeded },
        runningTaskId: this.state.runningTaskId === taskId ? null : this.state.runningTaskId,
      }
      this.emit({ type: 'status', taskId, status: 'succeeded' })
      return result
    } catch (error) {
      const current = this.state.tasks[taskId] as InternalTask<TResult> | undefined
      const aborted = abortController.signal.aborted || current?.status === 'canceled'

      if (aborted) {
        this.state = {
          ...this.state,
          runningTaskId: this.state.runningTaskId === taskId ? null : this.state.runningTaskId,
        }
        throw error
      }

      const taskError = toTaskError(error)
      const failed: InternalTask<TResult> = {
        ...(current ?? runningTask),
        status: 'failed',
        abortController: null,
        error: taskError,
      }

      this.state = {
        ...this.state,
        tasks: { ...this.state.tasks, [taskId]: failed },
        runningTaskId: this.state.runningTaskId === taskId ? null : this.state.runningTaskId,
      }

      this.emit({ type: 'error', taskId, error: taskError })
      this.emit({ type: 'status', taskId, status: 'failed' })
      throw error
    }
  }

  private emit(e: TaskEvent) {
    for (const l of this.listeners) {
      try {
        l(e)
      } catch { /* ignore */ }
    }
  }
}

