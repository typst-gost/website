import { NextResponse } from 'next/server';
import { getGatewayBaseUrl, verifyAdminSession } from '@/lib/admin/gateway';

export async function GET() {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ detail: 'Требуется авторизация' }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${getGatewayBaseUrl()}/ready`, {
      method: 'GET',
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Admin ready check error:', error);
    return NextResponse.json(
      { detail: 'Шлюз недоступен' },
      { status: 502 },
    );
  }
}