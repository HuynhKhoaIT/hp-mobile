// /tro/quan-ly — Quản lý tin đăng của mini-app Nhà Trọ (?tab=active|sold|pending|hidden; cần đăng nhập — proxy.ts;
// noindex). Thao tác dùng chung Server Action của "Tin của tôi".
import type { Metadata } from 'next';
import { MiniAppManagePage } from '@/features/listing/components/mini-app/mini-app-pages';
import { miniAppMetadata } from '@/features/listing/metadata';

export function generateMetadata(): Promise<Metadata> {
  return miniAppMetadata('room', 'manage');
}

export default function Page({ searchParams }: PageProps<'/[locale]/tro/quan-ly'>) {
  return <MiniAppManagePage feature="room" searchParams={searchParams} />;
}
