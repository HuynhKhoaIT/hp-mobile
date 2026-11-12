// /tro/bo-loc — Bộ lọc & tìm kiếm của mini-app Nhà Trọ (công khai, form GET → /tro?…, chạy khi tắt JS).
// Trang tiện ích: noindex, canonical không tham số. Khác biệt theo tính năng ở features/room/config.ts (miniApp).
import type { Metadata } from 'next';
import { MiniAppFilterPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('room', 'filter');
}

export default function Page({ searchParams }: PageProps<'/[locale]/tro/bo-loc'>) {
  return <MiniAppFilterPage feature="room" searchParams={searchParams} />;
}
