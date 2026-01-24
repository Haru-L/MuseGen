export function ProgressBar({ value }: { value?: number }) {
  const v = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div className="h-2 w-full rounded-full bg-gray-200">
      <div
        className="h-2 rounded-full bg-primary-500 transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
