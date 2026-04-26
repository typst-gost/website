import Image from "next/image"
import { codeToHtml } from "shiki"
import { ExampleFile } from "@/lib/github-examples"
import { CopyButton } from "@/components/ui/buttons/copy-button"

interface FileViewerProps {
  file: ExampleFile
  content: string
}

function getLanguage(filename: string) {
  if (filename.endsWith(".typ")) return "typst"
  if (filename.endsWith(".bib")) return "bibtex"
  if (filename.endsWith(".json")) return "json"
  if (filename.endsWith(".md")) return "markdown"
  if (filename.endsWith(".yaml") || filename.endsWith(".yml")) return "yaml"
  return "text"
}

export async function FileViewer({ file, content }: FileViewerProps) {
  const isImage = file.path.match(/\.(png|jpe?g|gif|svg)$/i)

  if (isImage) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e] p-8">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={file.url} 
            alt={file.path}
            className="max-w-full max-h-full object-contain drop-shadow-xl"
            loading="lazy"
          />
        </div>
      </div>
    )
  }

  const lang = getLanguage(file.path)
  
  const html = await codeToHtml(content, {
    lang,
    theme: "dark-plus",
  })

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="absolute top-2 right-4 z-10">
        <CopyButton content={content} />
      </div>
      <div 
        className="flex-1 overflow-auto custom-scrollbar p-4 text-[13px] leading-relaxed [&>pre]:bg-transparent! [&>pre]:m-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}