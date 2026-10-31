// URL chia sẻ (luôn là URL web) và URL ảnh Storage. Không đọc env: base truyền vào từ app / web.

export function shareUrl(v: { type: 'listing' | 'group'; slug: string }, siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}/${v.type === 'listing' ? 'tin' : 'nhom'}/${encodeURIComponent(v.slug)}`;
}

export type ImageSize = 'thumb' | 'full' | 'avatar' | 'original';

const TRANSFORM: Record<Exclude<ImageSize, 'original'>, string> = {
  thumb: 'width=400&quality=75',
  full: 'width=1280',
  avatar: 'width=128&height=128&resize=cover&quality=75',
};

/**
 * Ảnh trong bucket public. `transform = false` khi project không có Image Transformation (gói Free — staging):
 * trả ảnh gốc thay vì gọi endpoint render.
 */
export function imageUrl(
  supabaseUrl: string,
  bucket: 'listing-images' | 'avatars',
  path: string,
  size: ImageSize = 'thumb',
  transform = true,
): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const p = path.split('/').map(encodeURIComponent).join('/');
  if (size === 'original' || !transform) return `${base}/storage/v1/object/public/${bucket}/${p}`;
  return `${base}/storage/v1/render/image/public/${bucket}/${p}?${TRANSFORM[size]}`;
}

/** Đường dẫn web cố định của 4 tính năng Listing (.claude/rules/web-routing-rsc.md — không đổi khi chưa hỏi). */
export const LISTING_FEATURE_PATHS = {
  pass: '/pass-do',
  room: '/tro',
  job: '/viec-lam',
  lostFound: '/that-lac',
} as const;
export type ListingFeaturePath = (typeof LISTING_FEATURE_PATHS)[keyof typeof LISTING_FEATURE_PATHS];

/**
 * URL ảnh đại diện: profiles.avatar_url là path trong bucket avatars (upload trong app / web)
 * hoặc URL đầy đủ (ảnh Google). null → client hiện chữ cái đầu.
 */
export function avatarUrl(supabaseUrl: string, value: string | null | undefined, transform = true): string | null {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return imageUrl(supabaseUrl, 'avatars', value, 'avatar', transform);
}
