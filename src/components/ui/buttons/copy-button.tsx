"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { Copy, Check, X, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  content: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ content }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleCopyClick = useCallback(async () => {
    setCopyStatus('loading');
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
    loading: <Loader2 className="h-4 w-4 animate-spin" />,
    success: <Check className="h-4 w-4" />,
    error: <X className="h-4 w-4" />
  }[copyStatus];

  return (
    <button
      onClick={handleCopyClick}
      disabled={copyStatus === 'loading'}
      className={cn(
        "p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
        copyStatus === 'success' && "text-green-400 bg-green-500/20",
        copyStatus === 'error' && "text-red-400 bg-red-500/20",
        copyStatus === 'loading' && "text-blue-400",
        copyStatus === 'idle' && "text-gray-400 hover:text-white hover:bg-gray-600"
      )}
      aria-label={copyStatus === 'success' ? 'Copied!' : 'Copy code'}
    >
      {icon}
    </button>
  );
};
