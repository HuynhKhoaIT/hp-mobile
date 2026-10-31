// /pass-do — Pass đồ: danh sách dùng chung features/listing (khác biệt ở features/*/config.ts).
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/pass-do'>): Promise<Metadata> {
  return listMetadata('pass', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/pass-do'>) {
  return <ListingListPage scope="pass" searchParams={searchParams} />;
}
