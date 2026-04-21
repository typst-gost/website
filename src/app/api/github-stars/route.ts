import { NextResponse } from "next/server"

// Кэшируем ответ раз в час (3600 секунд)
export const revalidate = 3600;

// Константа с нужным репозиторием
const GITHUB_REPO = "typst-gost/modern-g7-32";

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: {
        // GitHub API требует наличие заголовка User-Agent
        "User-Agent": "typst-gost-website",
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from GitHub" }, 
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ stars: data.stargazers_count })
  } catch (error) {
    return NextResponse.json({ error: "Fetch Error" }, { status: 500 })
  }
}