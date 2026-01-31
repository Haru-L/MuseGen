import { describe, it, expect, vi } from 'vitest'
import { TaskController } from '@/services/processing/TaskController'
import type { ProgressEvent, TaskStatus } from '@/services/processing/TaskTypes'

describe('TaskController', () => {
  it('runs a task and emits status + progress events', async () => {
    const controller = new TaskController()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: Array<{ type: string; payload: any }> = []

    const unsubscribe = controller.subscribe((e) => {
      events.push({ type: e.type, payload: e })
    })

    const taskId = controller.enqueue({
      name: 't1',
      run: async ({ reportProgress }) => {
        reportProgress({ phase: 'upload', percent: 10, message: 'p10' })
        reportProgress({ phase: 'upload', percent: 100, message: 'p100' })
        return 123
      }
    })

    const result = await controller.run(taskId)
    unsubscribe()

    expect(result).toBe(123)

    const statuses = events
      .filter(e => e.type === 'status')
      .map(e => (e.payload.status as TaskStatus))
    expect(statuses).toContain('queued')
    expect(statuses).toContain('running')
    expect(statuses).toContain('succeeded')

    const progress = events
      .filter(e => e.type === 'progress')
      .map(e => (e.payload.progress as ProgressEvent))
    expect(progress.length).toBeGreaterThanOrEqual(2)
    expect(progress[0].taskId).toBe(taskId)
    expect(progress[0].percent).toBe(10)
    expect(progress[progress.length - 1].percent).toBe(100)
  })

  it('cancels a queued task', async () => {
    const controller = new TaskController()
    const taskId = controller.enqueue({
      name: 'queued',
      run: async () => 1
    })

    controller.cancel(taskId)
    const task = controller.getTask(taskId)
    expect(task?.status).toBe('canceled')
  })

  it('cancels a running task (AbortSignal)', async () => {
    const controller = new TaskController()
    const aborted = vi.fn()

    const taskId = controller.enqueue({
      name: 'long',
      run: async ({ signal }) => {
        signal.addEventListener('abort', () => aborted())
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 10_000)
          signal.addEventListener('abort', () => {
            clearTimeout(t)
            reject(new Error('aborted'))
          })
        })
        return 1
      }
    })

    const runPromise = controller.run(taskId)
    await new Promise(r => setTimeout(r, 10))
    controller.cancel(taskId)

    await expect(runPromise).rejects.toBeTruthy()
    expect(aborted).toHaveBeenCalled()
    expect(controller.getTask(taskId)?.status).toBe('canceled')
  })
})

