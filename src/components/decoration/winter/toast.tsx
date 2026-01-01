"use client"

import { useState, useEffect } from "react"
import { X, TreePine } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { NAVIGATION_LINKS } from "@/lib/navigation"

export function NewYearToast() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const hasSeen = localStorage.getItem("seen-new-year-2026")

        if (!hasSeen) {
            const timer = setTimeout(() => {
                setIsVisible(true)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        localStorage.setItem("seen-new-year-2026", "true")
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] md:bottom-8 md:right-8 md:w-96"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-xl">
                        <span className="pointer-events-none absolute -bottom-6 -right-4 rotate-[-15deg] select-none text-8xl font-black tracking-tighter text-white/3">
                            2026
                        </span>

                        <div className="absolute -top-10 -left-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
                        <div className="absolute -bottom-10 -right-10 h-35 w-35 rounded-full bg-purple-500/10 blur-3xl" />

                        <button
                            onClick={handleClose}
                            className="absolute right-2 top-2 z-10 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="relative z-0 flex items-start gap-4 pr-6">
                            <div className="shrink-0 rounded-xl p-3 bg-blue-500/20">
                                <TreePine className="h-8 w-8 text-blue-500" />
                            </div>

                            <div className="flex-1 pt-0.5">
                                <h3 className="text-base font-semibold text-white">
                                    С новым годом!
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                    Желаю вам не беспокоиться о мелочах и осуществить всё задуманное в этом году!
                                    <br />
                                    <span className="mt-2 block font-medium text-blue-300/90">
                                        <a
                                            href={NAVIGATION_LINKS.TELEGRAM_AUTHOR}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Павел Елисеев
                                        </a>
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
