import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface CollapsiblePanelProps {
  title: string
  description?: string
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}

export function CollapsiblePanel({
  title,
  description,
  defaultOpen = false,
  className = '',
  children
}: CollapsiblePanelProps) {
  const reactId = useId()
  const contentId = `collapsible-panel-${reactId}`
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`card p-0 overflow-hidden ${className}`}>
      <button
        type="button"
        className="w-full text-left px-6 py-4 flex items-start justify-between gap-4 hover:bg-white/40 active:bg-white/50 transition-colors focus:outline-none"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(v => !v)}
      >
        <div>
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          {description && (
            <div className="text-sm text-gray-600 mt-1">{description}</div>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className=""
          >
            <div className="px-6 py-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
