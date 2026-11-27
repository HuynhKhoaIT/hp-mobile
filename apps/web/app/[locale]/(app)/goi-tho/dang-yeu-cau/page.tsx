// /goi-tho/dang-yeu-cau — đăng yêu cầu gọi thợ (`?trade=` chọn sẵn loại thợ) hoặc sửa yêu cầu (`?id=`, chủ, chưa có báo giá). Cần
// đăng nhập (proxy.ts chuyển khách sang /dang-nhap?next=…); noindex. Đọc searchParams trong <Suspense>; form + upload ảnh ở trình duyệt.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClientOnly } from '@/components/shared/client-only';
import { Skeleton } from '@/components/ui/skeleton';
import { RequestForm } from '@/features/goi-tho/components/request-form';
import { goiThoMetadata } from '@/features/goi-tho/metadata';
import { isServiceTrade } from '@/features/goi-tho/trades';

export function generateMetadata(): Promise<Metadata> {
  return goiThoMetadata('form');
}

function FormSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}

async function FormFromParams({ searchParams }: { searchParams: PageProps<'/[locale]/goi-tho/dang-yeu-cau'>['searchParams'] }) {
  const params = await searchParams;
  const id = typeof params.id === 'string' ? params.id : undefined;
  const trade = typeof params.trade === 'string' && isServiceTrade(params.trade) ? params.trade : undefined;
  return (
    <ClientOnly fallback={<FormSkeleton />}>
      <RequestForm key={id ?? trade ?? 'new'} requestId={id} trade={trade} />
    </ClientOnly>
  );
}

export default function Page({ searchParams }: PageProps<'/[locale]/goi-tho/dang-yeu-cau'>) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <FormFromParams searchParams={searchParams} />
    </Suspense>
  );
}
