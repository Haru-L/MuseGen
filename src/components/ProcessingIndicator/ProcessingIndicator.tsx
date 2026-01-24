import type { ProgressEvent, TaskError, TaskStatus } from '@/services/processing/TaskTypes'

type Props = {
  status: TaskStatus
  progress: ProgressEvent
  error?: TaskError
  onCancel?: () => void
  onRetry?: () => void
}

export function ProcessingIndicator({ status, progress, error, onCancel, onRetry }: Props) {
  const percent = Math.max(0, Math.min(100, progress.percent))

  return (
    <div className="w-full md:w-2/3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{progress.message}</p>
        <p className="text-sm text-gray-600">{Math.round(percent)}%</p>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-primary-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {status === 'running' && onCancel && (
        <div className="mt-3">
          <button className="btn-secondary" onClick={onCancel}>取消处理</button>
        </div>
      )}

      {status === 'failed' && error && (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-600">{error.userMessage}</p>
          {error.recoverable && onRetry && (
            <div className="mt-2">
              <button className="btn-primary" onClick={onRetry}>重试</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

