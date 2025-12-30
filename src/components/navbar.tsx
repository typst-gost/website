"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GitHubStars } from "@/components/github-stars"
import { Heart, Menu, X } from "lucide-react"

const NAV_LINKS = [
  { href: "/docs", label: "Документация (в работе)", disabled: true },
  { href: "/examples", label: "Примеры (в работе)", disabled: true },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const closeMenu = () => setIsOpen(false)

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-gray-600/20 transition-all duration-300 ${
        isOpen
          ? "bg-gray-950/40 backdrop-blur-2xl backdrop-brightness-50"
          : "bg-gray-950/20 backdrop-blur-md"
      }`}
    >
      <nav className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-max"
          >
            <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Typst 7.32
            </span>
          </Link>

          <div className="hidden lg:flex items-center space-x-6">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} link={link} pathname={pathname} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden md:block">
            <GitHubStars />
          </div>

          <Link
            href="https://pay.cloudtips.ru/p/451a1d97"
            className="group hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 hover:border-pink-500/50 text-sm transition-all duration-200 whitespace-nowrap"
          >
            <Heart className="w-4 h-4 text-pink-500 group-hover:text-pink-400 transition-colors group-hover:scale-110" />
            <span className="text-pink-100/80 group-hover:text-pink-100 font-medium">
              Пожертвовать
            </span>
          </Link>

          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Меню"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      <div
        className={`lg:hidden grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  isMobile
                  onClick={closeMenu}
                />
              ))}
            </div>

            <div className="md:hidden">
              <div className="h-px bg-white/10 my-4" />
              
              <div className="flex flex-col gap-6 px-4">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-sm">Поддержать проект</span>
                  <GitHubStars />
                </div>
                
                <Link
                  href="https://pay.cloudtips.ru/p/451a1d97"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-pink-500/30 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20 hover:text-white transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span className="font-medium">Пожертвовать</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function NavLink({
  link,
  pathname,
  isMobile = false,
  onClick,
}: {
  link: { href: string; label: string; disabled?: boolean }
  pathname: string
  isMobile?: boolean
  onClick?: () => void
}) {
  const isActive = pathname === link.href

  let classes = "font-medium transition-colors duration-200"

  if (link.disabled) {
    classes += " pointer-events-none text-gray-500 cursor-not-allowed"
  } else if (isActive) {
    classes += isMobile ? " bg-white/10 text-white" : " text-white"
  } else {
    classes += isMobile
      ? " text-gray-400 hover:text-white hover:bg-white/5"
      : " text-gray-400 hover:text-white"
  }

  if (isMobile) {
    classes += " block px-4 py-3 rounded-lg text-base"
  } else {
    classes += " whitespace-nowrap"
  }

  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={classes}
      aria-disabled={link.disabled}
    >
      {link.label}
    </Link>
  )
}
