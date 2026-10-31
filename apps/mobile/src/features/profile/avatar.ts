// Chọn ảnh đại diện từ thư viện → cắt vuông (trình chọn ảnh của hệ điều hành) → 512 × 512 WebP → ArrayBuffer cho
// uploadAvatar (@hp/core). Giống web (apps/web/src/features/profile/avatar-image.ts): ≤ 1 MB, bucket avatars.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const SIZE = 512;
const MAX_BYTES = 1024 * 1024;

export type PreparedAvatar = { body: ArrayBuffer; contentType: 'image/webp' };

/** null khi người dùng huỷ; `{ error }` là mã i18n trong ns errors. */
export async function pickAvatar(): Promise<{ data: PreparedAvatar } | { error: string } | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets[0]) return null;

  try {
    const ref = await ImageManipulator.manipulate(picked.assets[0].uri).resize({ width: SIZE, height: SIZE }).renderAsync();
    for (const compress of [0.8, 0.6, 0.4]) {
      const out = await ref.saveAsync({ format: SaveFormat.WEBP, compress, base64: true });
      if (!out.base64) break;
      const body = base64ToArrayBuffer(out.base64);
      if (body.byteLength <= MAX_BYTES) return { data: { body, contentType: 'image/webp' } };
    }
    return { error: 'file_too_large' };
  } catch {
    return { error: 'file_type' };
  }
}

/** Base64 → ArrayBuffer bằng atob có sẵn trong Hermes (không cần expo-file-system). */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
