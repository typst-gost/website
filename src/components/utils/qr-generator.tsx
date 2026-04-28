"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface QRCodeImageProps {
  data: string
  size?: number
  className?: string
  color?: string
  backgroundColor?: string
}

export function QRCodeImage({ 
  data, 
  size = 200, 
  className,
  color = "#000000",
  backgroundColor = "#ffffff"
}: QRCodeImageProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      color: { dark: color, light: backgroundColor },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err))
  }, [data, size, color, backgroundColor])

  if (!qrDataUrl) {
    return <div className={cn("bg-gray-100 animate-pulse rounded-lg", className)} style={{ width: size, height: size }} />
  }

  return (
    <Image
      src={qrDataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={cn("rounded-lg", className)}
    />
  )
}