import { redirect } from 'next/navigation';
import { ADMIN_LOGIN_PATH, verifyAdminSession } from '@/lib/admin/gateway';
import { AdminDashboard } from '@/components/admin/dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await verifyAdminSession();

  if (!user) {
    redirect(ADMIN_LOGIN_PATH);
  }

  return (
    <AdminDashboard
      initialUser={user}
      loginPath={ADMIN_LOGIN_PATH}
    />
  );
}