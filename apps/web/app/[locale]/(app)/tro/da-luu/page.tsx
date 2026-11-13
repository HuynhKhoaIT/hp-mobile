// /tro/da-luu — Tin đã lưu của mini-app Nhà Trọ (cần đăng nhập — proxy.ts; noindex). Dữ liệu đọc ở trình duyệt.
import type { Metadata } from 'next';
import { MiniAppSavedPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('room', 'saved');
}

export default function Page() {
  return <MiniAppSavedPage feature="room" />;
}
