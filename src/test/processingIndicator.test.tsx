import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProcessingIndicator } from '@/components/ProcessingIndicator'

describe('ProcessingIndicator', () => {
  it('renders progress message and percent', () => {
    render(
      <ProcessingIndicator
        status="running"
        progress={{
          taskId: 't1',
          phase: 'upload',
          percent: 42,
          message: '正在解析音频…',
          updatedAt: Date.now()
        }}
        onCancel={() => {}}
      />
    )

    expect(screen.getByText('正在解析音频…')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(
      <ProcessingIndicator
        status="running"
        progress={{
          taskId: 't1',
          phase: 'upload',
          percent: 1,
          message: 'm',
          updatedAt: Date.now()
        }}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '取消处理' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders error message', () => {
    render(
      <ProcessingIndicator
        status="failed"
        progress={{
          taskId: 't1',
          phase: 'upload',
          percent: 10,
          message: 'm',
          updatedAt: Date.now()
        }}
        error={{
          code: 'DECODE_FAILED',
          userMessage: '解析失败',
          recoverable: true
        }}
        onCancel={() => {}}
        onRetry={() => {}}
      />
    )

    expect(screen.getByText('解析失败')).toBeInTheDocument()
  })
})

