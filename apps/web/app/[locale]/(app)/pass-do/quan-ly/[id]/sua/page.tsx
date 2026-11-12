// /pass-do/quan-ly/[id]/sua — Sửa tin trong mini-app Chợ Pass Đồ: cùng form "Đăng nhanh" (chế độ sửa, RLS: chỉ chủ tin), huỷ /
// xong về "Quản lý tin" của mini-app (không rời mini-app). Cần đăng nhập (proxy.ts — tiền tố /pass-do/quan-ly); noindex.
// Trang sửa chung /toi/tin-cua-toi/[id]/sua giữ nguyên.
import type { Metadata } from 'next';
import { MiniAppEditPage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppPrivateMetadata } from '@/features/listing/metadata';

// Cache Components cần ít nhất một giá trị tham số để dựng khung tĩnh (giống /toi/tin-cua-toi/[id]/sua). id giữ chỗ: chỉ
// khung được prerender; nội dung luôn đọc theo request trong <Suspense> (cookie phiên).
export function generateStaticParams() {
  return [{ id: '00000000-0000-0000-0000-000000000000' }];
}

export function generateMetadata(): Promise<Metadata> {
  return miniAppPrivateMetadata('pass', 'edit');
}

export default function Page({ params }: PageProps<'/[locale]/pass-do/quan-ly/[id]/sua'>) {
  return <MiniAppEditPage feature="pass" params={params} />;
}
