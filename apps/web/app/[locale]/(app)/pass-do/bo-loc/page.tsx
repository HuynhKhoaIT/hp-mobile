// /pass-do/bo-loc — Bộ lọc & tìm kiếm của mini-app Chợ Pass Đồ (công khai, form GET → /pass-do?…, chạy khi tắt JS).
// Trang tiện ích: noindex, canonical không tham số. Khác biệt theo tính năng ở features/pass/config.ts (miniApp).
import type { Metadata } from 'next';
import { MiniAppFilterPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('pass', 'filter');
}

export default function Page({ searchParams }: PageProps<'/[locale]/pass-do/bo-loc'>) {
  return <MiniAppFilterPage feature="pass" searchParams={searchParams} />;
}
