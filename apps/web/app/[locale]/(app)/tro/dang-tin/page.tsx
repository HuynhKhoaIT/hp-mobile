// /tro/dang-tin — Đăng tin trong mini-app Nhà Trọ: form dùng chung, chỉ danh mục Tìm trọ, đăng xong về Quản lý tin
// (cần đăng nhập — proxy.ts; noindex). ?category=<code> chọn sẵn danh mục.
import type { Metadata } from 'next';
import { MiniAppPostPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('room', 'post');
}

export default function Page({ searchParams }: PageProps<'/[locale]/tro/dang-tin'>) {
  return <MiniAppPostPage feature="room" searchParams={searchParams} />;
}
