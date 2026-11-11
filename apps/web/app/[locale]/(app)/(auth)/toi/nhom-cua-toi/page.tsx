// /toi/nhom-cua-toi — Nhóm của tôi (style Stitch "Nhóm của tôi (MyGroups)"): header xanh (H1 + dòng phụ + nút "Tạo nhóm"),
// hàng chip tab Sắp tới / Đã qua (?tab=, link chạy cả khi tắt JS), mẹo an toàn + tiêu đề vạch cam, thẻ nhóm có badge vai
// trò, nút đánh giá chủ nhóm cho nhóm đã diễn ra. Header tĩnh nằm ngoài <Suspense>; phần đọc theo request (cookie phiên +
// ?tab) trong <Suspense>, fallback giữ hàng chip + skeleton đúng hình thẻ nhóm. Khu (auth): proxy.ts chặn khách
// (→ /dang-nhap?next=…), noindex. Khác Stitch: xem đầu my-groups-view.tsx.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { MyGroupsHero, MyGroupsSkeleton, MyGroupsTabs, MyGroupsView } from '@/features/group/components/my-groups-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('group.mine');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default function Page({ searchParams }: PageProps<'/[locale]/toi/nhom-cua-toi'>) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6">
      <MyGroupsHero />
      <div className="px-4 sm:px-0">
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
      </div>
    </section>
  );
}
