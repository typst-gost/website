import { redirect } from 'next/navigation';
import { ADMIN_DASHBOARD_PATH, verifyAdminSession } from '@/lib/admin/gateway';
import { AdminLoginForm } from '@/components/admin/login-form';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const user = await verifyAdminSession();

  if (user) {
    redirect(ADMIN_DASHBOARD_PATH);
  }

  return <AdminLoginForm redirectPath={ADMIN_DASHBOARD_PATH} />;
}