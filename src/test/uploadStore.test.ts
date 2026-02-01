import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUploadStore } from '@/stores/uploadStore'
import { validateFile } from '@/utils/audio'
import { taskController } from '@/services/processing'
import { saveAudio } from '@/db/audioRepository'

// Mock dependencies
vi.mock('@/services/processing', () => ({
  taskController: {
    enqueue: vi.fn(() => 'test-task-id'),
    subscribe: vi.fn(() => () => {}),
    run: vi.fn(),
    cancel: vi.fn(),
  }
}))

vi.mock('@/db/audioRepository', () => ({
  saveAudio: vi.fn(),
  QuotaExceededError: class extends Error {},
}))

describe('uploadStore', () => {
  const initialState = useUploadStore.getState()

  beforeEach(() => {
    useUploadStore.setState(initialState, true)
    vi.clearAllMocks()
  })

  it('initial state is idle', () => {
    const s = useUploadStore.getState()
    expect(s.status).toBe('idle')
    expect(s.meta).toBeNull()
    expect(s.audioSourceId).toBeNull()
  })

  it('setDragging toggles status', () => {
    const s = useUploadStore.getState()
    s.setDragging(true)
    expect(useUploadStore.getState().status).toBe('dragging')
    s.setDragging(false)
    expect(useUploadStore.getState().status).toBe('idle')
  })

  it('validateFile rejects non-audio types', () => {
    const file = new File(['x'], 'x.txt', { type: 'text/plain' })
    const err = validateFile(file)
    expect(err).toBeTruthy()
  })

  it('cancelUpload resets state', () => {
    const s = useUploadStore.getState()
    // Simulate parsing state
    useUploadStore.setState({ status: 'parsing', taskId: 'test-task', progress: 50 })
    
    s.cancelUpload()
    
    const st = useUploadStore.getState()
    expect(st.status).toBe('idle')
    expect(st.progress).toBeUndefined()
    expect(st.file).toBeNull()
    expect(st.meta).toBeNull()
    expect(st.audioSourceId).toBeNull()
  })

  it('reset empties file and meta', () => {
    const s = useUploadStore.getState()
    // Simulate ready state
    useUploadStore.setState({ 
      file: new File(['x'], 'a.mp3', { type: 'audio/mpeg' }),
      meta: { name: 'a.mp3', type: 'audio/mpeg', size: 1 },
      status: 'ready',
      audioSourceId: 'test-id'
    })
    
    s.reset()
    
    const st = useUploadStore.getState()
    expect(st.file).toBeNull()
    expect(st.meta).toBeNull()
    expect(st.status).toBe('idle')
    expect(st.audioSourceId).toBeNull()
  })

  describe('startUpload integration', () => {
    it('should save audio to DB upon success', async () => {
      const file = new File([''], 'test.mp3', { type: 'audio/mpeg' })
      
      // Mock task success
      const mockResult = {
        meta: { 
            name: 'test.mp3', 
            type: 'audio/mpeg', 
            size: 0,
            duration: 60,
            sampleRate: 44100,
            channels: 2 
        },
        audioBuffer: {} as AudioBuffer
      }
      vi.mocked(taskController.run).mockResolvedValue(mockResult)
      
      // Mock saveAudio success
      vi.mocked(saveAudio).mockResolvedValue({ id: 'audio-id' } as any)

      await useUploadStore.getState().startUpload(file)

      expect(saveAudio).toHaveBeenCalledWith(file, {
        title: 'test',
        duration: 60,
        sampleRate: 44100,
        channels: 2
      })
      
      const state = useUploadStore.getState()
      expect(state.status).toBe('ready')
      expect(state.audioSourceId).toBe('audio-id')
    })

    it('should handle DB save error', async () => {
      const file = new File([''], 'test.mp3', { type: 'audio/mpeg' })
      
      // Mock task success
      const mockResult = {
        meta: { 
            name: 'test.mp3', 
            type: 'audio/mpeg', 
            size: 0,
            duration: 60,
            sampleRate: 44100,
            channels: 2 
        },
        audioBuffer: {} as AudioBuffer
      }
      vi.mocked(taskController.run).mockResolvedValue(mockResult)
      
      // Mock saveAudio failure
      vi.mocked(saveAudio).mockRejectedValue(new Error('DB Error'))

      await useUploadStore.getState().startUpload(file)

      const state = useUploadStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).toBe('保存音频失败')
    })
  })
})
