import { useMemo, useRef, useState } from 'react'
import type { TineConfig } from '@/types/kalimba.types'
import { formatPitchDiagramLabel, type PreviewMode } from '@/utils/previewNotation'
import { sortTuningPhysicalLeftToRight } from '@/utils/kalimbaLayout'
import { auditionMidiNote } from '@/utils/noteAudition'

interface KalimbaPreviewProps {
  tuning: TineConfig[]
  mode: PreviewMode
}

export function KalimbaPreview({ tuning, mode }: KalimbaPreviewProps) {
  const ordered = useMemo(() => sortTuningPhysicalLeftToRight(tuning), [tuning])
  const minMidi = Math.min(...ordered.map(t => t.midiNote))
  const maxMidi = Math.max(...ordered.map(t => t.midiNote))
  const midiRange = Math.max(1, maxMidi - minMidi)

  const [pressedTineNumber, setPressedTineNumber] = useState<number | null>(null)
  const pressTimerRef = useRef<number | null>(null)

  const keyCount = ordered.length
  const paddingX = 28
  const gap = 3.5
  const slotWidth = 44
  const tineScale = 0.8
  const barWidth = slotWidth * tineScale
  const viewBoxWidth = paddingX * 2 + keyCount * slotWidth + Math.max(0, keyCount - 1) * gap
  const viewBoxHeight = 520
  const topY = 70
  const bottomPadding = 90
  const maxLen = viewBoxHeight - topY - bottomPadding
  const minLen = Math.round(maxLen * 0.62)

  const play = (t: TineConfig) => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
    }
    setPressedTineNumber(t.tineNumber)
    pressTimerRef.current = window.setTimeout(() => setPressedTineNumber(null), 140)
    void auditionMidiNote(t.midiNote)
  }

  const centerIndex = Math.floor((keyCount - 1) / 2)
  const isAccentFromIndex = (index: number) => {
    const distance = Math.abs(index - centerIndex)
    return distance % 3 === 0
  }

  return (
    <div className="w-full overflow-x-auto" data-testid="kalimba-preview">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="min-w-max w-full"
        style={{ minWidth: viewBoxWidth }}
        role="img"
        aria-label="卡林巴琴音阶示意图"
      >
        <defs>
          <filter id="kalimba-tine-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.12" />
          </filter>
          <filter id="kalimba-tine-pressed" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.18" />
          </filter>
          <linearGradient id="kalimba-white" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f9fafb" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        <text
          x={viewBoxWidth / 2}
          y={38}
          textAnchor="middle"
          fontSize="22"
          fill="#6b7280"
          fontWeight="600"
        >
          {keyCount}音卡林巴音阶示意图
        </text>

        <g role="list" aria-label="卡林巴琴键位">
          {ordered.map((t, i) => {
            const { label, isValid, dotsAbove, dotsBelow } = formatPitchDiagramLabel(t.noteName, mode)
            const ratio = (maxMidi - t.midiNote) / midiRange
            const baseLen = minLen + ratio * (maxLen - minLen)
            const tineLen = baseLen * tineScale
            const x = paddingX + i * (slotWidth + gap) + (slotWidth - barWidth) / 2
            const y = topY
            const isPressed = pressedTineNumber === t.tineNumber
            const isAccent = isAccentFromIndex(i)
            const fill = isAccent ? '#FBCFE8' : 'url(#kalimba-white)'
            const stroke = isValid ? '#374151' : '#ef4444'

            const showNoteBelow = mode !== 'C'
            const numberY = y + tineLen - 36
            const dotStartY = numberY - 28

            return (
              <g
                key={t.tineNumber}
                data-testid={`kalimba-preview-cell-${t.tineNumber}`}
                role="button"
                tabIndex={0}
                aria-label={`试听 ${t.noteName}`}
                onClick={() => play(t)}
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    play(t)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={tineLen}
                  rx={barWidth / 2}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isPressed ? 2.5 : 2}
                  filter={isPressed ? 'url(#kalimba-tine-pressed)' : 'url(#kalimba-tine-shadow)'}
                />

                {dotsAbove > 0 && (
                  <g aria-hidden="true">
                    {Array.from({ length: dotsAbove }).map((_, idx) => (
                      <circle
                        key={idx}
                        cx={x + barWidth / 2}
                        cy={dotStartY - idx * 12}
                        r={3}
                        fill={stroke}
                      />
                    ))}
                  </g>
                )}

                {dotsBelow > 0 && (
                  <g aria-hidden="true">
                    {Array.from({ length: dotsBelow }).map((_, idx) => (
                      <circle
                        key={idx}
                        cx={x + barWidth / 2}
                        cy={numberY + 12 + idx * 12}
                        r={3}
                        fill={stroke}
                      />
                    ))}
                  </g>
                )}

                <text
                  data-testid={`kalimba-preview-label-${t.tineNumber}`}
                  x={x + barWidth / 2}
                  y={numberY}
                  textAnchor="middle"
                  fontSize={mode === 'C' ? 16 : 22}
                  fontWeight="700"
                  fill={isAccent ? '#111827' : '#111827'}
                  style={{ userSelect: 'none' }}
                >
                  {label}
                </text>

                {showNoteBelow && (
                  <text
                    x={x + barWidth / 2}
                    y={y + tineLen + 26}
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="600"
                    fill={isValid ? '#4b5563' : '#ef4444'}
                    style={{ userSelect: 'none' }}
                  >
                    {isValid ? t.noteName : '音名无效'}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
