import Link from "next/link"
import { GitHubStars } from "@/components/github-stars"

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-600/20 bg-gray-950/20 backdrop-blur-md">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/">
            <div className="flex items-center">
              <span className="ml-2 text-2xl font-bold text-white">Typst 7.32</span>
            </div>
          </Link>
          <Link href="/docs" className="pointer-events-none text-gray-500">
            Документация (в работе)
          </Link>
          <Link href="/examples" className="pointer-events-none text-gray-500">
            Примеры (в работе)
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <GitHubStars />
        </div>
      </nav>
    </header>
  )
}