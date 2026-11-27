// /that-lac/tin-nhan — Chat của mini-app Đồ Thất Lạc: hộp thư chỉ gồm hội thoại Đồ thất lạc (cần đăng nhập — proxy.ts; noindex).
// Mở một hội thoại → khung chat trong mini-app /that-lac/tin-nhan/[id] (quay lại về đây).
import type { Metadata } from 'next';
import { MiniAppChatPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('lostFound', 'chat');
}

export default function Page() {
  return <MiniAppChatPage feature="lostFound" />;
}
