// Ảnh upload: chọn từ thư viện (expo-image-picker) → nén cạnh dài 1280 px, WebP q0.8 (> 2 MB thì q0.6, q0.4)
// → ArrayBuffer cho uploadListingImage của @hp/core. Thử lại do hook useUploadListingImage (retry lũy thừa) +
// nút "Tải lại ảnh lỗi" ở form. Giống web (canvas → webp) để ảnh hai nơi cùng cỡ.
import { LISTING_IMAGES } from '@hp/shared';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; width: number; height: number };
export type PreparedImage = { body: ArrayBuffer; contentType: 'image/webp' };
/** `error` là mã i18n trong ns errors. */
export type PrepareResult = { data: PreparedImage } | { error: 'file_too_large' | 'file_type' };

/** Giải mã tối đa 2× cạnh đích để không nạp nguyên ảnh 48 MP vào bộ nhớ máy tầm trung. */
const DECODE_MAX = LISTING_IMAGES.longEdgePx * 2;

/** Chọn tối đa `limit` ảnh (nhiều ảnh một lần, giữ thứ tự chọn). Huỷ → mảng rỗng. */
export async function pickImages(limit: number): Promise<PickedImage[]> {
  if (limit <= 0) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
  });
  if (res.canceled) return [];
  return res.assets.slice(0, limit).map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

/** Nén một ảnh tin: cạnh dài ≤ 1280 px, WebP ≤ 2 MB. */
export async function prepareListingImage(image: PickedImage): Promise<PrepareResult> {
  const long = LISTING_IMAGES.longEdgePx;
  try {
    const source = ImageManipulator.manipulate(image.uri, { maxWidth: DECODE_MAX, maxHeight: DECODE_MAX });
    const ctx =
      Math.max(image.width, image.height) > long
        ? source.resize(image.width >= image.height ? { width: long } : { height: long })
        : source;
    const ref = await ctx.renderAsync();
    for (const compress of [LISTING_IMAGES.quality, 0.6, 0.4]) {
      const out = await ref.saveAsync({ format: SaveFormat.WEBP, compress, base64: true });
      if (!out.base64) break;
      const body = base64ToArrayBuffer(out.base64);
      if (body.byteLength <= LISTING_IMAGES.maxBytes) return { data: { body, contentType: 'image/webp' } };
    }
    return { error: 'file_too_large' };
  } catch {
    return { error: 'file_type' };
  }
}

/** Base64 → ArrayBuffer bằng atob có sẵn trong Hermes (không cần expo-file-system). */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
