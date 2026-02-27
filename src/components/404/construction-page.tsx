"use client"

import { ConstructionGif } from "./construction-gif"
import { ConstructionProgressBar } from "./progress-bar"
import { PageBackground } from "./page-background"

interface Construction404PageProps {
  section: "docs" | "examples"
}

export function Construction404Page({ section }: Construction404PageProps) {
  const sectionLabel = section === "docs" ? "документации" : "примеров"
  const sectionTitle = section === "docs" ? "документации" : "примеров"

  const constructionEndDate =
    section === "docs" ? new Date(2026, 3, 10) : new Date(2026, 3, 20)

  return (
    <PageBackground section={section}>
      <div className="w-full max-w-2xl mx-auto text-center flex flex-col min-h-screen py-18">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 md:mb-4 text-white text-balance">
          Раздел{" "}
          <span className="bg-linear-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            {sectionLabel}
          </span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-4 md:mb-6 font-light text-pretty">
          находится в разработке
        </p>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="mb-8 md:mb-12">
            <ConstructionGif />
          </div>

          <div className="mb-4 md:mb-8 w-full">
            <ConstructionProgressBar endDate={constructionEndDate} />
          </div>

          <a
            href="https://t.me/typst_gost"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 md:gap-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-sm px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl mx-auto w-fit"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.03-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.5-.18.943.112.78.89z" />
            </svg>
            <span className="text-xs md:text-sm">
              Поучаствовать в разработке <strong>{sectionTitle}</strong>
            </span>
          </a>
        </div>

        <div className="text-slate-200 text-xs sm:text-sm mt-auto px-4">
          <p className="text-slate-400 text-2xs sm:text-xs md:text-sm leading-relaxed">
            Мы активно работаем над разделом <strong>{sectionTitle}</strong>...<br />
            Скоро здесь будет полезная информация и примеры!
          </p>
          <p>Спасибо за терпение 🚀</p>
        </div>
      </div>
    </PageBackground>
  )
}
