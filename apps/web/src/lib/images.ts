// URL ảnh Storage cho web: bọc imageUrl / avatarUrl của @hp/core với Supabase URL + cờ Image Transformation từ env.
// Staging (gói Free) không có Image Transformation → NEXT_PUBLIC_IMAGE_TRANSFORM=false → ảnh gốc.
// Ảnh đã là bản thu nhỏ sẵn (thumb 400 / full 1280 / avatar 128) nên next/image dùng `unoptimized` (không qua /_next/image).
import { avatarUrl, imageUrl, type ImageSize } from '@hp/core';
import { publicEnv } from '@/lib/env';

/** Ảnh tin (bucket listing-images). */
export function listingImageUrl(path: string, size: ImageSize): string {
  return imageUrl(publicEnv.supabaseUrl, 'listing-images', path, size, publicEnv.imageTransform);
}

/** Ảnh đại diện (path trong bucket avatars hoặc URL Google). null → hiện chữ cái đầu / icon. */
export function profileAvatarUrl(value: string | null | undefined): string | null {
  return avatarUrl(publicEnv.supabaseUrl, value, publicEnv.imageTransform);
}

/** Ảnh banner trang chủ (bucket công khai `banners`, admin upload sẵn đúng tỉ lệ 16:7) — ảnh gốc, không transform. */
export function bannerImageUrl(path: string): string {
  const base = publicEnv.supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/banners/${path.split('/').map(encodeURIComponent).join('/')}`;
}
