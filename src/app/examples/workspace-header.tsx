"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ExampleFile } from "@/lib/github-examples"
import { DownloadButton } from "./download-button"

interface WorkspaceHeaderProps {
  title: string
  files: ExampleFile[]
  slug: string
}

export function WorkspaceHeader({ title, files, slug }: WorkspaceHeaderProps) {
  return (
    <header className="h-14 bg-[#323233] border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Link 
          href="/examples" 
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-sm font-medium text-white truncate max-w-75">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <DownloadButton files={files} slug={slug} />
      </div>
    </header>
  )
}