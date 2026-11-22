import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getGatewayBaseUrl } from '@/lib/admin/gateway';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = (body.username || '').trim();
    const password = body.password || '';

    if (!username || !password) {
      return NextResponse.json(
        { detail: 'Введите имя пользователя и пароль' },
        { status: 400 },
      );
    }

    const upstream = await fetch(`${getGatewayBaseUrl()}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store',
    });

    const data = (await upstream.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      username?: string;
      detail?: string;
    };

    if (!upstream.ok || !data.access_token) {
      return NextResponse.json(
        { detail: data.detail || 'Неверный логин или пароль' },
        { status: upstream.status || 401 },
      );
    }

    const isHttps =
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https';

    const response = NextResponse.json({
      ok: true,
      username: data.username || username,
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: data.access_token,
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: typeof data.expires_in === 'number' ? data.expires_in : 86400,
    });

    return response;
  } catch (error) {
    console.error('Admin login proxy error:', error);
    return NextResponse.json(
      { detail: 'Не удалось связаться с сервером авторизации' },
      { status: 502 },
    );
  }
}