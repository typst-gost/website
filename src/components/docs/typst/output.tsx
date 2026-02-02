"use client"

import Image from "next/image"
import { useState, useEffect, useMemo } from "react"
import { LoadingSpinner } from "@/components/ui/spinner"
import { cn } from "@/lib/cn"
import { AlertTriangle, X } from "lucide-react"

interface TypstOutputProps {
  compiledSvg: string | null
  imagePath: string | null
  alt: string
  compileError: string | null
  imageError: boolean
  onImageError: () => void
  layout?: "horizontal" | "vertical"
}

export function TypstOutput({
  compiledSvg,
  imagePath,
  alt,
  compileError,
  imageError,
  onImageError,
  layout = "horizontal",
}: TypstOutputProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showSvg, setShowSvg] = useState(false)
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  const cleanSvg = useMemo(() => {
    if (!compiledSvg) return null
    return compiledSvg
      .replace(/svg\s*\{\s*fill:\s*none;?\s*\}/g, '')
      .replace(/html\s*\{\s*font-size:\s*[^;]+;\s*\}/g, '')
  }, [compiledSvg])

  useEffect(() => {
    const delay = cleanSvg ? 50 : 0
    const timer = setTimeout(() => {
      setShowSvg(!!cleanSvg)
    }, delay)

    return () => clearTimeout(timer)
  }, [cleanSvg])

  const outputBlockClass =
    layout === "horizontal"
      ? "w-1/2 flex items-center justify-center p-4 bg-gray-800 rounded-lg relative overflow-hidden"
      : "w-full flex items-center justify-center p-4 bg-gray-800 rounded-lg relative overflow-hidden"

  const isLoading = (!cleanSvg && imagePath && !imageError && !imageLoaded)
  const showNoOutput = !cleanSvg && (!imagePath || imageError)

  return (
    <div className={outputBlockClass}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 backdrop-blur-sm z-30">
          <LoadingSpinner />
        </div>
      )}

      <div className="grid w-full h-full place-items-center">
        {imagePath && !imageError && (
          <div 
            className={cn(
              "col-start-1 row-start-1 w-full h-full flex items-center justify-center transition-opacity duration-500",
              showSvg ? "opacity-0" : "opacity-100"
            )}
          >
            <Image
              src={imagePath}
              alt={alt}
              width={800}
              height={600}
              className="w-full h-auto object-contain mt-0 mb-0"
              onError={onImageError}
              onLoad={() => setImageLoaded(true)}
              unoptimized
            />
          </div>
        )}

        {cleanSvg && (
          <div
            className={cn(
              "col-start-1 row-start-1 w-full h-full flex items-center justify-center transition-opacity duration-500 z-10",
              showSvg ? "opacity-100" : "opacity-0"
            )}
            style={{ maxWidth: '800px', maxHeight: '600px' }}
            dangerouslySetInnerHTML={{ __html: cleanSvg }}
          />
        )}

        {showNoOutput && (
          <div className="col-start-1 row-start-1 text-fd-muted-foreground text-sm text-center p-4">
            <div>No output</div>
            {imagePath && (
              <div className="text-xs mt-2 opacity-70 break-all font-mono">
                {imagePath}
              </div>
            )}
          </div>
        )}
      </div>

      {compileError && (
        <>
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            onMouseDown={(e) => e.preventDefault()} 
            className={cn(
              "absolute top-2 right-2 z-50 p-1.5 rounded-md shadow-sm outline-none border-none",
              showErrorDetails 
                ? "bg-fd-card text-gray-400 hover:bg-fd-card/95" 
                : "bg-red-900 text-red-400 hover:bg-red-700/95"
            )}
            title={showErrorDetails ? "Скрыть ошибку" : "Показать ошибку"}
          >
            {showErrorDetails ? <X className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </button>

          {showErrorDetails && (
            <div className="absolute top-2 left-2 right-12 p-3 bg-fd-card border rounded-md shadow-lg z-40 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-red-400 text-sm font-medium mb-1.5">
                Ошибка компиляции 
              </div>
              <div className="text-xs font-mono break-all whitespace-pre-wrap max-h-50 overflow-auto text-zinc-300">
                {compileError}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
