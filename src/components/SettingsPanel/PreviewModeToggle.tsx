import clsx from 'clsx'
import type { PreviewMode } from '@/utils/previewNotation'

interface PreviewModeToggleProps {
  value: PreviewMode
  onChange: (value: PreviewMode) => void
}

export function PreviewModeToggle({ value, onChange }: PreviewModeToggleProps) {
  const buttonClass = (active: boolean) => {
    return clsx(
      'inline-flex items-center justify-center px-3 py-2 rounded-full text-sm font-medium transition-all ring-1',
      active
        ? 'bg-primary-100 text-primary-700 ring-primary-300'
        : 'bg-white/70 text-gray-700 ring-gray-200 hover:bg-white'
    )
  }

  return (
    <div className="inline-flex gap-2" role="group" aria-label="预览显示模式">
      <button type="button" className={buttonClass(value === '1')} onClick={() => onChange('1')}>
        1
      </button>
      <button type="button" className={buttonClass(value === 'C')} onClick={() => onChange('C')}>
        C
      </button>
      <button type="button" className={buttonClass(value === '哆')} onClick={() => onChange('哆')}>
        哆
      </button>
    </div>
  )
}

