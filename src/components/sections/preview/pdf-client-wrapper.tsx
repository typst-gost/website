"use client"

import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/ui/spinner"

const PdfViewer = dynamic(
  () => import("@/components/sections/preview/pdf-viewer"), 
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-900/20 rounded-xl">
        <LoadingSpinner size={48} />
      </div>
    )
  }
)

export function PdfViewerWrapper({ url }: { url: string }) {
  return <PdfViewer pdfUrl={url} />
}