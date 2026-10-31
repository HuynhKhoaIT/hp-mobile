// Số điện thoại di động Việt Nam. Người dùng gõ kiểu quen thuộc (0912 345 678, +84 912…, 84912…);
// DB lưu `849xxxxxxxx` (không dấu +, profiles.phone), Supabase Auth nhận E.164 `+849xxxxxxxx`.
// Đầu số di động sau mã nước: 3, 5, 7, 8, 9 + 8 chữ số.

const MOBILE = /^[35789]\d{8}$/;

/** Trả `84xxxxxxxxx` hoặc null nếu không phải số di động VN hợp lệ. */
export function normalizeVnPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let national: string;
  if (digits.startsWith('+84')) national = digits.slice(3);
  else if (digits.startsWith('84') && digits.length === 11) national = digits.slice(2);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;
  return MOBILE.test(national) ? `84${national}` : null;
}

/** `84912345678` → `+84912345678` (định dạng Supabase Auth). */
export function toE164(normalized: string): string {
  return `+${normalized}`;
}

/** `84912345678` → `0912 345 678` để hiển thị cho chính chủ (không dùng trên trang công khai). */
export function formatVnPhone(normalized: string): string {
  const national = normalized.startsWith('84') ? `0${normalized.slice(2)}` : normalized;
  return national.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
}
