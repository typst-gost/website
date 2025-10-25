"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import { Viewer, Worker, PageChangeEvent, DocumentLoadEvent, SpecialZoomLevel } from "@react-pdf-viewer/core"
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation"
import { toolbarPlugin } from "@react-pdf-viewer/toolbar"
import { zoomPlugin } from "@react-pdf-viewer/zoom"
import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/default-layout/lib/styles/index.css"
import "@react-pdf-viewer/toolbar/lib/styles/index.css"
import { ArrowLeft, ArrowRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/spinner"

interface PdfViewerProps {
  pdfUrl: string
}

export default function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const [pageNumber, setPageNumber] = useState(0)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const viewerRef = useRef<Viewer | null>(null)

  const pageNavPluginInstance = pageNavigationPlugin()
  const { jumpToPage } = pageNavPluginInstance

  const toolbarPluginInstance = toolbarPlugin()
  const zoomPluginInstance = zoomPlugin({ enableShortcuts: false })

  const onDocumentLoadSuccess = useCallback(
    (e: DocumentLoadEvent) => {
      setNumPages(e.doc.numPages)
      setIsLoaded(true)
    },
    []
  )

  const handlePageChange = useCallback((e: PageChangeEvent) => {
    setPageNumber(e.currentPage)
  }, [])

  useEffect(() => {
    if (viewerRef.current) {
      zoomPluginInstance.zoomTo(SpecialZoomLevel.PageFit)
    }
  }, [isLoaded, zoomPluginInstance])

  const goToPreviousPage = useCallback(() => {
    if (pageNumber > 0) jumpToPage(pageNumber - 1)
  }, [pageNumber, jumpToPage])

  const goToNextPage = useCallback(() => {
    if (numPages && pageNumber < numPages - 1) jumpToPage(pageNumber + 1)
  }, [pageNumber, numPages, jumpToPage])

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
      <div className="h-full relative overflow-hidden rounded-2xl border border-gray-700/30 bg-gray-900/20">
        <Viewer
          ref={viewerRef}
          fileUrl={pdfUrl}
          plugins={[toolbarPluginInstance, pageNavPluginInstance, zoomPluginInstance]}
          defaultScale={SpecialZoomLevel.PageFit}
          onDocumentLoad={onDocumentLoadSuccess}
          onPageChange={handlePageChange}
        />

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm z-20">
            <LoadingSpinner size={48} />
          </div>
        )}

        {isLoaded && (
          <>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
              <a href={pdfUrl} download>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-gray-800/70 hover:bg-gray-700/90 rounded-full"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  <span className="sr-only">Скачать документ</span>
                </Button>
              </a>
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-800/70 backdrop-blur-md shadow-md rounded-full px-3 sm:px-4 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={pageNumber <= 0}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-700/70 rounded-full"
                onClick={goToPreviousPage}
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </Button>

              <div className="text-xs sm:text-sm font-medium text-gray-200">
                {pageNumber + 1}/{numPages || "-"}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={numPages !== null && pageNumber >= numPages - 1}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-700/70 rounded-full"
                onClick={goToNextPage}
              >
                <ArrowRight className="h-4 w-4 text-white" />
              </Button>
            </div>
          </>
        )}
      </div>
    </Worker>
  )
}
