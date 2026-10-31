// Kiểu dùng chung giữa phần server (queries.ts) và client (components) của trang chủ.
import type { PublicListing } from '@hp/core';

/** Một dải tin + thời điểm đọc (thời gian tương đối trên thẻ — xem ListingCardProps.now). */
export type RailData = { items: PublicListing[]; now: number };
