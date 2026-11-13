// /tro/tin-nhan/[conversationId] — khung chat một hội thoại trong mini-app Nhà Trọ (cùng ChatThread của /tin-nhan/[id]),
// quay lại → hộp thư của mini-app (/tro/tin-nhan). Dữ liệu đọc ở trình duyệt (RLS: chỉ thành viên); cần đăng nhập
// (proxy.ts — tiền tố /tro/tin-nhan); noindex.
import type { Metadata } from 'next';
import { MiniAppThreadPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppPrivateMetadata } from '@/features/listing/metadata';

// Cache Components cần ít nhất một giá trị tham số để dựng khung tĩnh (giống /tin-nhan/[conversationId]). id giữ chỗ: chỉ
// khung được prerender; id thật đọc trong <Suspense>.
export function generateStaticParams() {
  return [{ conversationId: '00000000-0000-0000-0000-000000000000' }];
}

export function generateMetadata(): Promise<Metadata> {
  return miniAppPrivateMetadata('room', 'thread');
}

export default function Page({ params }: PageProps<'/[locale]/tro/tin-nhan/[conversationId]'>) {
  return <MiniAppThreadPage feature="room" params={params} />;
}
