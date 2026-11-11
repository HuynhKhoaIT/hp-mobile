// /pass-do/tin-nhan — Chat của mini-app Chợ Pass Đồ: hộp thư chỉ gồm hội thoại Pass đồ (cần đăng nhập — proxy.ts; noindex).
// Mở một hội thoại → khung chat chung /tin-nhan/[id].
import type { Metadata } from 'next';
import { MiniAppChatPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('pass', 'chat');
}

export default function Page() {
  return <MiniAppChatPage feature="pass" />;
}
