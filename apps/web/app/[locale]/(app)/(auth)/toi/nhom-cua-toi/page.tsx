// /toi/nhom-cua-toi — Nhóm của tôi: tab Sắp tới / Đã qua (?tab=, link chạy cả khi tắt JS), badge vai trò, nút đánh giá
// chủ nhóm cho nhóm đã diễn ra. Đọc theo request (cookie phiên + ?tab) → trong <Suspense>; fallback giữ khung tab +
// skeleton đúng hình thẻ nhóm. Khu (auth): proxy.ts chặn khách (→ /dang-nhap?next=…), noindex.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { MyGroupsSkeleton, MyGroupsTabs, MyGroupsView } from '@/features/group/components/my-groups-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('group.mine');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page({ searchParams }: PageProps<'/[locale]/toi/nhom-cua-toi'>) {
  const t = await getTranslations('group.mine');
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-fg">{t('title')}</h1>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <MyGroupsTabs current={null} />
            <MyGroupsSkeleton />
          </div>
        }
      >
        <MyGroupsView searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
