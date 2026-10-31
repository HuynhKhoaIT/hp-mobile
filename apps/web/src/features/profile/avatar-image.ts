// Chuẩn bị ảnh đại diện trong trình duyệt trước khi upload (không thư viện ngoài): cắt vuông giữa ảnh, thu về 512×512,
// mã hoá WebP (trình duyệt không hỗ trợ WebP → JPEG), giảm chất lượng tới khi ≤ 1 MB (giới hạn bucket avatars).
// Chỉ chạy ở client (canvas, createImageBitmap). Mã lỗi là key errors.*.
export const AVATAR_SIZE = 512;
export const AVATAR_MAX_BYTES = 1024 * 1024;
const QUALITIES = [0.85, 0.7, 0.55] as const;

export type PreparedAvatar = { blob: Blob; contentType: 'image/webp' | 'image/jpeg' };
export type AvatarError = 'file_type' | 'file_too_large' | 'upload_failed';

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareAvatar(file: File): Promise<{ data: PreparedAvatar; error: null } | { data: null; error: AvatarError }> {
  if (!file.type.startsWith('image/')) return { data: null, error: 'file_type' };

  let bitmap: ImageBitmap;
  try {
    // Trình duyệt hiện đại tự xoay theo EXIF (imageOrientation mặc định from-image).
    bitmap = await createImageBitmap(file);
  } catch {
    // Định dạng trình duyệt không đọc được (vd HEIC ngoài Safari).
    return { data: null, error: 'file_type' };
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { data: null, error: 'upload_failed' };
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  for (const quality of QUALITIES) {
    const webp = await encode(canvas, 'image/webp', quality);
    // Safari cũ trả PNG khi không mã hoá được WebP → dùng JPEG.
    const blob = webp?.type === 'image/webp' ? webp : await encode(canvas, 'image/jpeg', quality);
    if (!blob) return { data: null, error: 'upload_failed' };
    if (blob.size <= AVATAR_MAX_BYTES) {
      return { data: { blob, contentType: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg' }, error: null };
    }
  }
  return { data: null, error: 'file_too_large' };
}
