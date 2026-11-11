'use client';

// Trang kết quả có từ khoá (/pass-do?q=…) → ghi vào "Tìm gần đây" của mini-app (localStorage, chỉ trình duyệt này). Không
// hiển thị gì.
import type { ListingFeature } from '@hp/shared';
import { useEffect } from 'react';
import { rememberSearch } from '../../recent-searches';

export function RememberSearch({ feature, query }: { feature: ListingFeature; query: string }) {
  useEffect(() => {
    rememberSearch(feature, query);
  }, [feature, query]);
  return null;
}
