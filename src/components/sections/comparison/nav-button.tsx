"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface NavigationButtonProps {
  direction: "left" | "right"
  onClick: () => void
  disabled: boolean
  stopAnimation?: boolean
}

export function NavigationButton({ 
  direction, 
  onClick, 
  disabled,
  stopAnimation = false 
}: NavigationButtonProps) {
  const [shouldPulse, setShouldPulse] = useState(false)

  useEffect(() => {
    if (stopAnimation) {
      setShouldPulse(false)
      return
    }

    if (direction === "right" && !disabled) {
      const timer = setTimeout(() => {
        setShouldPulse(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [direction, disabled, stopAnimation])

  const handleClick = () => {
    if (!disabled) {
      onClick()
    }
  }

  const Icon = direction === "left" ? ChevronLeft : ChevronRight

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm border ${
        disabled
          ? "bg-gray-800/20 text-gray-600/50 border-gray-600/50 cursor-not-allowed"
          : "border border-border border-gray-600/50 hover:border-blue-500/50 bg-gray-800/80 text-white hover:text-blue-500"
      } ${shouldPulse ? "animate-pulse-subtle" : ""}`}
    >
      <Icon className="w-6 h-6" />
    </button>
  )
}
