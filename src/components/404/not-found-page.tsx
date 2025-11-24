"use client"

import Link from "next/link"
import { PageBackground } from "./page-background"

export function NotFoundPage() {
  return (
    <PageBackground className="min-h-screen">
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="mb-4 md:mb-6">
          <p className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold bg-linear-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent text-balance">
            404
          </p>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 text-white text-balance">
          Страница не найдена
        </h1>

        <p className="text-sm sm:text-base md:text-md lg:text-lg text-slate-300 mb-6 md:mb-8 font-light text-pretty">
          Страница, которую вы ищете, не существует или была перемещена
        </p>

        <div className="h-px bg-linear-to-r from-transparent via-blue-500 to-transparent mb-6 md:mb-8" />

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-4 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm md:text-base font-semibold rounded-lg shadow-lg"
        >
          ← Вернуться на главную
        </Link>
      </div>
    </PageBackground>
  )
}
