"use client"

import { useState } from "react"
import JSZip from "jszip"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/buttons/button"
import { ExampleFile } from "@/lib/github-examples"

interface DownloadButtonProps {
  files: ExampleFile[]
  slug: string
}

export function DownloadButton({ files, slug }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const zip = new JSZip()

      const fetchPromises = files.map(async (file) => {
        const res = await fetch(file.url)
        if (!res.ok) throw new Error(`Failed to fetch ${file.path}`)
        const blob = await res.blob()
        zip.file(file.path, blob)
      })

      await Promise.all(fetchPromises)

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const downloadUrl = URL.createObjectURL(zipBlob)
      
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `${slug}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)

    } catch (error) {
      console.error("Download failed:", error)
      alert("Не удалось скачать архив. Попробуйте позже.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isDownloading}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isDownloading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Скачать ZIP
    </Button>
  )
}