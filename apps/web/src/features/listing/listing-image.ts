// Chuẩn bị ảnh tin trong trình duyệt trước khi upload (không thư viện ngoài, cùng cách với profile/avatar-image.ts):
// thu cạnh dài về 1280 px (LISTING_IMAGES.longEdgePx, không phóng to ảnh nhỏ), mã hoá WebP 0.8 (trình duyệt không hỗ trợ
// WebP → JPEG), giảm chất lượng tới khi ≤ 2 MB (giới hạn bucket listing-images). Chỉ chạy ở client. Mã lỗi là key errors.*.
import { LISTING_IMAGES } from '@hp/shared';

const QUALITIES = [LISTING_IMAGES.quality, 0.7, 0.6, 0.5] as const;

export type PreparedImage = { blob: Blob; contentType: 'image/webp' | 'image/jpeg' };
export type ImageError = 'file_type' | 'file_too_large' | 'upload_failed';

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareListingImage(
  file: File,
): Promise<{ data: PreparedImage; error: null } | { data: null; error: ImageError }> {
  if (!file.type.startsWith('image/')) return { data: null, error: 'file_type' };

  let bitmap: ImageBitmap;
  try {
    // Trình duyệt hiện đại tự xoay theo EXIF (imageOrientation mặc định from-image).
    bitmap = await createImageBitmap(file);
  } catch {
    // Định dạng trình duyệt không đọc được (vd HEIC ngoài Safari).
    return { data: null, error: 'file_type' };
  }

  const scale = Math.min(1, LISTING_IMAGES.longEdgePx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { data: null, error: 'upload_failed' };
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of QUALITIES) {
    const webp = await encode(canvas, 'image/webp', quality);
    // Safari cũ trả PNG khi không mã hoá được WebP → dùng JPEG.
    const blob = webp?.type === 'image/webp' ? webp : await encode(canvas, 'image/jpeg', quality);
    if (!blob) return { data: null, error: 'upload_failed' };
    if (blob.size <= LISTING_IMAGES.maxBytes) {
      return { data: { blob, contentType: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg' }, error: null };
    }
  }
  return { data: null, error: 'file_too_large' };
}
