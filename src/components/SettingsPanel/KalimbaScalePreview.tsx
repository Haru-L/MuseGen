import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TineConfig } from '@/types/kalimba.types'
import { sortTuningPhysicalLeftToRight } from '@/utils/kalimbaLayout'

interface KalimbaScalePreviewProps {
  tuning: TineConfig[]
  className?: string
}

interface KalimbaSVGProps {
  tuning: TineConfig[]
  width: number
  height: number
  showLabels?: boolean
  onClick?: () => void
}

function KalimbaSVG({ tuning, width, height, showLabels = true, onClick }: KalimbaSVGProps) {
  const sortedTines = useMemo(() => sortTuningPhysicalLeftToRight(tuning), [tuning])
  
  // Calculate dimensions
  const numKeys = sortedTines.length
  const padding = 20
  const availableWidth = width - (padding * 2)
  const keyWidth = availableWidth / numKeys
  const keySpacing = keyWidth * 0.1 // 10% spacing
  const actualKeyWidth = keyWidth - keySpacing
  
  // Calculate lengths
  // Find min and max MIDI to normalize lengths
  const midis = tuning.map(t => t.midiNote)
  const minMidi = Math.min(...midis)
  const maxMidi = Math.max(...midis)
  const midiRange = maxMidi - minMidi || 1 // avoid div by 0
  
  // Length config
  const bridgeY = 40
  const maxLen = height - bridgeY - 40 // Leave space for labels at bottom
  const minLen = maxLen * 0.6 // Shortest key is 60% of longest
  
  const getLength = (midi: number) => {
    // Lower midi (lower pitch) -> Longer key
    // Normalized 0 (lowest) to 1 (highest)
    const normalized = (midi - minMidi) / midiRange
    // Invert: 0 -> maxLen, 1 -> minLen
    return maxLen - (normalized * (maxLen - minLen))
  }

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible select-none"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Background / Resonance Box hint */}
      {/* <rect x="0" y="0" width={width} height={height} fill="#f9fafb" rx="8" /> */}
      
      {/* Bridge */}
      <rect 
        x={padding} 
        y={bridgeY - 10} 
        width={width - padding * 2} 
        height={10} 
        fill="#78350f" 
        rx="2"
      />
      <rect 
        x={padding} 
        y={bridgeY - 25} 
        width={width - padding * 2} 
        height={15} 
        fill="#92400e" 
        rx="2"
      />

      {/* Keys */}
      {sortedTines.map((tine, i) => {
        const x = padding + (i * keyWidth) + (keySpacing / 2)
        const length = getLength(tine.midiNote)
        
        return (
          <g key={tine.tineNumber} className="transition-opacity hover:opacity-90">
            {/* Tine Body */}
            <rect
              x={x}
              y={bridgeY}
              width={actualKeyWidth}
              height={length}
              fill="url(#tineGradient)"
              stroke="#9ca3af"
              strokeWidth="1"
              rx={actualKeyWidth / 2}
              ry={actualKeyWidth / 6}
            />
            
            {/* Note Label */}
            {showLabels && (
              <text
                x={x + actualKeyWidth / 2}
                y={bridgeY + length - 10}
                textAnchor="middle"
                className="text-xs font-bold pointer-events-none select-none"
                fill="#374151"
                fontSize={Math.max(10, Math.min(16, actualKeyWidth * 0.6))}
                fontWeight="bold"
              >
                {tine.noteName}
              </text>
            )}
            
            {/* Tine Number (Optional) */}
            {/* <text
              x={x + actualKeyWidth / 2}
              y={bridgeY + 15}
              textAnchor="middle"
              className="text-[10px] text-gray-400 pointer-events-none select-none"
              fill="#9ca3af"
              fontSize={10}
            >
              {tine.tineNumber}
            </text> */}
          </g>
        )
      })}
      
      {/* Gradients */}
      <defs>
        <linearGradient id="tineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#d1d5db" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function KalimbaScalePreview({ tuning, className = '' }: KalimbaScalePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div 
        className={`relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${className}`}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="查看卡林巴琴键位大图"
      >
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-full p-1.5 shadow-sm z-10">
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </div>
        <div className="aspect-[2/1] w-full p-4">
          <KalimbaSVG tuning={tuning} width={800} height={400} onClick={() => setIsOpen(true)} />
        </div>
        <div className="absolute bottom-2 right-0 left-0 text-center text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          点击查看大图
        </div>
      </div>

      <AnimatePresence>
        {isOpen && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">卡林巴琴键位分布图</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-8 flex-1 min-h-0 overflow-auto flex items-center justify-center bg-gray-50/50">
                <div className="aspect-[2/1] w-full max-w-4xl">
                  <KalimbaSVG tuning={tuning} width={1200} height={600} />
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </>
  )
}
