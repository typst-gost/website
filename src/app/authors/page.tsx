import { Metadata } from "next"
import Image from "next/image"
import { Github, User, ExternalLink } from "lucide-react"
import { Navbar } from "@/components/sections/navbar"
import { Footer } from "@/components/sections/footer"
import { PageBackground } from "@/components/decoration/background"
import { NAVIGATION_LINKS } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { authors } from "./data"

export const metadata: Metadata = {
  title: "Об авторах — Typst Gost",
  description: "Авторы и контрибьюторы экосистемы Typst Gost",
}

interface GitHubContributor {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

async function getContributors(): Promise<GitHubContributor[]> {
  try {
    const res = await fetch("https://api.github.com/repos/typst-gost/modern-g7-32/contributors", {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!res.ok) {
      console.error("Failed to fetch contributors:", res.statusText)
      return[]
    }

    return await res.json()
  } catch (error) {
    console.error("Error fetching contributors:", error)
    return[]
  }
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.547l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.993.012z" />
    </svg>
  )
}

export default async function AuthorsPage() {
  const allContributors = await getContributors()

  const authorLogins = authors.map((a) => a.github.split("/").pop()?.toLowerCase())

  const contributors = allContributors.filter(
    (c) => c.login && !authorLogins.includes(c.login.toLowerCase()) && !c.login.startsWith("dependabot") && !c.login.startsWith("actions-user")
  )

  return (
    <div className="min-h-screen flex flex-col relative bg-gray-950">
      <PageBackground />
      <div className="relative z-10 flex flex-col flex-1">
        <Navbar />
        <main className="container mx-auto px-4 md:px-8 pt-32 pb-16 flex-1 flex flex-col max-w-5xl">
          <div className="max-w-2xl mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Об авторах</h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Экосистема <strong className="text-white font-semibold">Typst Gost</strong> и шаблон{" "}
              <strong className="text-white font-semibold">modern-g7-32</strong> созданы и поддерживаются
              открытым сообществом разработчиков.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch mb-16">
            {authors.map((author) => (
              <div
                key={author.name}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border transition-all duration-300 flex flex-col",
                  "bg-gray-900/40 backdrop-blur-sm hover:bg-gray-800/60",
                  author.isInactive ? "border-gray-800/50" : "border-gray-700/50 hover:border-blue-500/30"
                )}
              >
                {author.isInactive && (
                  <div className="absolute top-7 -right-12 z-20 w-48 rotate-45 border-y border-red-500/20 bg-red-500/10 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-red-400 backdrop-blur-md shadow-sm pointer-events-none">
                    Неактивен
                  </div>
                )}

                <div className="relative p-6 sm:p-8 flex flex-col flex-1">
                  <div className="flex items-start gap-5 mb-5">
                    <div className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden border border-gray-700/50 bg-gray-800/50 flex items-center justify-center">
                      {author.avatarPath ? (
                        <Image src={author.avatarPath} alt={author.name} fill className="object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 pt-1 pr-4">
                      <h2 className="text-2xl font-bold text-white tracking-tight">{author.name}</h2>
                      <p className={cn("text-sm font-medium", author.isInactive ? "text-gray-500" : "text-blue-400")}>
                        {author.role}
                      </p>
                    </div>
                  </div>

                  {author.tags && author.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {author.tags.map((tag) => (
                        <span key={tag.label} className={cn("px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider border", tag.className)}>
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-auto relative z-10">
                    <a href={author.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm text-gray-300 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/10 transition-all">
                      <Github className="w-4 h-4" /> 
                      <span className="font-medium">GitHub</span>
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                    {author.telegram && (
                      <a href={author.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2AABEE]/10 text-sm text-[#2AABEE] border border-transparent hover:border-[#2AABEE]/30 hover:bg-[#2AABEE]/20 transition-all">
                        <TelegramIcon className="w-4 h-4" /> 
                        <span className="font-medium">Telegram</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {contributors.length > 0 && (
            <div className="mt-8 border-t border-gray-800/40 pt-12">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Контрибьюторы</h2>
                <span className="flex items-center justify-center bg-gray-800 text-gray-300 text-sm font-bold px-3.5 py-1 rounded-full border border-gray-700/50">
                  {contributors.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 sm:gap-4">
                {contributors.map((c) => (
                  <a
                    key={c.login}
                    href={c.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${c.login} (${c.contributions} contributions)`}
                    className="group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-gray-800 hover:border-gray-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 z-0 hover:z-10 bg-gray-800"
                  >
                    <Image
                      src={c.avatar_url}
                      alt={c.login}
                      fill
                      sizes="56px"
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-16">
            <div className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
                Исходный код шаблона распространяется свободно. Вы можете изучить его, предложить улучшения или использовать в своих проектах на{' '}
                <a
                  href={NAVIGATION_LINKS.GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}