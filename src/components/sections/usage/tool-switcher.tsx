"use client";

import { cn } from "@/lib/utils";
import { ToolType, toolsMeta } from "./data";

interface ToolSwitcherProps {
  activeTool: ToolType;
  onChange: (tool: ToolType) => void;
}

export function ToolSwitcher({ activeTool, onChange }: ToolSwitcherProps) {
  return (
    <div className="w-full mt-8 mb-10">
      <div className="flex flex-col sm:flex-row gap-1.5 w-full p-1.5 bg-gray-900/60 border border-gray-700/50 rounded-2xl backdrop-blur-xl shadow-2xl">
        {(
          Object.entries(toolsMeta) as [
            ToolType,
            (typeof toolsMeta)[ToolType],
          ][]
        ).map(([key, meta]) => {
          const Icon = meta.Icon;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                "flex-1 py-4 rounded-xl text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-3 border",
                activeTool === key
                  ? "border-blue-500/30 bg-blue-500/10 text-gray-200 hover:bg-blue-500/20 shadow-[0_0_20px_rgba(37,99,232,0.1)]"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="tracking-tight">{meta.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
