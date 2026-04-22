"use client"

import { motion } from "framer-motion"
import { Laptop, Cloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { ToolType } from "./data"

interface ToolSwitcherProps {
  activeTool: ToolType
  onChange: (tool: ToolType) => void
}

export function ToolSwitcher({ activeTool, onChange }: ToolSwitcherProps) {
  return (
    <div className="w-full mt-8 mb-10">
      <div className="relative flex w-full p-1.5 bg-gray-900/60 border border-gray-700/50 rounded-2xl backdrop-blur-xl shadow-2xl">
        <motion.div
          className="absolute inset-y-1.5 w-[calc(50%-6px)] bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,232,0.3)]"
          initial={false}
          animate={{
            x: activeTool === "tinymist" ? "0%" : "100%",
            left: activeTool === "tinymist" ? "6px" : "0px",
          }}
          transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
        />
        
        <button
          onClick={() => onChange("tinymist")}
          className={cn(
            "relative z-10 flex-1 py-4 rounded-xl text-sm sm:text-base font-bold transition-colors flex items-center justify-center gap-3",
            activeTool === "tinymist" ? "text-white" : "text-gray-400 hover:text-gray-200"
          )}
        >
          <Laptop className="w-5 h-5" />
          <span className="tracking-tight">VS Code + Tinymist</span>
        </button>
        
        <button
          onClick={() => onChange("typst")}
          className={cn(
            "relative z-10 flex-1 py-4 rounded-xl text-sm sm:text-base font-bold transition-colors flex items-center justify-center gap-3",
            activeTool === "typst" ? "text-white" : "text-gray-400 hover:text-gray-200"
          )}
        >
          <Cloud className="w-5 h-5" />
          <span className="tracking-tight">Typst Web App</span>
        </button>
      </div>
    </div>
  )
}