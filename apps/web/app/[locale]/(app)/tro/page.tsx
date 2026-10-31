// /tro — Tìm trọ: danh sách dùng chung features/listing (khác biệt ở features/*/config.ts).
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/tro'>): Promise<Metadata> {
  return listMetadata('room', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/tro'>) {
  return <ListingListPage scope="room" searchParams={searchParams} />;
}
