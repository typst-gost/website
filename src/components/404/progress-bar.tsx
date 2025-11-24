"use client"

import { useMemo } from "react"

interface ConstructionProgressBarProps {
  startDate?: Date
  endDate?: Date
}

export function ConstructionProgressBar({
  startDate = new Date(2025, 9, 27),
  endDate = new Date(2025, 11, 10),
}: ConstructionProgressBarProps) {
  const progress = useMemo(() => {
    const now = new Date()
    const total = endDate.getTime() - startDate.getTime()
    const elapsed = Math.max(0, Math.min(now.getTime() - startDate.getTime(), total))
    const percentage = Math.round((elapsed / total) * 100)
    return Math.min(percentage, 100)
  }, [startDate, endDate])

  return (
    <div className="w-full max-w-xl mx-auto px-6">
      <div className="mb-3 md:mb-4 flex justify-between items-center">
        <span className="text-xs md:text-sm font-medium text-slate-400">Ход работ</span>
        <span className="text-xl md:text-2xl font-bold bg-linear-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          {progress}%
        </span>
      </div>
      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
        <div
          className="progress-bar h-full bg-linear-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
