"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { PdfViewerWrapper } from "@/components/sections/preview/pdf-client-wrapper"
import { Navbar } from "@/components/sections/navbar"
import { Example, ExampleFile } from "@/lib/github-examples"
import { cn } from "@/lib/utils"
import { FileTree } from "../file-tree"
import { FileViewer } from "../file-viewer"

interface WorkspaceLayoutProps {
  example: Example
  activeFile: ExampleFile
  rawContent: string
  htmlContent: string
}

export function WorkspaceLayout({ example, activeFile, rawContent, htmlContent }: WorkspaceLayoutProps) {
  const [showFiles, setShowFiles] = useState(false)

  return (
    <div className="h-screen w-full flex flex-col bg-gray-950 text-gray-300 overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-16 relative">
        <div className="lg:hidden p-3 border-b border-gray-800/50 bg-gray-900/50 flex justify-between items-center shrink-0 z-10">
          <button 
            onClick={() => setShowFiles(!showFiles)} 
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            {showFiles ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>} 
            Файлы проекта
          </button>
          <span className="text-xs font-mono text-gray-500 truncate max-w-37.5">{activeFile.path}</span>
        </div>

        <aside className={cn(
          "absolute lg:relative z-30 h-[calc(100%-3rem)] lg:h-full top-12 lg:top-0 w-4/5 sm:w-1/2 lg:w-64 shrink-0 border-r border-gray-800/50 bg-gray-900/95 lg:bg-gray-900/30 backdrop-blur-xl lg:backdrop-blur-none flex flex-col transition-transform duration-300 ease-in-out",
          showFiles ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <FileTree
            files={example.files} 
            activePath={activeFile.path} 
            slug={example.slug} 
            onFileSelect={() => setShowFiles(false)} 
          />
        </aside>

        {showFiles && (
          <div 
            className="fixed inset-0 top-28 bg-black/60 backdrop-blur-sm z-20 lg:hidden" 
            onClick={() => setShowFiles(false)} 
          />
        )}

        <div className="flex-1 overflow-y-auto lg:overflow-hidden custom-scrollbar">
          <div className="flex flex-col lg:flex-row h-full w-full max-w-2xl mx-auto px-4 sm:px-8 lg:max-w-none lg:px-0">
            
            <main className="flex-1 min-w-0 lg:border-r border-gray-800/50 bg-gray-950 flex flex-col relative min-h-[50vh] lg:min-h-0 shrink-0 mt-4 lg:mt-0 rounded-t-xl lg:rounded-none overflow-hidden">
              <div className="hidden lg:flex h-12 border-b border-gray-800/50 items-center px-4 bg-gray-900/50 shrink-0">
                <span className="text-sm font-mono text-gray-300">{activeFile.path}</span>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <FileViewer file={activeFile} rawContent={rawContent} htmlContent={htmlContent} />
              </div>
            </main>

            <aside className="w-full lg:w-[45%] lg:min-w-100 shrink-0 bg-gray-50 flex flex-col overflow-hidden relative min-h-[70vh] lg:min-h-0 border-x border-b lg:border-none border-gray-800/50 mb-8 lg:mb-0 rounded-b-xl lg:rounded-none">
              <PdfViewerWrapper url={example.pdfUrl} previewUrl={example.previewUrl} />
            </aside>
            
          </div>
        </div>
      </div>
    </div>
  )
}