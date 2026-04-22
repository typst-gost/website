import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableColumns, comparisonData } from "./data";

function TableCell({ data }: { data: { exists: boolean; text: string } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 text-center">
      {data.exists ? (
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-blue-400" />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-700/50 flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )}
      <span
        className={cn(
          "text-xs font-medium",
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
    <div className="mb-16 md:mb-24">
      <div className="overflow-x-auto pb-4 hide-scrollbar">
        <div className="min-w-200 w-full rounded-2xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-md overflow-hidden">
          <div className="grid grid-cols-6 gap-4 p-5 border-b border-gray-700/50 bg-gray-800/50 font-semibold text-gray-300 text-sm">
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
                  "grid grid-cols-6 gap-4 p-5 items-center transition-colors hover:bg-gray-800/40",
                  idx !== comparisonData.length - 1 &&
                    "border-b border-gray-700/30",
                )}
              >
                <div className="flex items-center gap-3 pl-2">
                  <div className="p-2 rounded-lg bg-gray-900/80 border border-gray-700/50 shadow-sm">
                    {row.icon}
                  </div>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-white whitespace-nowrap hover:text-blue-400 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-sm"
                  >
                    {row.tool}
                  </a>
                </div>

                <TableCell data={row.offline} />
                <TableCell data={row.collab} />
                <TableCell data={row.git} />
                <TableCell data={row.intellisense} />
                <TableCell data={row.setup} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
