// /viec-lam/bo-loc — Bộ lọc & tìm kiếm của mini-app Việc Làm (công khai, form GET → /viec-lam?…, chạy khi tắt JS).
// Trang tiện ích: noindex, canonical không tham số. Khác biệt theo tính năng ở features/job/config.ts (miniApp).
import type { Metadata } from 'next';
import { MiniAppFilterPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('job', 'filter');
}

export default function Page({ searchParams }: PageProps<'/[locale]/viec-lam/bo-loc'>) {
  return <MiniAppFilterPage feature="job" searchParams={searchParams} />;
}
