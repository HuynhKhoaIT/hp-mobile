// /pass-do/dang-tin — Đăng tin trong mini-app Chợ Pass Đồ: form dùng chung, chỉ danh mục Pass đồ, đăng xong về Quản lý tin
// (cần đăng nhập — proxy.ts; noindex). ?category=<code> chọn sẵn danh mục.
import type { Metadata } from 'next';
import { MiniAppPostPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('pass', 'post');
}

export default function Page({ searchParams }: PageProps<'/[locale]/pass-do/dang-tin'>) {
  return <MiniAppPostPage feature="pass" searchParams={searchParams} />;
}
