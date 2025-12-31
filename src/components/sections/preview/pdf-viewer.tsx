"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ArrowLeft, ArrowRight, Download } from "lucide-react"
import { Button } from "@/components/ui/buttons/button"
import { LoadingSpinner } from "@/components/ui/spinner"
import Link from "next/link"

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'

interface PdfViewerProps {
  pdfUrl: string
  showControls?: boolean
}

export default function PdfViewer({
  pdfUrl,
  showControls = true
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const isProgrammaticScroll = useRef(false)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        setContainerWidth(prev => {
          if (!prev || Math.abs(prev - width) > 15) {
            return width - 32
          }
          return prev
        })
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (isLoading || !numPages || !containerRef.current) return

    const options = {
      root: containerRef.current,
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0.01
    }

    observerRef.current = new IntersectionObserver((entries) => {
      if (isProgrammaticScroll.current) return

      const visibleEntry = entries.find(entry => entry.isIntersecting)
      
      if (visibleEntry) {
        const pageNum = Number(visibleEntry.target.getAttribute('data-page-number'))
        if (!isNaN(pageNum)) {
          setPageNumber(pageNum)
        }
      }
    }, options)

    pageRefs.current.forEach((element) => {
      if (element) observerRef.current?.observe(element)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [isLoading, numPages])

  const scrollToPage = (targetPage: number) => {
    const element = pageRefs.current.get(targetPage)

    if (element) {
      isProgrammaticScroll.current = true
      setPageNumber(targetPage)
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })

      setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 800)
    }
  }

  const goToPreviousPage = () => scrollToPage(Math.max(pageNumber - 1, 1))
  const goToNextPage = () => scrollToPage(Math.min(pageNumber + 1, numPages || 1))

  return (
    <div className="group relative w-full h-dvh md:h-full rounded-none md:rounded-2xl border-0 md:border border-gray-700/30 bg-gray-50 flex flex-col overflow-hidden">
      
      <div 
        ref={containerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar p-4 scroll-smooth overscroll-y-contain"
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex h-full items-center justify-center min-h-[50vh]">
              <LoadingSpinner size={48} />
            </div>
          }
          error={
            <div className="flex h-full items-center justify-center text-red-500 font-medium">
              Не удалось загрузить документ
            </div>
          }
          className="flex flex-col items-center gap-4 pb-24"
        >
          {numPages && Array.from(new Array(numPages), (_, index) => {
            const pageIndex = index + 1
            
            return (
              <div
                key={`page_${pageIndex}`}
                data-page-number={pageIndex}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageIndex, el)
                  else pageRefs.current.delete(pageIndex)
                }}
                className="shadow-md rounded-sm overflow-hidden bg-white"
                style={{
                  width: containerWidth || '100%',
                  minHeight: containerWidth ? containerWidth * 1.4 : '300px'
                }}
              >
                <Page 
                  pageNumber={pageIndex} 
                  width={containerWidth || undefined} 
                  loading={
                    <div 
                      className="bg-gray-100 animate-pulse" 
                      style={{ 
                        width: '100%',
                        aspectRatio: '1 / 1.414'
                      }} 
                    />
                  }
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  error={<div className="p-4 text-xs text-red-400">Ошибка страницы</div>}
                />
              </div>
            )
          })}
        </Document>
      </div>

      {!isLoading && showControls && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col justify-between p-4 pb-8 md:pb-4">
          
          <div className="flex justify-end pointer-events-auto">
            <Link href={pdfUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-full bg-gray-900/80 text-white shadow-lg backdrop-blur-md hover:bg-gray-800"
              >
                <Download className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="flex justify-center w-full pointer-events-auto">
            <div className="flex items-center gap-3 rounded-full bg-gray-900/90 px-4 py-2 shadow-xl backdrop-blur-md border border-white/10">
              <Button
                variant="ghost"
                size="sm"
                disabled={pageNumber <= 1}
                className="h-9 w-9 rounded-full p-0 text-white hover:bg-white/20 disabled:opacity-30"
                onClick={goToPreviousPage}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <span className="min-w-16 text-center text-sm font-medium text-gray-100 tabular-nums">
                {pageNumber} / {numPages || "-"}
              </span>

              <Button
                variant="ghost"
                size="sm"
                disabled={numPages !== null && pageNumber >= numPages}
                className="h-9 w-9 rounded-full p-0 text-white hover:bg-white/20 disabled:opacity-30"
                onClick={goToNextPage}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
