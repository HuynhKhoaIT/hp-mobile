// /admin/login/mfa?next=<đường dẫn admin> — bước 2: TOTP (đăng ký lần đầu bằng QR, sau đó nhập mã). Xong → phiên aal2.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { AdminAuthCard } from '@/features/admin/auth/components/admin-auth-card';
import { MfaFlow } from '@/features/admin/auth/components/mfa-flow';
import { safeAdminNext } from '@/features/admin/nav';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('mfa') };
}

async function MfaContent({ searchParams }: { searchParams: PageProps<'/[locale]/admin/login/mfa'>['searchParams'] }) {
  const params = await searchParams;
  return <MfaFlow next={safeAdminNext(typeof params.next === 'string' ? params.next : null)} />;
}

export default function AdminMfaPage({ searchParams }: PageProps<'/[locale]/admin/login/mfa'>) {
  return (
    <AdminAuthCard step={2}>
      <Suspense fallback={<TextLinesSkeleton lines={5} />}>
        <MfaContent searchParams={searchParams} />
      </Suspense>
    </AdminAuthCard>
  );
}
