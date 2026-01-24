import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPanel } from '@/components/SettingsPanel'

describe('SettingsPanel', () => {
  it('renders preset and custom sections', () => {
    render(<SettingsPanel />)
    expect(screen.getByRole('heading', { name: '选择预设' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '自定义调音' })).toBeInTheDocument()
  })

  it('disables create when inputs invalid', async () => {
    const user = userEvent.setup()
    render(<SettingsPanel />)
    const createBtn = screen.getByRole('button', { name: '创建自定义配置' })
    const keyCountInput = screen.getByLabelText('琴键数量')
    await user.clear(keyCountInput)
    await user.type(keyCountInput, '5')
    expect(createBtn).toBeDisabled()
  })
})
