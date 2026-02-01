/**
 * AudioMetadataEditor 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AudioMetadataEditor } from '@/components/AudioMetadata/AudioMetadataEditor'
import type { AudioSource } from '@/db/schema'

// Mock CollapsiblePanel
vi.mock('@/components/SettingsPanel/CollapsiblePanel', () => ({
  CollapsiblePanel: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="collapsible-panel" data-title={title}>
      {children}
    </div>
  ),
}))

// 测试数据
const mockAudioSource: AudioSource = {
  id: 'test-audio-123',
  title: 'Test Audio Title',
  fileName: 'test-audio.mp3',
  uploadedAt: 1704067200000,
  lastAccessedAt: 1704067200000,
  fileSize: 1024 * 1024 * 5,
  duration: 180,
  mimeType: 'audio/mpeg',
  sampleRate: 44100,
  channels: 2,
  bitRate: 128000,
  blobId: 'blob-123',
  processingStatus: 'completed',
  scoreId: undefined,
}

describe('AudioMetadataEditor', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined)
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该正确渲染音频信息', () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // 检查标题是否正确显示
      expect(screen.getByText(mockAudioSource.title)).toBeInTheDocument()

      // 检查文件名是否正确显示
      const panel = screen.getByTestId('collapsible-panel')
      expect(panel).toHaveAttribute('data-title', '音频信息')
    })

    it('应该在音频源为 null 时显示空状态', () => {
      render(
        <AudioMetadataEditor
          audioSource={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('暂无音频信息')).toBeInTheDocument()
    })

    it('应该正确渲染所有元数据字段', () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // 检查各个元数据字段是否存在
      expect(screen.getByText('时长')).toBeInTheDocument()
      expect(screen.getByText('采样率')).toBeInTheDocument()
      expect(screen.getByText('声道')).toBeInTheDocument()
      expect(screen.getByText('文件大小')).toBeInTheDocument()
      expect(screen.getByText('上传时间')).toBeInTheDocument()
    })
  })

  describe('编辑功能', () => {
    it('点击编辑按钮应该进入编辑模式', () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // 找到编辑按钮并点击
      const editButton = screen.getByTitle('编辑标题')
      fireEvent.click(editButton)

      // 检查是否进入了编辑模式（输入框应该存在）
      const input = screen.getByPlaceholderText('输入音频标题')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue(mockAudioSource.title)
    })

    it('编辑模式下可以修改标题', () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑标题')
      fireEvent.click(editButton)

      // 修改标题
      const input = screen.getByPlaceholderText('输入音频标题')
      const newTitle = 'New Title'
      fireEvent.change(input, { target: { value: newTitle } })

      // 验证输入框的值已经改变
      expect(input).toHaveValue(newTitle)
    })

    it('编辑模式下点击取消应该恢复到查看模式', () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑标题')
      fireEvent.click(editButton)

      // 点击取消
      const cancelButton = screen.getByTitle('取消')
      fireEvent.click(cancelButton)

      // 验证回到查看模式
      expect(screen.queryByPlaceholderText('输入音频标题')).not.toBeInTheDocument()
      expect(screen.getByText(mockAudioSource.title)).toBeInTheDocument()
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('保存功能', () => {
    it('保存成功应该调用 onSave 并切回查看模式', async () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑标题')
      fireEvent.click(editButton)

      // 修改标题
      const input = screen.getByPlaceholderText('输入音频标题')
      const newTitle = 'Updated Title'
      fireEvent.change(input, { target: { value: newTitle } })

      // 点击保存
      const saveButton = screen.getByTitle('保存')
      fireEvent.click(saveButton)

      // 等待异步操作完成
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ title: newTitle })
      })

      // 验证回到查看模式
      expect(screen.queryByPlaceholderText('输入音频标题')).not.toBeInTheDocument()
    })

    it('空标题不应该触发保存', async () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑标题')
      fireEvent.click(editButton)

      // 清空标题
      const input = screen.getByPlaceholderText('输入音频标题')
      fireEvent.change(input, { target: { value: '' } })

      // 点击保存
      const saveButton = screen.getByTitle('保存')
      fireEvent.click(saveButton)

      // 验证没有调用 onSave
      expect(mockOnSave).not.toHaveBeenCalled()

      // 验证显示错误信息
      expect(screen.getByText('标题不能为空')).toBeInTheDocument()
    })
  })

  describe('加载状态', () => {
    it('加载中应该禁用编辑按钮', () => {
      render(
        <AudioMetadataEditor
          audioSource={mockAudioSource}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      const editButton = screen.getByTitle('编辑标题')
      expect(editButton).toBeDisabled()
    })
  })
})
