// URL ảnh Storage cho app: gắn Supabase URL + cờ Image Transformation (EXPO_PUBLIC_IMAGE_TRANSFORM) vào hàm của @hp/core.
// Màn hình / component chỉ gọi các hàm này, không tự ghép URL Storage.
import { avatarUrl, type ImageSize, imageUrl } from '@hp/core';
import { env } from '@/core/env';

/** Ảnh tin đăng: 'thumb' cho card (width 400), 'full' cho chi tiết (width 1280). */
export const listingImageUrl = (path: string, size: ImageSize = 'thumb') =>
  imageUrl(env.supabaseUrl, 'listing-images', path, size, env.imageTransform);

/** Ảnh đại diện: path trong bucket avatars hoặc URL đầy đủ (Google); null → Avatar hiện chữ cái đầu. */
export const profileAvatarUrl = (value: string | null | undefined) => avatarUrl(env.supabaseUrl, value, env.imageTransform);

/** Ảnh banner Hub (bucket public `banners`, ảnh đã cắt sẵn 16:7 → tải bản gốc, không resize). */
export const bannerImageUrl = (path: string) =>
  `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/banners/${path.split('/').map(encodeURIComponent).join('/')}`;
