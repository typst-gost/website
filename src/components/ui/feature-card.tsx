import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  hoverEffect?: boolean;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function FeatureCard({
  title,
  description,
  children,
  icon,
  hoverEffect = false,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-slate-800/50 backdrop-blur-md border border-gray-600/50 flex flex-col transition-all duration-500",
        hoverEffect && "group hover:bg-slate-800/80 hover:border-blue-500/50 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.2),0_0_20px_-5px_rgba(59,130,246,0.1)]",
        className
      )}
    >
      {hoverEffect && (
        <>
          {/* Градиент верхней рамки при наведении */}
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none z-10" />
          
          {/* Внутреннее свечение при наведении */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent to-amber-500/5" />
          </div>
        </>
      )}

      <div className={cn("relative z-10 flex flex-col flex-1 p-8", contentClassName)}>
        {icon && (
          <div className="mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 transition-transform duration-300 group-hover:scale-110">
              {icon}
            </div>
          </div>
        )}
        
        <div className="flex-1">
          <h3
            className={cn(
              "font-bold mb-3 transition-colors duration-300",
              hoverEffect && "group-hover:text-blue-500",
              titleClassName || "text-2xl"
            )}
          >
            {title}
          </h3>
          <p className={cn("text-gray-400 leading-relaxed", descriptionClassName)}>
            {description}
          </p>
        </div>
        
        {children && (
          <div className="mt-4 flex flex-col">
            {children}
          </div>
        )}
      </div>
    </Card>
  );
}