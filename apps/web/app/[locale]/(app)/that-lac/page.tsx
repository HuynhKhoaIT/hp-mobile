// /that-lac — Đồ thất lạc: danh sách dùng chung features/listing (khác biệt ở features/*/config.ts). config.miniApp → trang chủ
// mini-app "Đồ Thất Lạc" (màu hổ phách, header + điều hướng riêng; trang con /bo-loc, /da-luu, /tin-nhan, /quan-ly, /dang-tin).
// Vẫn là trang danh sách SEO: metadata / canonical / H1 như /pass-do, /tro và /viec-lam.
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/that-lac'>): Promise<Metadata> {
  return listMetadata('lostFound', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/that-lac'>) {
  return <ListingListPage scope="lostFound" searchParams={searchParams} />;
}
