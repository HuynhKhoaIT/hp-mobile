'use client';

// Lỗi đọc hồ sơ công khai (mạng, DB): khối lỗi + thử lại, giữ header / footer. queries.ts ném lỗi thay vì cache kết quả lỗi.
export { ListingErrorBoundary as default } from '@/features/listing/components/list-error';
