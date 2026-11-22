import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getGatewayBaseUrl } from '@/lib/admin/gateway';

async function proxyAdminRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (
    request.method !== 'GET' &&
    origin &&
    host &&
    !origin.includes(host)
  ) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Требуется авторизация' }, { status: 401 });
  }

  const { path } = await context.params;
  if (!path || path.length === 0 || path.some((seg) => seg === '..' || seg.includes('\\'))) {
    return NextResponse.json({ detail: 'Invalid path' }, { status: 400 });
  }

  const targetUrl = `${getGatewayBaseUrl()}/api/v1/admin/${path.join('/')}${request.nextUrl.search}`;

  try {
    const init: RequestInit = {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(request.headers.get('content-type')
          ? { 'Content-Type': request.headers.get('content-type')! }
          : {}),
      },
      cache: 'no-store',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const bodyText = await request.text();
      if (bodyText) {
        init.body = bodyText;
      }
    }

    const upstream = await fetch(targetUrl, init);
    const responseText = await upstream.text();

    const response = new NextResponse(responseText, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });

    if (upstream.status === 401) {
      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: '',
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
    }

    return response;
  } catch (error) {
    console.error('Admin gateway proxy error:', error);
    return NextResponse.json(
      { detail: 'Ошибка подключения к сервису управления' },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdminRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdminRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdminRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdminRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdminRequest(request, context);
}