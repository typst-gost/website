import { notFound } from "next/navigation"
import { getExampleBySlug, getRawFileContent } from "@/lib/github-examples"
import { fileParam } from "../search-params"
import { PdfViewerWrapper } from "@/components/sections/preview/pdf-client-wrapper"
import { WorkspaceHeader } from "../workspace-header"
import { FileTree } from "../file-tree"
import { FileViewer } from "../file-viewer"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ExampleWorkspacePage({ params, searchParams }: Props) {
  const { slug } = await params
  const example = await getExampleBySlug(slug)

  if (!example) {
    notFound()
  }

  const resolvedSearchParams = await searchParams
  const activeFilePath = fileParam.parseServerSide(resolvedSearchParams.file)

  const activeFile = example.files.find((f) => f.path === activeFilePath) || example.files[0]
  
  let rawContent = ""
  if (activeFile && !activeFile.path.match(/\.(png|jpe?g|gif|svg)$/i)) {
    rawContent = await getRawFileContent(activeFile.url)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#1e1e1e] text-gray-300 overflow-hidden">
      <WorkspaceHeader title={example.title} files={example.files} slug={example.slug} />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-gray-800 bg-[#252526] overflow-y-auto custom-scrollbar">
          <FileTree files={example.files} activePath={activeFile.path} slug={slug} />
        </aside>

        <main className="flex-1 min-w-0 border-r border-gray-800 bg-[#1e1e1e] flex flex-col">
          <div className="h-10 border-b border-gray-800 flex items-center px-4 bg-[#2d2d2d] shrink-0">
            <span className="text-sm font-mono text-gray-300">{activeFile.path}</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <FileViewer file={activeFile} content={rawContent} />
          </div>
        </main>

        <aside className="w-[40%] min-w-100 shrink-0 bg-gray-50 flex flex-col overflow-hidden relative">
          <PdfViewerWrapper url={example.pdfUrl} />
        </aside>
      </div>
    </div>
  )
}