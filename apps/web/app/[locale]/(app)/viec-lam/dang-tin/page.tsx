// /viec-lam/dang-tin — Đăng tin trong mini-app Việc Làm: form dùng chung, chỉ danh mục Tìm việc, đăng xong về Quản lý tin
// (cần đăng nhập — proxy.ts; noindex). ?category=<code> chọn sẵn danh mục.
import type { Metadata } from 'next';
import { MiniAppPostPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('job', 'post');
}

export default function Page({ searchParams }: PageProps<'/[locale]/viec-lam/dang-tin'>) {
  return <MiniAppPostPage feature="job" searchParams={searchParams} />;
}
