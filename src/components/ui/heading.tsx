import * as React from "react"
import { cn } from "@/lib/utils"

interface HeadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  title: React.ReactNode
  highlight?: string
  description?: string
  centered?: boolean
}

const Heading = React.forwardRef<HTMLDivElement, HeadingProps>(
  ({ className, as: Component = "h2", title, highlight, description, centered = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "max-w-4xl mb-4 sm:mb-6",
        centered ? "mx-auto text-center" : "text-center md:text-left",
        className
      )}
      {...props}
    >
      <Component className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight leading-tight">
        {title}{" "}
        {highlight && (
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-blue-600">
            {highlight}
          </span>
        )}
      </Component>
      {description && (
        <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-8 px-2 sm:px-0">
          {description}
        </p>
      )}
    </div>
  )
)
Heading.displayName = "Heading"

export { Heading }
