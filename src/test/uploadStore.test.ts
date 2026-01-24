import { describe, it, expect } from 'vitest'
import { useUploadStore } from '@/stores/uploadStore'
import { validateFile } from '@/utils/audio'

describe('uploadStore', () => {
  it('initial state is idle', () => {
    const s = useUploadStore.getState()
    expect(s.status).toBe('idle')
    expect(s.meta).toBeNull()
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

  it('cancelParsing resets state', () => {
    const s = useUploadStore.getState()
    s.setParsing()
    s.attachSession(new FileReader(), null as any)
    s.setProgress(50)
    s.cancelParsing()
    const st = useUploadStore.getState()
    expect(st.status).toBe('idle')
    expect(st.progress).toBeUndefined()
    expect(st.file).toBeNull()
    expect(st.meta).toBeNull()
  })

  it('clear empties file and meta', () => {
    const s = useUploadStore.getState()
    s.setFile(new File(['x'], 'a.mp3', { type: 'audio/mpeg' }))
    s.setReady({ name: 'a.mp3', type: 'audio/mpeg', size: 1 })
    s.clear()
    const st = useUploadStore.getState()
    expect(st.file).toBeNull()
    expect(st.meta).toBeNull()
    expect(st.status).toBe('idle')
  })
})
