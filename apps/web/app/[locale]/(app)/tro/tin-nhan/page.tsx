// /tro/tin-nhan — Chat của mini-app Nhà Trọ: hộp thư chỉ gồm hội thoại Tìm trọ (cần đăng nhập — proxy.ts; noindex).
// Mở một hội thoại → khung chat trong mini-app /tro/tin-nhan/[id] (quay lại về đây).
import type { Metadata } from 'next';
import { MiniAppChatPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('room', 'chat');
}

export default function Page() {
  return <MiniAppChatPage feature="room" />;
}
