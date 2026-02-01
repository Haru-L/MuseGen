import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { zustandIdbStorage } from '@/utils/zustandIdbStorage'
import { taskController } from '@/services/processing'
import { createUploadTask } from '@/services/processing/specs/UploadTask'
import { validateFile } from '@/utils/audio'
import { saveAudio, QuotaExceededError } from '@/db/audioRepository'

export type UploadStatus = 'idle' | 'dragging' | 'validating' | 'parsing' | 'saving' | 'ready' | 'error'

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
  audioSourceId: string | null
  
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
      audioSourceId: null,
      audioBuffer: null,

      setDragging: (dragging) => set({ status: dragging ? 'dragging' : 'idle' }),

      startUpload: async (file) => {
        // 1. Reset state
        set({ 
          file, 
          status: 'validating', 
          error: undefined, 
          progress: 0,
          meta: { name: file.name, type: file.type, size: file.size },
          audioSourceId: null
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
          
          // 6. Save to IndexedDB
          set({ status: 'saving' })
          let audioSourceId: string | null = null
          try {
            const audioSource = await saveAudio(file, {
              title: file.name.replace(/\.[^/.]+$/, ''),
              duration: result.meta.duration!,
              sampleRate: result.meta.sampleRate!,
              channels: result.meta.channels!,
            })
            audioSourceId = audioSource.id
          } catch (dbError) {
            console.error('Failed to save to DB:', dbError)
            const msg = dbError instanceof QuotaExceededError 
              ? '存储空间不足，无法保存音频' 
              : '保存音频失败'
            set({ status: 'error', error: msg })
            return
          }

          set({ 
            status: 'ready', 
            meta: result.meta, 
            audioBuffer: result.audioBuffer,
            progress: 100,
            audioSourceId
          })
        } catch (error: unknown) {
          const err = error as { message?: string; code?: string }
          // If canceled, status is already handled or we should reset
          if (err.message === 'Canceled' || err.code === 'CANCELED') {
            set({ status: 'idle', file: null, meta: null, progress: undefined, audioSourceId: null })
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
          set({ status: 'idle', file: null, meta: null, progress: undefined, taskId: null, audioSourceId: null })
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
          audioSourceId: null,
          audioBuffer: null 
        })
      }
    }),
    {
      name: 'musegen-upload',
      partialize: (state) => ({ 
        meta: state.meta,
        audioSourceId: state.audioSourceId 
      }),
      storage: createJSONStorage(() => zustandIdbStorage),
      version: 2 // Increment version due to schema change
    }
  )
)
