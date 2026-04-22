import { NextResponse } from "next/server"

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get("chatId") || "@typst_gost"
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

  if (!BOT_TOKEN) {
    return NextResponse.json({ result: 0 })
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount?chat_id=${chatId}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()

    if (data.ok) {
      return NextResponse.json({ result: data.result })
    } else {
      return NextResponse.json({ result: 0 })
    }
  } catch {
    return NextResponse.json({ result: 0 })
  }
}
