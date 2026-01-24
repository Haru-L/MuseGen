import { describe, it, expect } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { KalimbaPreview } from '@/components/SettingsPanel/KalimbaPreview'
import { PreviewModeToggle } from '@/components/SettingsPanel/PreviewModeToggle'
import type { PreviewMode } from '@/utils/previewNotation'
import type { TineConfig } from '@/types/kalimba.types'

function PreviewHarness({ tuning }: { tuning: TineConfig[] }) {
  const [mode, setMode] = useState<PreviewMode>('C')
  return (
    <div>
      <PreviewModeToggle value={mode} onChange={setMode} />
      <KalimbaPreview tuning={tuning} mode={mode} />
    </div>
  )
}

describe('KalimbaPreview', () => {
  it('switches preview text between C and 1', async () => {
    const user = userEvent.setup()
    const tuning: TineConfig[] = [
      { tineNumber: 1, noteName: 'C4', midiNote: 60, frequency: 261.63 },
      { tineNumber: 2, noteName: 'D4', midiNote: 62, frequency: 293.66 }
    ]

    render(<PreviewHarness tuning={tuning} />)

    const cell1 = screen.getByTestId('kalimba-preview-cell-1')
    expect(within(cell1).getByTestId('kalimba-preview-label-1')).toHaveTextContent('C4')

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '1' }))
    })
    expect(within(cell1).getByTestId('kalimba-preview-label-1')).toHaveTextContent('1')
  })

  it('switches preview text between C and 哆', async () => {
    const user = userEvent.setup()
    const tuning: TineConfig[] = [
      { tineNumber: 1, noteName: 'F#4', midiNote: 66, frequency: 369.99 }
    ]

    render(<PreviewHarness tuning={tuning} />)

    const cell1 = screen.getByTestId('kalimba-preview-cell-1')
    expect(within(cell1).getByTestId('kalimba-preview-label-1')).toHaveTextContent('F#4')

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '哆' }))
    })
    expect(within(cell1).getByTestId('kalimba-preview-label-1')).toHaveTextContent('发♯')
  })
})
