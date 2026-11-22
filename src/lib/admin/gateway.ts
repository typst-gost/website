import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'tg_admin_session';
export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_DASHBOARD_PATH = '/admin';

export function getGatewayBaseUrl(): string {
  return (process.env.AI_GATEWAY_URL || 'http://127.0.0.1:8085').replace(/\/+$/, '');
}

export interface AdminUserIdentity {
  username: string;
  auth_type: string;
}

export async function verifyAdminSession(): Promise<AdminUserIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    const res = await fetch(`${getGatewayBaseUrl()}/api/v1/admin/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as AdminUserIdentity;
    if (!data?.username) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}