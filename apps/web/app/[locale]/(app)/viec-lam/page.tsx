// /viec-lam — Tìm việc: danh sách dùng chung features/listing (khác biệt ở features/*/config.ts). config.miniApp → trang chủ
// mini-app "Việc Làm" (màu chàm, header + điều hướng riêng; trang con /bo-loc, /da-luu, /tin-nhan, /quan-ly, /dang-tin).
// Vẫn là trang danh sách SEO: metadata / canonical / H1 như /pass-do và /tro.
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/viec-lam'>): Promise<Metadata> {
  return listMetadata('job', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/viec-lam'>) {
  return <ListingListPage scope="job" searchParams={searchParams} />;
}
