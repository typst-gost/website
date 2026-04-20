"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Check, X, Code, Zap, Link, Clock, Feather, Package, Cpu, FileText } from "lucide-react"
import { FeatureCard } from "@/components/ui/feature-card"

export interface ComparisonPoint {
  icon: React.ReactNode
  title: string
  description: string
  modernAdvantage: string
  competitorIssue?: string
}

interface ComparisonCardProps {
  point: ComparisonPoint
  index: number
  isVisible: boolean
}

export function ComparisonCard({ point, index, isVisible }: ComparisonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="comparison-card-wrapper h-full"
    >
      <FeatureCard
        title={point.title}
        description={point.description}
        icon={point.icon}
        hoverEffect={true}
        className="h-full min-h-60 sm:min-h-60 lg:min-h-85"
        contentClassName="p-4 sm:p-5 lg:p-6"
        titleClassName="text-base sm:text-lg text-gray-200"
        descriptionClassName="text-xs sm:text-sm"
      >
        <div className="pt-3 sm:pt-4 mt-1 border-t border-gray-600/50 flex flex-col gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 min-h-6 sm:min-h-7">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
            </div>
            <span className="text-xs sm:text-sm text-blue-500/90 font-medium leading-tight">
              {point.modernAdvantage}
            </span>
          </div>

          <div className="flex items-center gap-2 min-h-6 sm:min-h-7">
            {point.competitorIssue ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500" />
                </div>
                <span className="text-xs sm:text-sm text-gray-400 leading-tight">
                  {point.competitorIssue}
                </span>
              </>
            ) : (
              <div className="h-4 sm:h-5" />
            )}
          </div>
        </div>
      </FeatureCard>
    </motion.div>
  )
}

export const comparisonIcons = {
  code: <Code className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
  zap: <Zap className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
  link: <Link className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
  clock: <Clock className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
  feather: <Feather className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
  package: <Package className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
  cpu: <Cpu className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
  file: <FileText className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" />,
}