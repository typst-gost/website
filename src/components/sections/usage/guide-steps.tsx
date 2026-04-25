import { ExternalLink, Download } from "lucide-react"
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
      {steps.map((step, index) => {
        const isDownload = !!step.download
        const actionUrl = isDownload 
          ? (step.download?.startsWith('http') ? step.download : `/downloads/${step.download}`) 
          : step.href

        return (
          <div
            key={step.title}
            className={cn(
              "relative flex rounded-2xl transition-all duration-300 border overflow-hidden",
              activeIndex === index
                ? "bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5"
                : "bg-gray-800/20 border-transparent hover:bg-gray-800/50 hover:border-gray-700/50"
            )}
          >
            <button
              onClick={() => onChange(index)}
              className="flex-1 text-left p-5 md:p-6 group outline-none"
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "shrink-0 p-2.5 rounded-xl transition-colors",
                  activeIndex === index ? "bg-blue-500/20" : "bg-gray-800 group-hover:bg-gray-700",
                  step.color
                )}>
                  {step.icon}
                </div>
                <div className="w-full">
                  <h4 className={cn(
                    "text-lg font-bold transition-colors",
                    activeIndex === index ? "text-white" : "text-gray-300 group-hover:text-white"
                  )}>
                    {step.title}
                  </h4>
                  <div className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    activeIndex === index 
                      ? "grid-rows-[1fr] opacity-100 mt-2" 
                      : "grid-rows-[0fr] opacity-0 md:grid-rows-[1fr] md:opacity-100 md:mt-2"
                  )}>
                    <div className="overflow-hidden">
                      <p className="text-sm text-gray-400 leading-relaxed text-pretty">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            {actionUrl && (
              <div className="flex items-center pr-4 pl-2 border-l border-gray-700/30 my-6">
                <div className="relative group/link">
                  <a
                    href={actionUrl}
                    download={isDownload ? step.download : undefined}
                    target={isDownload ? undefined : "_blank"}
                    rel={isDownload ? undefined : "noopener noreferrer"}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl bg-gray-800/50 transition-all border border-gray-700/50",
                      isDownload 
                        ? "hover:bg-green-500/20 text-gray-400 hover:text-green-400 hover:border-green-500/30"
                        : "hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 hover:border-blue-500/30"
                    )}
                  >
                    {isDownload ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                  </a>
                  
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-[10px] text-white rounded opacity-0 group-hover/link:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-700 shadow-xl z-20">
                    {isDownload ? "Скачать архив" : "Открыть"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}