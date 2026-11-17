// /viec-lam/tin-nhan — Chat của mini-app Việc Làm: hộp thư chỉ gồm hội thoại Tìm việc (cần đăng nhập — proxy.ts; noindex).
// Mở một hội thoại → khung chat trong mini-app /viec-lam/tin-nhan/[id] (quay lại về đây).
import type { Metadata } from 'next';
import { MiniAppChatPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('job', 'chat');
}

export default function Page() {
  return <MiniAppChatPage feature="job" />;
}
