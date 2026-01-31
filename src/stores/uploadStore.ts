import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { zustandIdbStorage } from '@/utils/zustandIdbStorage'

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
  status: UploadStatus
  file: File | null
  meta: AudioMeta | null
  error?: string
  progress?: number
  reader?: FileReader | null
  audioCtx?: AudioContext | null
  setDragging: (dragging: boolean) => void
  setFile: (file: File | null) => void
  setParsing: () => void
  setProgress: (p: number) => void
  attachSession: (reader: FileReader | null, audioCtx: AudioContext | null) => void
  setReady: (meta: AudioMeta) => void
  setError: (msg: string) => void
  cancelParsing: () => void
  clear: () => void
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set) => ({
      status: 'idle',
      file: null,
      meta: null,
      error: undefined,
      progress: undefined,
      reader: null,
      audioCtx: null,
      setDragging: (dragging) => set({ status: dragging ? 'dragging' : 'idle' }),
      setFile: (file) => set({
        file,
        meta: file ? { name: file.name, type: file.type, size: file.size } : null,
        status: file ? 'validating' : 'idle',
        error: undefined
      }),
      setParsing: () => set({ status: 'parsing', error: undefined, progress: 0 }),
      setProgress: (p) => set({ progress: p }),
      attachSession: (reader, audioCtx) => set({ reader, audioCtx }),
      setReady: (meta) => set({ meta, status: 'ready', error: undefined }),
      setError: (msg) => set({ error: msg, status: 'error' }),
      cancelParsing: () => set((state) => {
        try { state.reader?.abort() } catch {}
        try { state.audioCtx?.close() } catch {}
        return { status: 'idle', progress: undefined, reader: null, audioCtx: null, file: null, meta: null, error: undefined }
      }),
      clear: () => set({ status: 'idle', file: null, meta: null, error: undefined, progress: undefined, reader: null, audioCtx: null })
    }),
    {
      name: 'musegen-upload',
      partialize: (state) => ({ meta: state.meta }), // 仅持久化元数据
      storage: createJSONStorage(() => zustandIdbStorage),
      version: 1
    }
  )
)
