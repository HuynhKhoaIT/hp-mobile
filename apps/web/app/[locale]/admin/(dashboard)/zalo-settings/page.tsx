// /admin/zalo-settings — hạn mức gửi tin Zalo + mẫu tin soạn sẵn (chỉ admin). Moderator mở → thông báo "chỉ quản trị viên".
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { AdminOnlyState, AdminPage } from '@/components/admin/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ZaloSettingsPanel } from '@/features/admin/zalo/components/zalo-settings-panel';
import { getZaloSettingsData } from '@/features/admin/zalo/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('zalo_settings') };
}

async function Content() {
  const data = await getZaloSettingsData();
  if (data.forbidden) return <AdminOnlyState />;
  return <ZaloSettingsPanel settings={data.settings} templates={data.templates} senders={data.senders} />;
}

export default async function ZaloSettingsPage() {
  const t = await getTranslations('admin.zalo_settings');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" aria-hidden />}>
        <Content />
      </Suspense>
    </AdminPage>
  );
}
