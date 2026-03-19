"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  content: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  content,
  className = "",
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopyClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus('success');
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setCopyStatus('error');
    }
  }, [content]);

  useEffect(() => {
    if (copyStatus !== 'idle') {
      const timer = setTimeout(() => setCopyStatus('idle'), copyStatus === 'success' ? 1000 : 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const icon = {
    idle: <Copy className="h-4 w-4" />,
    success: <Check className="h-4 w-4" />,
    error: <X className="h-4 w-4" />
  }[copyStatus];

  return (
    <button
      onClick={handleCopyClick}
      className={cn(
        "p-1 rounded transition-colors focus:outline-none focus:ring-1",
        copyStatus === 'success' && "text-green-400 bg-green-500/20",
        copyStatus === 'error' && "text-red-400 bg-red-500/20",
        copyStatus === 'idle' && "text-gray-400 hover:text-white hover:bg-gray-600",
        className
      )}
      aria-label={copyStatus === 'success' ? 'Скопировано!' : 'Скопировать'}
      title="Скопировать"
    >
      {icon}
    </button>
  );
};
