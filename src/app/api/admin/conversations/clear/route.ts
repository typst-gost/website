import { NextRequest, NextResponse } from 'next/server';
import { getGatewayBaseUrl, verifyAdminSession } from '@/lib/admin/gateway';

export async function POST(request: NextRequest) {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ detail: 'Требуется авторизация' }, { status: 401 });
  }

  try {
    const body = await request.text();
    const upstream = await fetch(
      `${getGatewayBaseUrl()}/api/v1/assistant/conversations/clear`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        cache: 'no-store',
      },
    );

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Clear conversation error:', error);
    return NextResponse.json(
      { detail: 'Не удалось сбросить контекст диалога' },
      { status: 502 },
    );
  }
}