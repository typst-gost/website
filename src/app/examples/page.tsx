import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { Navbar } from "@/components/sections/navbar"
import { Footer } from "@/components/sections/footer"
import { PageBackground } from "@/components/decoration/background"
import { Heading } from "@/components/ui/heading"
import { getExamples } from "@/lib/github-examples"
import { NAVIGATION_LINKS } from "@/lib/navigation"

export const metadata: Metadata = {
  title: "Примеры документов — Typst Gost",
  description: "Галерея примеров документов, оформленных по ГОСТ 7.32-2017 с использованием Typst.",
}

export default async function ExamplesPage() {
  const examples = await getExamples()

  return (
    <div className="min-h-screen flex flex-col relative bg-gray-950">
      <PageBackground />
      <div className="relative z-10 flex flex-col flex-1">
        <Navbar />
        
        <main className="container mx-auto px-4 md:px-8 pt-32 pb-20 flex-1 max-w-7xl">
          <Heading 
            title="Галерея примеров" 
            description="Изучите примеры документов, созданных с помощью библиотеки Typst ГОСТ. Нажмите на любой пример, чтобы посмотреть код и PDF."
            centered
          />

          {examples.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              Не удалось загрузить примеры из репозитория.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {examples.map((example) => (
                <Link
                  key={example.slug}
                  href={`/examples/${example.slug}`}
                  className="group flex flex-col bg-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:bg-gray-800/60 transition-all duration-300"
                >
                  <div className="relative aspect-[1/1.414] w-full bg-gray-100 overflow-hidden">
                    <Image
                      src={example.previewUrl}
                      alt={`Превью ${example.title}`}
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>
                  
                  <div className="p-5 flex items-center justify-between border-t border-gray-700/50 bg-gray-900/80 backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {example.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <a 
              href={NAVIGATION_LINKS.GITHUB_EXAMPLES_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              Смотреть репозиторий примеров на GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}