import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableColumns, comparisonData } from "./data";

function TableCell({ data, label }: { data: { exists: boolean; text: string }, label?: string }) {
  return (
    <div className="flex flex-col items-center justify-start md:justify-center gap-1.5 text-center">
      {label && (
        <span className="md:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 text-center">
          {label}
        </span>
      )}
      
      {data.exists ? (
        <div className="w-6 h-6 shrink-0 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-blue-400" />
        </div>
      ) : (
        <div className="w-6 h-6 shrink-0 rounded-full bg-gray-700/50 flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )}
      <span
        className={cn(
          "text-xs font-medium leading-tight",
          data.exists ? "text-gray-300" : "text-gray-500",
        )}
      >
        {data.text}
      </span>
    </div>
  );
}

export function ComparisonTable() {
  return (
    <div className="mb-8 md:mb-24 w-full">
      <div className="w-full rounded-2xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-md overflow-hidden">
        
        <div className="hidden md:grid grid-cols-6 gap-4 p-5 border-b border-gray-700/50 bg-gray-800/50 font-semibold text-gray-300 text-sm">
          {tableColumns.map((col, idx) => (
            <div key={idx} className={idx === 0 ? "pl-2" : "text-center"}>
              {col}
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {comparisonData.map((row, idx) => (
            <div
              key={idx}
              className={cn(
                "flex flex-col md:grid md:grid-cols-6 gap-4 md:gap-4 p-4 md:p-5 md:items-center transition-colors hover:bg-gray-800/40",
                idx !== comparisonData.length - 1 && "border-b border-gray-700/30",
              )}
            >
              <div className="flex items-center gap-3 md:pl-2 pb-4 md:pb-0 border-b border-gray-700/30 md:border-b-0">
                <div className="p-2 rounded-lg bg-gray-900/80 border border-gray-700/50 shadow-sm shrink-0">
                  {row.icon}
                </div>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white hover:text-blue-400 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-sm"
                >
                  {row.tool}
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:contents gap-y-6 gap-x-2 pt-2 md:pt-0">
                <TableCell data={row.offline} label={tableColumns[1]} />
                <TableCell data={row.collab} label={tableColumns[2]} />
                <TableCell data={row.git} label={tableColumns[3]} />
                <TableCell data={row.intellisense} label={tableColumns[4]} />
                <TableCell data={row.setup} label={tableColumns[5]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}