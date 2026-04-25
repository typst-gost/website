"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";
import { ToolType, guides } from "./data";
import Image from "next/image";

interface ScreenshotWindowProps {
  activeTool: ToolType;
  activeIndex: number;
  stepTitle: string;
}

export function ScreenshotWindow({
  activeTool,
  activeIndex,
  stepTitle,
}: ScreenshotWindowProps) {
  const step = guides[activeTool]?.[activeIndex];
  const imagePath = step?.image || `/screenshots/${activeTool}-step-${activeIndex + 1}.png`;
  const bgColor = step?.bg || (activeTool === "typst" ? "#e3e3e3" : "#181818");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <div className="w-full flex flex-col min-h-100 lg:min-h-125 bg-gray-900/80 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden backdrop-blur-xs relative">
        <div className="h-10 shrink-0 bg-gray-800/80 border-b border-gray-700/50 flex items-center px-4 z-20 justify-between">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="text-[10px] text-gray-500 font-mono truncate max-w-50">
            {imagePath}
          </div>
        </div>
        
        <div
          className="flex-1 relative overflow-hidden cursor-zoom-in group transition-colors duration-500"
          style={{ backgroundColor: bgColor }}
          onClick={() => setIsModalOpen(true)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTool}-${activeIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full p-4 flex items-center justify-center"
            >
              <Image
                src={imagePath}
                alt={stepTitle}
                fill
                priority
                className="object-contain object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                  <Maximize2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-4 bg-gray-800/50 border-t border-gray-700/50 backdrop-blur-md">
          <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {stepTitle}
          </p>
        </div>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12"
                onClick={() => setIsModalOpen(false)}
              >
                <button
                  className="absolute top-6 right-6 p-3 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-110 border border-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(false);
                  }}
                >
                  <X className="w-6 h-6" />
                </button>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative w-full h-full flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={imagePath}
                    alt={stepTitle}
                    fill
                    className="object-contain"
                    sizes="100vw"
                    priority
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}