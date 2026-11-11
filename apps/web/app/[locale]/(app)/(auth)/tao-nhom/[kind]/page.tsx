// /tao-nhom/[kind] — tạo nhóm ghép xe (ride) / ghép trận (sport). Khu đăng nhập: proxy.ts chuyển khách sang
// /dang-nhap?next=/tao-nhom/<kind>. kind lạ → 404. Form đọc hồ sơ theo request (cookie) → nội dung trong <Suspense>.
import { GROUP_KINDS } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CreateGroupView, GroupFormSkeleton } from '@/features/group/components/create-group-view';
import { isGroupKind } from '@/features/group/features';

export function generateStaticParams() {
  return GROUP_KINDS.map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/tao-nhom/[kind]'>): Promise<Metadata> {
  const { kind } = await params;
  const t = await getTranslations('group.form');
  return { title: isGroupKind(kind) ? t(`title_${kind}`) : undefined, robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps<'/[locale]/tao-nhom/[kind]'>) {
  const { kind } = await params;
  if (!isGroupKind(kind)) notFound();
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<GroupFormSkeleton kind={kind} />}>
        <CreateGroupView kind={kind} />
      </Suspense>
    </section>
  );
}
