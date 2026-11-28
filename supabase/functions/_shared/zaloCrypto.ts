// Gửi Zalo tự động (zalo-connect / zalo-send): mã hoá thông tin phiên Zalo của staff trước khi lưu vào zalo_accounts.credentials_enc,
// và phân loại lỗi từ zca-js. Không import gì (chạy được cả Deno lẫn Node để test): dùng Web Crypto (AES-GCM 256).
// Khoá = secret ZALO_SESSION_KEY (64 ký tự hex). Mất khoá = mọi staff phải quét QR lại. Không log khoá / phiên.

const HEX_KEY = /^[0-9a-f]{64}$/i;

export const isValidKey = (hex: string): boolean => HEX_KEY.test(hex);

const toBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromBase64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function importKey(hex: string): Promise<CryptoKey> {
  if (!isValidKey(hex)) throw new Error('zalo_key_invalid');
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** JSON → base64(iv[12] ‖ ciphertext+tag). Mỗi lần mã hoá dùng iv ngẫu nhiên mới. */
export async function encryptJson(value: unknown, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value))));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  return toBase64(out);
}

/** Ngược lại của encryptJson; sai khoá / dữ liệu bị sửa → ném lỗi (AES-GCM kiểm toàn vẹn). */
export async function decryptJson<T>(blob: string, keyHex: string): Promise<T> {
  const key = await importKey(keyHex);
  const bytes = fromBase64(blob);
  if (bytes.length < 13) throw new Error('zalo_blob_invalid');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export type ZaloFailure = 'zalo_session_expired' | 'zalo_send_failed';

/** Lỗi đăng nhập / phiên hết hạn (cần quét QR lại) khác lỗi gửi thông thường. */
export function zaloFailureCode(message: string): ZaloFailure {
  return /login|cookie|session|unauthor|forbidden|expired|đăng nhập|401|403/i.test(message) ? 'zalo_session_expired' : 'zalo_send_failed';
}
