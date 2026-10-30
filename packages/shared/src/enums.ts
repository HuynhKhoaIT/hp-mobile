// Mã enum dùng chung app, web, Edge Functions. Khớp Postgres enum trong supabase/migrations (supabase/CLAUDE.md mục 4).
// DB lưu mã; giao diện dịch qua i18n `category.<code>`, `status.<code>` (ns common).
// Khi migration tạo enum Postgres, so lại với @hp/db `Enums<...>` — hai nơi phải trùng.

export const LISTING_CATEGORIES = [
  'pass_electronics', 'pass_vehicle', 'pass_ppe', 'pass_home',
  'room_rent', 'room_share',
  'job_main', 'job_parttime',
  'lost', 'found',
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const LISTING_STATUSES = ['draft', 'pending_review', 'active', 'sold', 'closed', 'expired', 'rejected'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const PRICE_TYPES = ['fixed', 'negotiable', 'free'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const GROUP_KINDS = ['ride', 'sport'] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

export const GROUP_SUB_KINDS = {
  ride: ['car_owner', 'bus_pool', 'motorbike'],
  sport: ['football', 'badminton', 'pickleball'],
} as const satisfies Record<GroupKind, readonly string[]>;
export type GroupSubKind<K extends GroupKind = GroupKind> = (typeof GROUP_SUB_KINDS)[K][number];

export const GROUP_STATUSES = ['open', 'full', 'in_progress', 'completed', 'cancelled'] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const MEMBER_STATUSES = ['requested', 'accepted', 'declined', 'left', 'kicked'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const BADGES = ['phone', 'worker', 'landlord', 'venue', 'employer'] as const;
export type Badge = (typeof BADGES)[number];

export const ROLES = ['user', 'moderator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const REPORT_REASONS = ['scam', 'spam', 'inappropriate', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGETS = ['listing', 'group', 'profile', 'message'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

/** Nhóm tính năng Listing → các category của nó (khớp features/<x>/config.ts ở app và web). */
export const LISTING_FEATURES = {
  pass: ['pass_electronics', 'pass_vehicle', 'pass_ppe', 'pass_home'],
  room: ['room_rent', 'room_share'],
  job: ['job_main', 'job_parttime'],
  lostFound: ['lost', 'found'],
} as const satisfies Record<string, readonly ListingCategory[]>;
export type ListingFeature = keyof typeof LISTING_FEATURES;
