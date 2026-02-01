import { describe, it, expect } from 'vitest'
import { mapUploadToProcessing } from '@/utils/uploadProgressAdapter'

describe('uploadProgressAdapter', () => {
  it('should return null for idle/ready status', () => {
    expect(mapUploadToProcessing({ status: 'idle' })).toBeNull()
    expect(mapUploadToProcessing({ status: 'dragging' })).toBeNull()
    expect(mapUploadToProcessing({ status: 'ready' })).toBeNull()
  })

  it('should map validating status', () => {
    const result = mapUploadToProcessing({ status: 'validating', progress: 0 })
    expect(result?.status).toBe('running')
    expect(result?.progress.message).toBe('正在校验文件…')
  })

  it('should map parsing status', () => {
    const result = mapUploadToProcessing({ status: 'parsing', progress: 50 })
    expect(result?.status).toBe('running')
    expect(result?.progress.message).toBe('正在解析音频…')
    expect(result?.progress.percent).toBe(50)
  })

  it('should map saving status', () => {
    const result = mapUploadToProcessing({ status: 'saving', progress: 100 })
    expect(result?.status).toBe('running')
    expect(result?.progress.message).toBe('正在保存音频…')
    expect(result?.progress.percent).toBe(100)
  })

  it('should map error status', () => {
    const result = mapUploadToProcessing({ status: 'error', error: 'Test error' })
    expect(result?.status).toBe('failed')
    expect(result?.error?.userMessage).toBe('Test error')
  })
})
