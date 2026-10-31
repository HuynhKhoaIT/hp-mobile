// /tim-kiem — tìm kiếm mọi tin (ô tìm ở header gửi ?q= tới đây). Dùng chung engine danh sách (features/listing,
// scope 'search' = mọi category); có từ khoá → đọc theo request + ghi log_search; trang kết quả noindex.
import type { Metadata } from 'next';
import { ListingListPage } from '@/features/listing/components/listing-list-page';
import { listMetadata } from '@/features/listing/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/tim-kiem'>): Promise<Metadata> {
  return listMetadata('search', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/tim-kiem'>) {
  return <ListingListPage scope="search" searchParams={searchParams} />;
}
