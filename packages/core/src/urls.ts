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
