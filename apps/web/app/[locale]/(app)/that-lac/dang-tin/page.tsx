// /that-lac/dang-tin — Đăng tin trong mini-app Đồ Thất Lạc: form dùng chung, chỉ danh mục Đồ thất lạc, đăng xong về Quản lý tin
// (cần đăng nhập — proxy.ts; noindex). ?category=<code> chọn sẵn danh mục.
import type { Metadata } from 'next';
import { MiniAppPostPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('lostFound', 'post');
}

export default function Page({ searchParams }: PageProps<'/[locale]/that-lac/dang-tin'>) {
  return <MiniAppPostPage feature="lostFound" searchParams={searchParams} />;
}
