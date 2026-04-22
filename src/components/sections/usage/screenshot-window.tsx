"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Image as ImageIcon } from "lucide-react"
import { ToolType } from "./data"

interface ScreenshotWindowProps {
  activeTool: ToolType
  activeIndex: number
  stepTitle: string
}

export function ScreenshotWindow({ activeTool, activeIndex, stepTitle }: ScreenshotWindowProps) {
  return (
    <div className="w-full flex flex-col min-h-[400px] lg:min-h-0 bg-gray-900/80 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden backdrop-blur-xs relative">
      <div className="h-10 shrink-0 bg-gray-800/80 border-b border-gray-700/50 flex items-center px-4 z-20">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
      </div>

      <div className="flex-1 relative bg-gray-900/40 p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTool}-${activeIndex}`}
            initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-4 md:inset-8 bg-gray-800/80 rounded-xl border border-gray-700/50 overflow-hidden shadow-inner flex items-center justify-center"
          >
            <div className="flex flex-col items-center justify-center text-gray-600 gap-4 p-8 text-center h-full">
              <ImageIcon className="w-16 h-16 opacity-50 mb-2" />
              <p className="text-lg font-medium text-gray-300">
                Скриншот: <span className="text-blue-400">{stepTitle}</span>
              </p>
              <div className="inline-flex rounded-lg bg-gray-900/80 px-3 py-1 font-mono text-xs text-gray-400 border border-gray-700/50">
                /screenshots/{activeTool}-step-{activeIndex + 1}.png
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}