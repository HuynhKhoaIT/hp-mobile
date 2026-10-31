// /admin/moderation?status=&reason=&page=&item= — hàng chờ kiểm duyệt tin (moderator+). Bộ lọc / trang nằm trên URL;
// dữ liệu theo request (không cache), đọc trong <Suspense>. Quyền: proxy.ts → AdminShell → requireStaff ở queries / actions → RLS.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { QueueSkeleton } from '@/features/admin/moderation/components/queue-skeleton';
import { QueueToolbar } from '@/features/admin/moderation/components/queue-toolbar';
import { QueueView } from '@/features/admin/moderation/components/queue-view';
import { getModerationQueue, parseQueueParams } from '@/features/admin/moderation/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('moderation') };
}

async function QueueContent({ searchParams }: { searchParams: PageProps<'/[locale]/admin/moderation'>['searchParams'] }) {
  const params = await searchParams;
  const query = parseQueueParams(params);
  const data = await getModerationQueue(params);
  const item = typeof params.item === 'string' && /^[0-9a-f-]{36}$/i.test(params.item) ? params.item : null;
  return (
    <div className="flex flex-col gap-4">
      <QueueToolbar status={query.status} reason={query.reason ?? null} counts={data.counts} />
      <QueueView
        // Đổi bộ lọc / trang → dựng lại (bỏ chọn nhiều, bỏ trạng thái lạc quan của trang cũ).
        key={`${query.status}-${query.reason ?? ''}-${query.page}`}
        items={data.page.items}
        status={query.status}
        reason={query.reason ?? null}
        page={data.page.page}
        pageCount={data.page.pageCount}
        pageSize={data.page.pageSize}
        total={data.page.total}
        now={data.now}
        sites={data.sites}
        initialItemId={item}
      />
    </div>
  );
}

export default async function ModerationPage({ searchParams }: PageProps<'/[locale]/admin/moderation'>) {
  const t = await getTranslations('admin.moderation');
  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-6 lg:px-8">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<QueueSkeleton />}>
        <QueueContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
