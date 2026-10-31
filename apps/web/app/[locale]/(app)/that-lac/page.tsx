// /that-lac — Đồ thất lạc: danh sách dùng chung features/listing (khác biệt ở features/*/config.ts).
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/that-lac'>): Promise<Metadata> {
  return listMetadata('lostFound', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/that-lac'>) {
  return <ListingListPage scope="lostFound" searchParams={searchParams} />;
}
