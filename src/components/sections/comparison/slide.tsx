"use client"

import type React from "react"
import { motion } from "framer-motion"
import { ComparisonCard, type ComparisonPoint } from "./card"
import { Sparkles } from "lucide-react"

const MODERN_G7_32_URL = "http://typst.app/universe/package/modern-g7-32"

export interface ComparisonData {
  id: string
  competitor: string
  competitorUrl: string
  competitorIcon: React.ReactNode
  points: ComparisonPoint[]
  footnote?: string
}

interface ComparisonSlideProps {
  data: ComparisonData
  isActive: boolean
}

export function ComparisonSlide({ data, isActive }: ComparisonSlideProps) {
  return (
    <div className="min-w-full px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <a href={MODERN_G7_32_URL} target="_blank" rel="noopener noreferrer">
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="comparison-badge-modern flex items-center gap-2 px-4 py-2.5 rounded-full hover:border-blue-500/50 hover:bg-blue-500/20"
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-xs sm:text-sm font-semibold text-blue-500">
                  modern-g7-32
                </span>
              </motion.div>
            </a>

            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.5, delay: isActive ? 0.15 : 0 }}
              className="text-xl sm:text-2xl font-bold text-gray-400/50"
            >
              vs
            </motion.div>

            <a href={data.competitorUrl} target="_blank" rel="noopener noreferrer">
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
                transition={{ duration: 0.5 }}
                className={`comparison-badge-competitor flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-400 ${data.competitorUrl ? 'hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/10' : ''}`}
              >
                {data.competitorIcon}
                <span className="text-xs sm:text-sm font-medium">
                  {data.competitor}
                </span>
              </motion.div>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 items-start">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.points.map((point, idx) => (
              <ComparisonCard key={idx} point={point} index={idx} isVisible={isActive} />
            ))}
          </div>
        </div>

        {data.footnote && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center text-xs text-gray-400/60 mt-2 mb-6 max-w-2xl mx-auto italic"
          >
            {data.footnote}
          </motion.p>
        )}
      </div>
    </div>
  )
}
