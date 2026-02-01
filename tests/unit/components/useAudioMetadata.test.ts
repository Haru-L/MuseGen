/**
 * useAudioMetadata Hook 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudioMetadata } from '@/components/AudioMetadata/useAudioMetadata'
import type { AudioSource } from '@/db/schema'

// 测试数据
const mockAudioSource: AudioSource = {
  id: 'test-audio-123',
  title: 'Test Audio Title',
  fileName: 'test-audio.mp3',
  uploadedAt: 1704067200000, // 2024-01-01
  lastAccessedAt: 1704067200000,
  fileSize: 1024 * 1024 * 5, // 5MB
  duration: 180, // 3分钟
  mimeType: 'audio/mpeg',
  sampleRate: 44100,
  channels: 2,
  bitRate: 128000,
  blobId: 'blob-123',
  processingStatus: 'completed',
  scoreId: undefined,
}

describe('useAudioMetadata', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined)
  const mockOnSaveSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初始化', () => {
    it('应该使用初始数据正确初始化表单', () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      expect(result.current.formData.title).toBe(mockAudioSource.title)
      expect(result.current.mode).toBe('view')
      expect(result.current.errors).toEqual({})
    })

    it('应该在初始数据为 null 时使用空值初始化', () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: null,
          onSave: mockOnSave,
        })
      )

      expect(result.current.formData.title).toBe('')
      expect(result.current.mode).toBe('view')
    })
  })

  describe('编辑模式', () => {
    it('应该可以切换到编辑模式', () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      act(() => {
        result.current.setMode('edit')
      })

      expect(result.current.mode).toBe('edit')
    })

    it('应该可以切换回查看模式', () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      act(() => {
        result.current.setMode('edit')
        result.current.setMode('view')
      })

      expect(result.current.mode).toBe('view')
    })
  })

  describe('表单更新', () => {
    it('应该可以更新标题字段', () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      const newTitle = 'New Audio Title'

      act(() => {
        result.current.updateField('title', newTitle)
      })

      expect(result.current.formData.title).toBe(newTitle)
    })

    it('更新字段时应该清除对应字段的错误', async () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      // 先设置一个错误
      act(() => {
        result.current.updateField('title', '')
      })

      act(() => {
        result.current.validate()
      })

      // 等待状态更新
      await waitFor(() => {
        expect(result.current.errors.title).toBeDefined()
      })

      // 更新字段应该清除错误
      act(() => {
        result.current.updateField('title', 'Valid Title')
      })

      await waitFor(() => {
        expect(result.current.errors.title).toBeUndefined()
      })
    })
  })

  describe('表单验证', () => {
    it('空标题应该验证失败', async () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      act(() => {
        result.current.updateField('title', '')
      })

      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      await waitFor(() => {
        expect(result.current.errors.title).toBe('标题不能为空')
      })

      expect(isValid).toBe(false)
    })

    it('超过 200 字符的标题应该验证失败', async () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      const longTitle = 'a'.repeat(201)

      act(() => {
        result.current.updateField('title', longTitle)
      })

      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      await waitFor(() => {
        expect(result.current.errors.title).toBe('标题长度不能超过 200 个字符')
      })

      expect(isValid).toBe(false)
    })

    it('有效的标题应该验证通过', () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      act(() => {
        result.current.updateField('title', 'Valid Title')
      })

      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(true)
      expect(result.current.errors.title).toBeUndefined()
    })
  })

  describe('表单提交', () => {
    it('验证失败时不应该调用 onSave', async () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: { ...mockAudioSource, title: '' },
          onSave: mockOnSave,
        })
      )

      act(() => {
        result.current.updateField('title', '')
      })

      let submitResult: boolean | undefined

      await act(async () => {
        submitResult = await result.current.submit()
      })

      expect(submitResult).toBe(false)
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('验证通过时应该调用 onSave 并切换到查看模式', async () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
          onSaveSuccess: mockOnSaveSuccess,
        })
      )

      const newTitle = 'Updated Title'

      act(() => {
        result.current.updateField('title', newTitle)
        result.current.setMode('edit')
      })

      let submitResult: boolean | undefined

      await act(async () => {
        submitResult = await result.current.submit()
      })

      expect(submitResult).toBe(true)
      expect(mockOnSave).toHaveBeenCalledWith({ title: newTitle })
      expect(result.current.mode).toBe('view')
      expect(mockOnSaveSuccess).toHaveBeenCalled()
    })

    it('保存失败时应该显示错误信息', async () => {
      const saveError = new Error('Save failed')
      mockOnSave.mockRejectedValueOnce(saveError)

      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      act(() => {
        result.current.updateField('title', 'New Title')
      })

      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.errors.title).toBe('保存失败，请重试')
      expect(result.current.mode).toBe('edit') // 保持在编辑模式
    })
  })

  describe('重置功能', () => {
    it('重置应该恢复到初始状态', () => {
      const { result } = renderHook(() =>
        useAudioMetadata({
          initialData: mockAudioSource,
          onSave: mockOnSave,
        })
      )

      // 修改一些状态
      act(() => {
        result.current.updateField('title', 'Changed Title')
        result.current.setMode('edit')
        result.current.validate()
      })

      // 重置
      act(() => {
        result.current.reset()
      })

      // 验证恢复到初始状态
      expect(result.current.formData.title).toBe(mockAudioSource.title)
      expect(result.current.mode).toBe('view')
      expect(result.current.errors).toEqual({})
    })
  })
})
