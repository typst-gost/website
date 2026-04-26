import Image from "next/image"
import { ExampleFile } from "@/lib/github-examples"
import { CopyButton } from "@/components/ui/buttons/copy-button"

interface FileViewerProps {
  file: ExampleFile
  rawContent: string
  htmlContent: string
}

export function FileViewer({ file, rawContent, htmlContent }: FileViewerProps) {
  const isImage = file.path.match(/\.(png|jpe?g|gif|svg)$/i)

  if (isImage) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-gray-850">
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

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-800">
      <div className="absolute top-2 right-4 z-10">
        <CopyButton content={rawContent} />
      </div>
      <div 
        className="flex-1 overflow-auto custom-scrollbar p-4 text-[13px] sm:text-[14px] leading-relaxed [&_pre]:bg-transparent! [&_pre]:m-0! [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_code]:whitespace-pre-wrap! [&_code]:wrap-break-word! [&_code]:break-all!"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}