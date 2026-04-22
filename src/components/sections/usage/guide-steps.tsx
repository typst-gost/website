import { cn } from "@/lib/utils"
import { GuideStep } from "./data"

interface GuideStepsProps {
  steps: GuideStep[]
  activeIndex: number
  onChange: (index: number) => void
}

export function GuideSteps({ steps, activeIndex, onChange }: GuideStepsProps) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <button
          key={step.title}
          onClick={() => onChange(index)}
          className={cn(
            "flex-1 text-left p-5 md:p-6 rounded-2xl transition-all duration-300 border group",
            activeIndex === index
              ? "bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5"
              : "bg-gray-800/20 border-transparent hover:bg-gray-800/50 hover:border-gray-700/50"
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              "shrink-0 p-2.5 rounded-xl transition-colors",
              activeIndex === index ? "bg-blue-500/20" : "bg-gray-800 group-hover:bg-gray-700",
              step.color
            )}>
              {step.icon}
            </div>
            <div>
              <h4 className={cn(
                "text-lg font-bold mb-2 transition-colors",
                activeIndex === index ? "text-white" : "text-gray-300 group-hover:text-white"
              )}>
                {step.title}
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed text-pretty">
                {step.description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}