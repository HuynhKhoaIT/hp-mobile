// /tin — Khám phá: tất cả tin (4 tính năng Listing), chip dẫn sang trang từng tính năng. Dùng chung features/listing.
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/tin'>): Promise<Metadata> {
  return listMetadata('all', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/tin'>) {
  return <ListingListPage scope="all" searchParams={searchParams} />;
}
