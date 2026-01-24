import type { ProgressEvent, TaskError } from '@/services/processing/TaskTypes'

export type WorkerStartMessage<TPayload = unknown> = {
  type: 'start'
  taskId: string
  payload: TPayload
}

export type WorkerCancelMessage = {
  type: 'cancel'
  taskId: string
}

export type WorkerInboundMessage<TPayload = unknown> =
  | WorkerStartMessage<TPayload>
  | WorkerCancelMessage

export type WorkerProgressMessage = {
  type: 'progress'
  taskId: string
  progress: ProgressEvent
}

export type WorkerDoneMessage<TResult = unknown> = {
  type: 'done'
  taskId: string
  result: TResult
}

export type WorkerCanceledMessage = {
  type: 'canceled'
  taskId: string
}

export type WorkerErrorMessage = {
  type: 'error'
  taskId: string
  error: TaskError
}

export type WorkerOutboundMessage<TResult = unknown> =
  | WorkerProgressMessage
  | WorkerDoneMessage<TResult>
  | WorkerCanceledMessage
  | WorkerErrorMessage

