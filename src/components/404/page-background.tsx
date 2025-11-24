"use client"

import type React from "react"
import Image from "next/image"

interface PageBackgroundProps {
    children: React.ReactNode
    className?: string
    section?: "docs" | "examples"
}

export function PageBackground({ children, className = "", section }: PageBackgroundProps) {
    const backgroundImage = section === "docs"
        ? "/temporary/docs.png"
        : section === "examples"
            ? "/temporary/examples.png"
            : null
    
    const blurAmount = section === "docs" ? "blur-[8px]" : "blur-lg"


    return (
        <div
            className={`dark max-h-screen flex flex-col justify-center items-center relative ${className}`}
        >
            {backgroundImage ? (
                <>
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={backgroundImage}
                            alt=""
                            fill
                            className={`object-cover ${blurAmount} brightness-60`}
                            priority
                        />
                    </div>
                    <div className="absolute inset-0 bg-linear-to-br from-slate-950/80 via-slate-900/80 to-slate-800/80 z-1" />
                </>
            ) : (
                <>
                    <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800" />

                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-10 md:top-20 right-10 md:right-20 w-90 md:w-120 h-90 md:h-120 bg-blue-500/2.5 rounded-full blur-3xl" />
                        <div className="absolute bottom-10 md:bottom-20 left-10 md:left-20 w-64 md:w-80 h-64 md:h-80 bg-purple-500/2.5 rounded-full blur-3xl" />
                    </div>
                </>
            )}

            <div className="relative z-10 w-full">{children}</div>
        </div>
    )
}
