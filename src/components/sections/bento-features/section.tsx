import React from "react"
import Link from "next/link"
import { Heading } from "@/components/ui/heading"
import CodeBlock from "@/components/sections/preview/code-viewer"
import { cn } from "@/lib/utils"
import { featuresData, FeatureColor } from "./data"

function DocumentMockup({ className, children }: { className?: string, children?: React.ReactNode }) {
  return (
    <div className={cn("absolute bg-slate-50 rounded-md shadow-2xl border border-gray-200/20 overflow-hidden flex flex-col pointer-events-none select-none", className)}>
      {children}
    </div>
  )
}

const colorStyles: Record<FeatureColor, { wrapper: string; iconBg: string }> = {
  blue: {
    wrapper: "hover:border-blue-500/30",
    iconBg: "bg-blue-500/10 text-blue-400",
  },
  purple: {
    wrapper: "hover:border-purple-500/30",
    iconBg: "bg-purple-500/10 text-purple-400",
  },
  emerald: {
    wrapper: "hover:border-emerald-500/30",
    iconBg: "bg-emerald-500/10 text-emerald-400",
  },
  amber: {
    wrapper: "hover:border-amber-500/30",
    iconBg: "bg-amber-500/10 text-amber-400",
  },
}

const Mockups: Record<string, React.FC> = {
  setup: () => (
    <DocumentMockup className="w-56 h-72 -right-8 top-1/4 rotate-6 opacity-90 transition-transform duration-500 group-hover:rotate-2 group-hover:-translate-y-2 hidden sm:flex">
      <div className="p-5 flex flex-col items-center gap-3 h-full opacity-60">
        <div className="w-full h-1.5 bg-gray-300 rounded-full" />
        <div className="w-4/5 h-1.5 bg-gray-300 rounded-full" />
        <div className="flex-1" />
        <div className="w-2/3 h-3 bg-blue-900/40 rounded-full mb-1" />
        <div className="w-5/6 h-2 bg-gray-400 rounded-full" />
        <div className="flex-1" />
        <div className="w-full flex justify-between items-end mt-auto">
          <div className="w-1/3 flex flex-col gap-1.5">
             <div className="w-full h-1 bg-gray-300 rounded-full" />
             <div className="w-4/5 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="w-1/4 flex flex-col gap-1.5 items-end">
             <div className="w-full h-1 bg-gray-300 rounded-full" />
          </div>
        </div>
      </div>
    </DocumentMockup>
  ),
  abstract: () => (
    <DocumentMockup className="w-48 h-40 -bottom-6 -right-6 -rotate-[4deg] transition-transform duration-500 group-hover:-rotate-[8deg] group-hover:-translate-x-2">
      <div className="p-4 flex flex-col gap-2 opacity-60">
        <div className="w-1/2 h-2 bg-gray-500 rounded-full mx-auto mb-2" />
        <div className="w-full h-1.5 bg-gray-400 rounded-full" />
        <div className="w-[90%] h-1.5 bg-gray-400 rounded-full" />
        <div className="w-full h-1.5 bg-gray-300 rounded-full mt-2" />
        <div className="w-[85%] h-1.5 bg-gray-300 rounded-full" />
      </div>
    </DocumentMockup>
  ),
  outline: () => (
    <DocumentMockup className="w-52 h-36 -bottom-8 -right-4 rotate-3 transition-transform duration-500 group-hover:-translate-y-2.5">
      <div className="p-5 flex flex-col gap-3 opacity-60">
        <div className="w-1/3 h-2 bg-gray-500 rounded-full mx-auto mb-1" />
        <div className="w-full flex justify-between items-center">
           <div className="w-1/4 h-1.5 bg-gray-400 rounded-full" />
           <div className="flex-1 border-b-2 border-dotted border-gray-300 mx-2" />
           <div className="w-4 h-1.5 bg-gray-400 rounded-full" />
        </div>
        <div className="w-full flex justify-between items-center">
           <div className="w-1/3 h-1.5 bg-gray-400 rounded-full" />
           <div className="flex-1 border-b-2 border-dotted border-gray-300 mx-2" />
           <div className="w-4 h-1.5 bg-gray-400 rounded-full" />
        </div>
        <div className="w-full flex justify-between items-center pl-4">
           <div className="w-1/3 h-1.5 bg-gray-300 rounded-full" />
           <div className="flex-1 border-b-2 border-dotted border-gray-200 mx-2" />
           <div className="w-4 h-1.5 bg-gray-300 rounded-full" />
        </div>
      </div>
    </DocumentMockup>
  ),
  appendixes: () => (
    <DocumentMockup className="w-64 h-64 -right-12 top-1/4 -rotate-[5deg] opacity-90 transition-transform duration-500 group-hover:-rotate-1 group-hover:-translate-x-4 hidden sm:flex">
      <div className="p-5 flex flex-col gap-3 h-full opacity-60">
        <div className="w-2/5 h-2 bg-gray-500 rounded-full mx-auto" />
        <div className="w-1/3 h-2 bg-gray-400 rounded-full mx-auto mb-2" />
        <div className="w-full h-24 bg-gray-200/50 border border-gray-300/50 rounded-md p-2 flex flex-col gap-1.5">
           <div className="w-1/2 h-1.5 bg-gray-400 rounded-full" />
           <div className="w-2/3 h-1.5 bg-gray-400 rounded-full" />
           <div className="w-1/3 h-1.5 bg-gray-400 rounded-full" />
        </div>
        <div className="w-1/2 h-2 bg-gray-400 rounded-full mx-auto mt-1" />
      </div>
    </DocumentMockup>
  ),
}

export default async function BentoFeaturesSection() {
  return (
    <section className="py-16 px-4 overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        <Heading
          title="Простота использования"
          highlight="из коробки"
          description="Вам не нужно изучать сложные макросы или настраивать стили вручную. Шаблон берет на себя всю рутину по оформлению ГОСТ 7.32-2017."
          centered
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {featuresData.map((feature) => {
            const Mockup = Mockups[feature.id]
            const colors = colorStyles[feature.color]

            const CardContent = (
              <>
                <div className="flex items-start gap-4 mb-6 relative z-20">
                  <div className={cn("p-3 rounded-xl", colors.iconBg)}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm max-w-md">{feature.description}</p>
                  </div>
                </div>

                <div className={cn("relative z-20", feature.codeWrapperClassName)}>
                  <CodeBlock codeType="typst" codeContent={feature.code} isScrollable={false} showControls={false} />
                </div>

                {Mockup && <Mockup />}
              </>
            )

            const cardClasses = cn(
              "block group relative overflow-hidden rounded-2xl bg-gray-800/40 border border-gray-700/50 p-6 sm:p-8 backdrop-blur-sm transition-colors hover:bg-gray-800/60",
              colors.wrapper,
              feature.colSpan === 2 ? "md:col-span-2" : "md:col-span-1"
            )

            return feature.href ? (
              <Link href={feature.href} key={feature.id} className={cardClasses}>
                {CardContent}
              </Link>
            ) : (
              <div key={feature.id} className={cardClasses}>
                {CardContent}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}