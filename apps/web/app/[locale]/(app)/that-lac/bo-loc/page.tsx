// /that-lac/bo-loc — Bộ lọc & tìm kiếm của mini-app Đồ Thất Lạc (công khai, form GET → /that-lac?…, chạy khi tắt JS).
// Trang tiện ích: noindex, canonical không tham số. Khác biệt theo tính năng ở features/lost-found/config.ts (miniApp).
import type { Metadata } from 'next';
import { MiniAppFilterPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('lostFound', 'filter');
}

export default function Page({ searchParams }: PageProps<'/[locale]/that-lac/bo-loc'>) {
  return <MiniAppFilterPage feature="lostFound" searchParams={searchParams} />;
}
