import { NextResponse } from "next/server"

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get("chatId") || "@typst_gost"
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN 

  console.log(`[API/Telegram] Fetching member count for chat: ${chatId}`);

  if (!BOT_TOKEN) {
    console.error("[API/Telegram] Error: TELEGRAM_BOT_TOKEN is missing in environment variables.");
    return NextResponse.json({ error: "Config Error" }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount?chat_id=${chatId}`,
      { next: { revalidate: 60 } }
    )
    const data = await res.json()

    if (data.ok) {
      console.log(`[API/Telegram] Success: ${data.result} members found in ${chatId}.`);
      return NextResponse.json({ result: data.result })
    } else {
      console.error(`[API/Telegram] Telegram API Error: ${data.description}`);
      return NextResponse.json({ error: data.description }, { status: 400 })
    }
  } catch (error) {
    console.error("[API/Telegram] Fetch Error:", error);
    return NextResponse.json({ error: "Fetch Error" }, { status: 500 })
  }
}