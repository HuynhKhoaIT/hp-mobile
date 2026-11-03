// /nhom/[slug] — chi tiết nhóm ghép (ghép xe / ghép trận). slug = {tieu-de-khong-dau}-{short_id}; RPC so short_id cuối slug.
// - Slug trên URL khác slug chuẩn (tiêu đề đổi / link cũ) → permanentRedirect (308) tới slug chuẩn (giống /tin/[slug]).
// - Không có / đã xoá / chủ nhóm bị khoá → notFound() (404, not-found.tsx).
// - Đủ người / đã tới giờ / đã xong / đã huỷ → 200 + banner trạng thái (GroupDetail).
// Đọc `params` NGOÀI Suspense để redirect / 404 xảy ra trước khi stream → đúng mã HTTP (với slug đã prerender / đã vào cache).
// Dữ liệu cache 300s + tag group:{id} (features/group/queries.ts); nhóm sắp diễn ra prerender lúc build.
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { GroupDetail } from '@/features/group/components/group-detail';
import { groupMetadata } from '@/features/group/metadata';
import { getGroupPage, getGroupPrerenderSlugs } from '@/features/group/queries';
import { permanentRedirect } from '@/i18n/navigation';

export async function generateStaticParams() {
  return (await getGroupPrerenderSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/nhom/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { group } = await getGroupPage(slug);
  if (!group) {
    const t = await getTranslations('group.detail');
    return { title: t('not_found_title'), robots: { index: false, follow: true } };
  }
  return groupMetadata(group);
}

export default async function GroupPage({ params }: PageProps<'/[locale]/nhom/[slug]'>) {
  const { slug } = await params;
  const { group, now } = await getGroupPage(slug);
  if (!group?.slug) notFound();
  const locale = await getLocale();
  if (group.slug !== slug) permanentRedirect({ href: `/nhom/${group.slug}`, locale });
  return <GroupDetail group={group} now={now} />;
}
