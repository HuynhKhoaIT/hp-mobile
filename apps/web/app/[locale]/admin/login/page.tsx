// /admin/login?next=<đường dẫn admin> — bước 1: SĐT → OTP. Không phải staff → đăng xuất + báo. Staff → /admin/login/mfa.
// searchParams đọc theo request → trong Suspense; khung (thương hiệu, chỉ báo bước) prerender.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { AdminAuthCard } from '@/features/admin/auth/components/admin-auth-card';
import { AdminLoginFlow } from '@/features/admin/auth/components/admin-login-flow';
import { safeAdminNext } from '@/features/admin/nav';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('login') };
}

async function LoginContent({ searchParams }: { searchParams: PageProps<'/[locale]/admin/login'>['searchParams'] }) {
  const params = await searchParams;
  return <AdminLoginFlow next={safeAdminNext(typeof params.next === 'string' ? params.next : null)} />;
}

export default function AdminLoginPage({ searchParams }: PageProps<'/[locale]/admin/login'>) {
  return (
    <AdminAuthCard step={1}>
      <Suspense fallback={<TextLinesSkeleton lines={5} />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AdminAuthCard>
  );
}
