// /tro — Tìm trọ: danh sách dùng chung features/listing (khác biệt ở features/*/config.ts). config.miniApp → trang chủ
// mini-app "Nhà Trọ" (màu ngọc lục bảo, header + điều hướng riêng; trang con /bo-loc, /da-luu, /tin-nhan, /quan-ly, /dang-tin).
// Vẫn là trang danh sách SEO: metadata / canonical / H1 (tên mini-app + tiêu đề SEO sr-only; khi lọc = H1 kết quả) như /pass-do.
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/tro'>): Promise<Metadata> {
  return listMetadata('room', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/tro'>) {
  return <ListingListPage scope="room" searchParams={searchParams} />;
}
