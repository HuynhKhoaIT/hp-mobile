// /viec-lam — Tìm việc: danh sách dùng chung features/listing (khác biệt ở features/*/config.ts).
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/viec-lam'>): Promise<Metadata> {
  return listMetadata('job', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/viec-lam'>) {
  return <ListingListPage scope="job" searchParams={searchParams} />;
}
