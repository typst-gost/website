"use client"

import { RotateCcw } from "lucide-react";
import { cn } from '@/lib/utils'

interface ResetButtonProps {
    onResetCallback: () => void;
    className?: string;
}

export const ResetButton: React.FC<ResetButtonProps> = ({
    onResetCallback,
    className = ""
}) => {
    return (
        <button
            className={
                cn(
                    "p-1 rounded transition-colors focus:outline-none focus:ring-1",
                    "text-gray-400 hover:text-white hover:bg-gray-600",
                    className
                )
            }
            onClick={onResetCallback}
            title="Сбросить изменения"
        >
            <RotateCcw className="h-4 w-4"/>
        </button>
    )
}