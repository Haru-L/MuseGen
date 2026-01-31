import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { zustandIdbStorage } from '@/utils/zustandIdbStorage'
import { taskController } from '@/services/processing'
import { createUploadTask } from '@/services/processing/specs/UploadTask'
import { validateFile } from '@/utils/audio'

export type UploadStatus = 'idle' | 'dragging' | 'validating' | 'parsing' | 'ready' | 'error'

export interface AudioMeta {
  name: string
  type: string
  size: number
  duration?: number
  sampleRate?: number
  channels?: number
}

interface UploadState {
  // State
  status: UploadStatus
  file: File | null
  meta: AudioMeta | null
  error?: string
  progress?: number
  taskId: string | null
  
  // Transient data (not persisted)
  audioBuffer: AudioBuffer | null

  // Actions
  setDragging: (dragging: boolean) => void
  startUpload: (file: File) => Promise<void>
  cancelUpload: () => void
  reset: () => void
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      file: null,
      meta: null,
      error: undefined,
      progress: undefined,
      taskId: null,
      audioBuffer: null,

      setDragging: (dragging) => set({ status: dragging ? 'dragging' : 'idle' }),

      startUpload: async (file) => {
        // 1. Reset state
        set({ 
          file, 
          status: 'validating', 
          error: undefined, 
          progress: 0,
          meta: { name: file.name, type: file.type, size: file.size } 
        })

        // 2. Validate
        const validationError = validateFile(file)
        if (validationError) {
          set({ status: 'error', error: validationError })
          return
        }

        // 3. Create & Enqueue Task
        const taskSpec = createUploadTask(file)
        const taskId = taskController.enqueue(taskSpec)
        
        set({ taskId, status: 'parsing' })

        // 4. Subscribe to progress
        const unsubscribe = taskController.subscribe((e) => {
          if (e.taskId === taskId) {
            if (e.type === 'progress') {
              set({ progress: e.progress.percent })
            } else if (e.type === 'error') {
               // Error handled in catch block below, but we can sync specific message here if needed
            }
          }
        })

        // 5. Run Task
        try {
          const result = await taskController.run<ReturnType<typeof createUploadTask> extends import('@/services/processing/TaskTypes').TaskSpec<infer R> ? R : never>(taskId)
          
          set({ 
            status: 'ready', 
            meta: result.meta, 
            audioBuffer: result.audioBuffer,
            progress: 100 
          })
        } catch (error: unknown) {
          const err = error as { message?: string; code?: string }
          // If canceled, status is already handled or we should reset
          if (err.message === 'Canceled' || err.code === 'CANCELED') {
            set({ status: 'idle', file: null, meta: null, progress: undefined })
          } else {
            set({ status: 'error', error: err.message || '解析失败' })
          }
        } finally {
          unsubscribe()
        }
      },

      cancelUpload: () => {
        const { taskId } = get()
        if (taskId) {
          taskController.cancel(taskId)
          // State update will happen in startUpload's catch block or we can force it here
          set({ status: 'idle', file: null, meta: null, progress: undefined, taskId: null })
        }
      },

      reset: () => {
        const { taskId } = get()
        if (taskId) {
          taskController.cancel(taskId)
        }
        set({ 
          status: 'idle', 
          file: null, 
          meta: null, 
          error: undefined, 
          progress: undefined, 
          taskId: null, 
          audioBuffer: null 
        })
      }
    }),
    {
      name: 'musegen-upload',
      partialize: (state) => ({ meta: state.meta }), // Only persist metadata
      storage: createJSONStorage(() => zustandIdbStorage),
      version: 2 // Increment version due to schema change
    }
  )
)
