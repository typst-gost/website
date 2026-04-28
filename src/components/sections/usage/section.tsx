"use client"

import { useState } from "react"
import { Heading } from "@/components/ui/heading"
import { ToolType, guides } from "./data"
import { ComparisonTable } from "./comparison-table"
import { ToolSwitcher } from "./tool-switcher"
import { GuideSteps } from "./guide-steps"
import { ScreenshotWindow } from "./screenshot-window"
import { Section } from "@/components/ui/section"

export default function UsageSection() {
  const[activeTool, setActiveTool] = useState<ToolType>("typst")
  const[activeStepIndex, setActiveStepIndex] = useState(0)

  const currentSteps = guides[activeTool]

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool)
    setActiveStepIndex(0)
  }

  return (
    <Section id="usage">
      <div className="container relative mx-auto max-w-7xl">
        <Heading
          title="Как использовать?"
          description="Выберите подходящий инструмент и начните работу над документом всего за пару минут."
          centered
        />

        <ComparisonTable />

        <ToolSwitcher 
          activeTool={activeTool} 
          onChange={handleToolChange} 
        />

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
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
    </Section>
  )
}