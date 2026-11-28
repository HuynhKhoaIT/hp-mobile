// /admin/zalo — kết nối Zalo cá nhân bằng mã QR để gửi tin tự động từ hộp thoại "Nhắn Zalo" (moderator+).
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage } from '@/components/admin/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ZaloConnectPanel } from '@/features/admin/zalo/components/zalo-connect-panel';
import { getZaloConnection } from '@/features/admin/zalo/queries';

// Tạo mã QR (Edge Function zalo-connect) có thể mất vài giây: Server Action chạy trong giới hạn của trang này.
export const maxDuration = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('zalo') };
}

async function Content() {
  const initial = await getZaloConnection();
  return <ZaloConnectPanel initial={initial} />;
}

export default async function ZaloPage() {
  const t = await getTranslations('admin.zalo.connect');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" aria-hidden />}>
        <Content />
      </Suspense>
    </AdminPage>
  );
}
