// /goi-tho/yeu-cau/[id] — chi tiết một yêu cầu gọi thợ (thông báo quote_* / request_*, link chia sẻ, thẻ yêu cầu). Dữ liệu theo
// người xem (RLS) đọc ở trình duyệt; noindex. Cache Components cần ít nhất một giá trị tham số để dựng khung tĩnh: id giữ chỗ chỉ
// prerender khung; id thật đọc trong <Suspense>.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClientOnly } from '@/components/shared/client-only';
import { RequestDetailSkeleton, RequestDetailView } from '@/features/goi-tho/components/request-detail';
import { goiThoMetadata } from '@/features/goi-tho/metadata';

export function generateStaticParams() {
  return [{ id: '00000000-0000-0000-0000-000000000000' }];
}

export function generateMetadata(): Promise<Metadata> {
  return goiThoMetadata('request');
}

async function RequestFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ClientOnly fallback={<RequestDetailSkeleton />}>
      <RequestDetailView key={id} id={id} />
    </ClientOnly>
  );
}

export default function Page({ params }: PageProps<'/[locale]/goi-tho/yeu-cau/[id]'>) {
  return (
    <Suspense fallback={<RequestDetailSkeleton />}>
      <RequestFromParams params={params} />
    </Suspense>
  );
}
