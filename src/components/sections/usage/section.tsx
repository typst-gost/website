"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heading } from "@/components/ui/heading"
import { ToolType, guides } from "./data"
import { ComparisonTable } from "./comparison-table"
import { ToolSwitcher } from "./tool-switcher"
import { GuideSteps } from "./guide-steps"
import { ScreenshotWindow } from "./screenshot-window"

const toolHeaders = {
  tinymist: {
    title: "Локальная работа в VS Code",
    description: "Использование расширения Tinymist даёт максимальный контроль над проектом. Ниже показан пример работы с демо-шаблоном."
  },
  typst: {
    title: "Работа в браузере (Web App)",
    description: "Официальный облачный редактор не требует настройки окружения. Идеально для тех, кто хочет начать писать текст мгновенно."
  }
}

export default function UsageSection() {
  const [activeTool, setActiveTool] = useState<ToolType>("tinymist")
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  const currentSteps = guides[activeTool]

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool)
    setActiveStepIndex(0)
  }

  return (
    <section className="relative py-12 md:py-20 px-4 overflow-hidden">
      <div className="container relative mx-auto max-w-7xl">
        <Heading
          title="Как использовать?"
          description="Выберите подходящий инструмент и начните работу над документом всего за пару минут."
          centered
        />

        <ComparisonTable />

        <div className="mt-20 md:mt-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                {toolHeaders[activeTool].title}
              </h3>
              <p className="text-lg text-gray-400 max-w-3xl leading-relaxed">
                {toolHeaders[activeTool].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <ToolSwitcher 
            activeTool={activeTool} 
            onChange={handleToolChange} 
          />

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-stretch">
            <GuideSteps 
              steps={currentSteps} 
              activeIndex={activeStepIndex} 
              onChange={setActiveStepIndex} 
            />
            <ScreenshotWindow 
              activeTool={activeTool}
              activeIndex={activeStepIndex}
              stepTitle={currentSteps[activeStepIndex].title}
            />
          </div>
        </div>
      </div>
    </section>
  )
}