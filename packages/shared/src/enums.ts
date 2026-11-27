// Mã enum dùng chung app, web, Edge Functions. Khớp Postgres enum trong supabase/migrations (supabase/CLAUDE.md mục 4).
// DB lưu mã; giao diện dịch qua i18n `category.<code>`, `status.<code>` (ns common).
// Khi migration tạo enum Postgres, so lại với @hp/db `Enums<...>` — hai nơi phải trùng.

// Thứ tự = thứ tự enum Postgres. Danh mục Pass đồ mở rộng (migration 20261112090000) nằm ở cuối enum; thứ tự hiển thị
// trong Pass đồ lấy từ LISTING_FEATURES.pass.
export const LISTING_CATEGORIES = [
  'pass_electronics', 'pass_vehicle', 'pass_ppe', 'pass_home',
  'room_rent', 'room_share',
  'job_main', 'job_parttime',
  'lost', 'found',
  'pass_appliance', 'pass_fashion', 'pass_sport', 'pass_tools', 'pass_baby', 'pass_other',
  'room_house', 'room_apartment',
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

export const REPORT_TARGETS = ['listing', 'group', 'profile', 'message', 'service_request', 'service_quote'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

// Gọi thợ (mini-app `goiTho`, mẫu dữ liệu thứ ba — migration 20261128090000_service_requests). Khớp Postgres enum.
export const SERVICE_TRADES = ['electric_plumbing', 'cleaning', 'welding', 'hvac', 'other'] as const;
export type ServiceTrade = (typeof SERVICE_TRADES)[number];

export const SERVICE_REQUEST_STATUSES = ['open', 'assigned', 'completed', 'cancelled', 'expired'] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_QUOTE_STATUSES = ['submitted', 'accepted', 'declined', 'withdrawn'] as const;
export type ServiceQuoteStatus = (typeof SERVICE_QUOTE_STATUSES)[number];

export const SERVICE_URGENCIES = ['today', 'this_week', 'flexible'] as const;
export type ServiceUrgency = (typeof SERVICE_URGENCIES)[number];

/** Nhóm tính năng Listing → các category của nó (khớp features/<x>/config.ts ở app và web). Thứ tự = thứ tự hiển thị. */
export const LISTING_FEATURES = {
  pass: [
    'pass_electronics', 'pass_vehicle', 'pass_appliance', 'pass_home', 'pass_fashion',
    'pass_sport', 'pass_tools', 'pass_baby', 'pass_ppe', 'pass_other',
  ],
  room: ['room_rent', 'room_share', 'room_house', 'room_apartment'],
  job: ['job_main', 'job_parttime'],
  lostFound: ['lost', 'found'],
} as const satisfies Record<string, readonly ListingCategory[]>;
export type ListingFeature = keyof typeof LISTING_FEATURES;

/** 6 tính năng (Hub, onboarding "quan tâm", profiles.interests). Khớp i18n `common.feature.<code>` và CHECK trong DB. */
export const FEATURES = ['pass', 'room', 'job', 'lostFound', 'ride', 'sport'] as const;
export type Feature = (typeof FEATURES)[number];
